import * as fsSync from 'fs';
import * as fspath from 'path';
import { promises as fs } from 'fs';
import { snapshotBoardFiles, copyDirRecursive } from './versions';
import { BoardsDir } from "../../extensions/boards/system/boards";
import { API } from 'protobase'
import { getRoot, requirePermission, getServiceToken } from 'protonode'

const VersionsBaseDir = (root: string) => fspath.join(root, 'data', 'versions');

export const getCurrentVersionFromFS = (root: string, boardId: string): number | null => {
    // Boards are stored at: data/boards/${boardId}/board.json
    const jsonPath = fspath.join(BoardsDir(root), boardId, 'board.json');
    if (!fsSync.existsSync(jsonPath)) return null;

    try {
        const board = JSON.parse(fsSync.readFileSync(jsonPath, 'utf8'));
        const v = Number(board?.version);
        // If version is undefined/NaN, treat as version 0 (initial state)
        return Number.isFinite(v) ? v : 0;
    } catch {
        return null;
    }
};

const indexByKey = (cards = []) =>
    Object.fromEntries(cards.map(c => [c.key, c]));

const getChange = (prevData = { cards: [] }, currData = { cards: [] }) => {
    const prev = indexByKey(prevData.cards ?? []);
    const curr = indexByKey(currData.cards ?? []);

    const prevKeys = Object.keys(prev);
    const currKeys = Object.keys(curr);

    const addedKey = currKeys.find(k => !prev[k]);
    if (addedKey) return { type: "Adds", card: curr[addedKey] };

    const removedKey = prevKeys.find(k => !curr[k]);
    if (removedKey) return { type: "Removes", card: prev[removedKey] };

    const editedKey = currKeys.find(k => prev[k] && JSON.stringify(prev[k]) !== JSON.stringify(curr[k]));
    if (editedKey) return { type: "Edits", card: curr[editedKey] };

    return { type: "No changes", card: null };
};

export default async (app, context) => {
    // Get current version
    app.get('/api/core/v1/boards/:boardId/version/current', requirePermission('boards.read'), (req, res) => {
        const root = getRoot(req);
        const { boardId } = req.params;
        const v = getCurrentVersionFromFS(root, boardId);
        if (v === null) return res.status(404).send({ error: 'board not found or invalid version' });
        return res.send({ version: v });
    });

    // Get history
    app.get('/api/core/v1/boards/:boardId/history', requirePermission('boards.read'), async (req, res) => {
        try {
            const root = getRoot(req);
            const dir = fspath.join(VersionsBaseDir(root), req.params.boardId);
            if (!fsSync.existsSync(dir)) return res.send([]);
            const boardName = `${req.params.boardId}.json`;
            const entries = (await fs.readdir(dir))
                .filter(n => /^\d+$/.test(n))
                .map(Number)
                .sort((a, b) => a - b);

            const readJson = async p => JSON.parse(await fs.readFile(p, "utf8"));

            const versions = await Promise.all(entries.map(async version => {
                const filePath = fspath.join(dir, String(version), boardName);

                if (!fsSync.existsSync(filePath)) return null;
                const metaPath = fspath.join(dir, String(version), 'meta.json');
                let meta = {};
                if (fsSync.existsSync(metaPath)) {
                    meta = JSON.parse(await fs.readFile(metaPath, 'utf8'));
                }
                const prevPath = fspath.join(dir, String(version - 1), boardName);
                const prevData = (version > 1 && fsSync.existsSync(prevPath))
                    ? await readJson(prevPath)
                    : { cards: [] };
                const currData = await readJson(filePath);
                const { type, card } = getChange(prevData, currData);
                const change = card ? { type: type, card: card.name } : {};

                return {
                    version: currData.version ?? version,
                    ...meta,
                    savedAt: currData.savedAt ?? null,
                    cards: (currData.cards ?? []).map(c => `${c.name}.card`),
                    change,
                };
            }));
            res.send(versions.filter(Boolean));
        } catch (err) {
            console.error(err);
            res.status(500).send({ error: 'Error reading versions' });
        }
    });


    // Save version
    app.post('/api/core/v1/boards/:boardId/version', requirePermission('boards.update'), async (req, res) => {
        const root = getRoot(req);
        const boardId = req.params.boardId;
        // Boards are stored at: data/boards/${boardId}/board.json
        const jsonPath = fspath.join(BoardsDir(root), boardId, 'board.json');
        if (!fsSync.existsSync(jsonPath)) return res.status(404).send({ error: 'board not found' });

        // Increment version first, then save snapshot at that version
        const current = getCurrentVersionFromFS(root, boardId);
        const newVersion = current + 1;

        // Update board.json with new version before snapshot
        // Note: snapshotBoardFiles handles its own locking internally
        const boardData = JSON.parse(fsSync.readFileSync(jsonPath, 'utf8'));
        boardData.version = newVersion;
        fsSync.writeFileSync(jsonPath, JSON.stringify(boardData, null, 4));

        // Create snapshot at the new version (this function handles locking)
        await snapshotBoardFiles(root, boardId, newVersion);

        res.send({ ok: true, version: newVersion });
    });

    // Add or update version comment/tag
    app.post('/api/core/v1/boards/:boardId/versions/:version/meta', requirePermission('boards.update'), async (req, res) => {
        const root = getRoot(req);
        const { boardId, version } = req.params;
        const { comment, tag } = req.body;

        const metaPath = fspath.join(VersionsBaseDir(root), boardId, version, 'meta.json');
        const meta = { comment, tag, updatedAt: Date.now() };

        await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
        res.send({ ok: true });
    });

    // Restore version
    app.get('/api/core/v1/boards/:boardId/versions/:version/restore', requirePermission('boards.update'), async (req, res) => {
        const root = getRoot(req);
        const boardId = req.params.boardId;
        const version = req.params.version;
        const vdir = fspath.join(VersionsBaseDir(root), boardId, version);

        if (!fsSync.existsSync(vdir)) return res.status(404).send({ error: 'version not found' });

        const base = BoardsDir(root);
        const fileContent = fsSync.readFileSync(fspath.join(vdir, `${boardId}.json`), 'utf8');
        const versionData = JSON.parse(fileContent);

        // Restore the board folder (new structure: data/boards/${boardId}/)
        const srcDir = fspath.join(vdir, boardId);
        const dstDir = fspath.join(base, boardId);

        const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

        if (fsSync.existsSync(dstDir)) {
            for (let i = 0; i < 10; i++) {
                try {
                    await fs.rm(dstDir, { recursive: true, force: true });
                    break; // OK
                } catch (e: any) {
                    if (!['ENOTEMPTY', 'EBUSY', 'EPERM'].includes(e?.code) || i === 9) throw e;
                    await sleep(100 * (i + 1)); // backoff suave
                }
            }
        }

        // Ensure the board directory exists
        await fs.mkdir(dstDir, { recursive: true });

        // Copy the versioned board.json to the correct location
        const srcJson = fspath.join(vdir, `${boardId}.json`);
        const dstJson = fspath.join(dstDir, 'board.json');
        await fs.copyFile(srcJson, dstJson);

        // Copy the cards folder if it exists in the snapshot
        if (fsSync.existsSync(srcDir)) {
            await copyDirRecursive(srcDir, dstDir);
        }

        // Re-registra acciones y estados derivados:
        await API.get("/api/core/v1/reloadBoards?token=" + getServiceToken())
        res.send({ ok: true, restored: { boardId, version: versionData.version } });
    });
};

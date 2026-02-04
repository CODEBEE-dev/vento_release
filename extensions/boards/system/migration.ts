import * as fsSync from 'fs';
import * as fspath from 'path';
import { getRoot } from 'protonode';
import { getLogger } from 'protobase';

const logger = getLogger();

const BoardsDir = (root: string) => fspath.join(root, "/data/boards/");

/**
 * Check if a board exists in old format (boardName.json in root)
 */
function isOldFormatBoard(boardsDir: string, name: string): boolean {
    const oldJsonPath = fspath.join(boardsDir, `${name}.json`);
    const newJsonPath = fspath.join(boardsDir, name, 'board.json');

    // Old format: .json file exists in root, new format doesn't exist
    return fsSync.existsSync(oldJsonPath) && !fsSync.existsSync(newJsonPath);
}

/**
 * Get list of boards that need migration
 */
function getBoardsToMigrate(boardsDir: string): string[] {
    if (!fsSync.existsSync(boardsDir)) return [];

    const items = fsSync.readdirSync(boardsDir);
    const boardsToMigrate: string[] = [];

    for (const item of items) {
        if (item.endsWith('.json')) {
            const boardName = item.replace('.json', '');
            if (isOldFormatBoard(boardsDir, boardName)) {
                boardsToMigrate.push(boardName);
            }
        }
    }

    return boardsToMigrate;
}

/**
 * Migrate a single board from old format to new format
 */
function migrateBoard(boardsDir: string, boardName: string): void {
    logger.info({ boardName }, 'Migrating board to new folder structure');

    const boardDir = fspath.join(boardsDir, boardName);
    const cardsDir = fspath.join(boardDir, 'cards');

    // Old paths
    const oldJson = fspath.join(boardsDir, `${boardName}.json`);
    const oldJs = fspath.join(boardsDir, `${boardName}.js`);
    const oldUi = fspath.join(boardsDir, `${boardName}_ui.js`);

    // New paths
    const newJson = fspath.join(boardDir, 'board.json');
    const newJs = fspath.join(boardDir, 'board.js');
    const newUi = fspath.join(boardDir, 'board_ui.js');

    try {
        // 1. Create board directory if it doesn't exist
        if (!fsSync.existsSync(boardDir)) {
            fsSync.mkdirSync(boardDir, { recursive: true });
        }

        // 2. Create cards/ subdirectory
        if (!fsSync.existsSync(cardsDir)) {
            fsSync.mkdirSync(cardsDir, { recursive: true });
        }

        // 3. Move board.json
        if (fsSync.existsSync(oldJson) && !fsSync.existsSync(newJson)) {
            fsSync.renameSync(oldJson, newJson);
            logger.debug({ boardName }, 'Moved board.json');
        }

        // 4. Move board.js
        if (fsSync.existsSync(oldJs) && !fsSync.existsSync(newJs)) {
            fsSync.renameSync(oldJs, newJs);
            logger.debug({ boardName }, 'Moved board.js');
        }

        // 5. Move board_ui.js
        if (fsSync.existsSync(oldUi) && !fsSync.existsSync(newUi)) {
            fsSync.renameSync(oldUi, newUi);
            logger.debug({ boardName }, 'Moved board_ui.js');
        }

        // 6. Move card files from boardDir to cards/
        // Card files are .js files that are not board.js or board_ui.js
        const filesInBoardDir = fsSync.readdirSync(boardDir);
        for (const file of filesInBoardDir) {
            const filePath = fspath.join(boardDir, file);

            // Only move .js files that are not board.js or board_ui.js
            // Also skip directories (like 'cards')
            if (fsSync.statSync(filePath).isFile() &&
                file.endsWith('.js') &&
                file !== 'board.js' &&
                file !== 'board_ui.js') {

                const newPath = fspath.join(cardsDir, file);
                if (!fsSync.existsSync(newPath)) {
                    fsSync.renameSync(filePath, newPath);
                    logger.debug({ boardName, file }, 'Moved card file to cards/');
                }
            }
        }

        logger.info({ boardName }, 'Board migration completed');

    } catch (error) {
        logger.error({ boardName, error: (error as Error).message }, 'Failed to migrate board');
        throw error;
    }
}

/**
 * Run migration for all boards in old format
 * Should be called at startup before any board operations
 */
export async function runBoardsMigration(): Promise<void> {
    const boardsDir = BoardsDir(getRoot());

    // Ensure boards directory exists
    if (!fsSync.existsSync(boardsDir)) {
        fsSync.mkdirSync(boardsDir, { recursive: true });
        return; // No boards to migrate
    }

    const boardsToMigrate = getBoardsToMigrate(boardsDir);

    if (boardsToMigrate.length === 0) {
        logger.debug('No boards need migration');
        return;
    }

    logger.info({ count: boardsToMigrate.length }, 'Found boards to migrate to new folder structure');

    for (const boardName of boardsToMigrate) {
        try {
            migrateBoard(boardsDir, boardName);
        } catch (error) {
            // Log error but continue with other boards
            logger.error({ boardName, error: (error as Error).message }, 'Board migration failed, skipping');
        }
    }

    logger.info('Board migration process completed');
}

/**
 * Check if migration is needed (for conditional startup)
 */
export function isMigrationNeeded(): boolean {
    const boardsDir = BoardsDir(getRoot());
    if (!fsSync.existsSync(boardsDir)) return false;
    return getBoardsToMigrate(boardsDir).length > 0;
}

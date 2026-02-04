import { promises as fs } from 'fs';
import * as fsSync from 'fs';
import * as fspath from 'path';
import { getRoot } from 'protonode'
import { acquireLock, releaseLock } from './lock';
import { getLogger } from 'protobase';

const logger = getLogger()

export const BoardsDir = (root) => fspath.join(root, "/data/boards/")
export const getBoards = async () => {
    const boardsDir = BoardsDir(getRoot());
    try {
        await fs.access(boardsDir, fs.constants.F_OK)
    } catch (error) {
        console.log("Creating boards folder")
        await fs.mkdir(boardsDir)
        return []
    }
    // List directories that contain board.json (new structure)
    const items = await fs.readdir(boardsDir);
    return items.filter(f => {
        const itemPath = fspath.join(boardsDir, f);
        const boardJsonPath = fspath.join(itemPath, 'board.json');
        return fsSync.lstatSync(itemPath).isDirectory() && fsSync.existsSync(boardJsonPath);
    });
}

export const getBoardFilePath = (boardId) => {
    return fspath.join(BoardsDir(getRoot()), boardId, "board.json");
}

export const getBoard = async (boardId) => {
    const filePath = getBoardFilePath(boardId);
    let fileContent = null;

    await acquireLock(filePath);

    try {
        fileContent = await fs.readFile(filePath, 'utf8');
    } catch (error) {
        throw new Error("Error reading board file: " + filePath);
    } finally {
        releaseLock(filePath);
    }

    try {
        fileContent = JSON.parse(fileContent);

        //iterate over cards and add the rulesCode and html properties from the card file
        const root = getRoot();
        const cardsDir = fspath.join(BoardsDir(root), boardId, 'cards');

        for (let i = 0; i < fileContent.cards.length; i++) {
            const card = fileContent.cards[i];

            if (!card || card.rulesCode || card.html) { //legacy card, skip
                continue;
            }

            //read the card file from the cards subfolder
            const cardFilePath = fspath.join(cardsDir, card.name + '.js');
            const cardHTMLFilePath = fspath.join(cardsDir, card.name + '_view.js');

            if (fsSync.existsSync(cardFilePath)) {
                const cardContent = await fs.readFile(cardFilePath, 'utf8')
                card.rulesCode = cardContent
            } else {
                card.rulesCode = ''
            }

            if (fsSync.existsSync(cardHTMLFilePath)) {
                const cardHTMLContent = await fs.readFile(cardHTMLFilePath, 'utf8')
                card.html = cardHTMLContent
            } else {
                card.html = ''
            }
        }
    } catch (error) {
        logger.error({ error }, "Error parsing board file: " + filePath);
        throw new Error("Error parsing board file: " + filePath);
    }

    return fileContent;
}

export const cleanObsoleteCardFiles = (boardId, newCardNames) => {
    const cardsFolder = fspath.join(BoardsDir(getRoot()), boardId, 'cards');
    if (!fsSync.existsSync(cardsFolder)) return;

    const files = fsSync.readdirSync(cardsFolder);

    const validFileNames = new Set();

    for (const name of newCardNames) {
        validFileNames.add(name + '.js');
        validFileNames.add(name + '_view.js');
    }

    for (const file of files) {
        if ((file.endsWith('.js') || file.endsWith('_view.js')) && !validFileNames.has(file)) {
            fsSync.unlinkSync(fspath.join(cardsFolder, file));
        }
    }
};

// Templates functions
export const TemplatesDir = (root) => fspath.join(root, "/data/templates/boards/")

export const getTemplates = async () => {
    const templatesDir = TemplatesDir(getRoot());
    try {
        await fs.access(templatesDir, fs.constants.F_OK);
    } catch (error) {
        await fs.mkdir(templatesDir, { recursive: true });
        return [];
    }

    const dirs = await fs.readdir(templatesDir);
    return dirs.filter(f => fsSync.lstatSync(fspath.join(templatesDir, f)).isDirectory());
}

export const getTemplateFilePath = (templateId) => {
    return TemplatesDir(getRoot()) + templateId + '/' + templateId + ".json";
}

export const getTemplate = async (templateId) => {
    const filePath = getTemplateFilePath(templateId);

    await acquireLock(filePath);
    try {
        const fileContent = await fs.readFile(filePath, 'utf8');
        return JSON.parse(fileContent);
    } catch (error) {
        logger.error({ error }, "Error reading template file: " + filePath);
        throw new Error("Error reading template file: " + filePath);
    } finally {
        releaseLock(filePath);
    }
}

export const deleteTemplate = async (templateId) => {
    const templatesDir = TemplatesDir(getRoot());
    const templateDir = fspath.join(templatesDir, templateId);

    if (fsSync.existsSync(templateDir)) {
        fsSync.rmSync(templateDir, { recursive: true, force: true });
        return true;
    }
    return false;
}

export const saveTemplate = async (templateId, boardData, options?: { description?: string }) => {
    const templatesDir = TemplatesDir(getRoot());
    const templateDir = templatesDir + templateId + '/';

    // Create directories
    if (!fsSync.existsSync(templatesDir)) {
        fsSync.mkdirSync(templatesDir, { recursive: true });
    }
    if (fsSync.existsSync(templateDir)) {
        fsSync.rmSync(templateDir, { recursive: true, force: true });
    }
    fsSync.mkdirSync(templateDir, { recursive: true });

    // Prepare board data - keep rulesCode and html inline in the JSON
    const templateData = JSON.parse(JSON.stringify(boardData));
    templateData.name = '{{{name}}}';
    delete templateData.version;
    delete templateData.savedAt;
    delete templateData.displayName;

    // Write template JSON (with rulesCode/html inline in cards)
    const templateFilePath = templateDir + templateId + '.json';
    fsSync.writeFileSync(templateFilePath, JSON.stringify(templateData, null, 4));

    // Write README if description provided
    if (options?.description) {
        fsSync.writeFileSync(templateDir + 'README.md', options.description);
    }

    return templateData;
}

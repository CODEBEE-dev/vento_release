/**
 * Ephemeral Context API
 *
 * Manages isolated virtual contexts for parallel action execution.
 * Contexts are stored in memory only and never persisted.
 */

import { ProtoMemDB } from 'protobase';
import { v4 as uuidv4 } from 'uuid';
import { getLogger } from 'protobase';

const logger = getLogger({ module: 'ephemeral-context' });

// Constants
const MAX_CONTEXT_AGE_MS = 3600000; // 1 hour
const CLEANUP_INTERVAL_MS = 60000;  // 1 minute

let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Creates a new ephemeral context for a board
 */
export function createContext(boardId: string): string {
    const contextId = uuidv4();
    ProtoMemDB('states').set('contexts', contextId, '_boardId', boardId);
    ProtoMemDB('states').set('contexts', contextId, '_createdAt', Date.now());
    logger.debug({ contextId, boardId }, 'Created ephemeral context');
    return contextId;
}

/**
 * Cleans up an ephemeral context
 */
export function cleanupContext(contextId: string): void {
    if (!contextId) return;

    const boardId = ProtoMemDB('states').get('contexts', contextId, '_boardId');
    ProtoMemDB('states').clear('contexts', contextId);
    logger.debug({ contextId, boardId }, 'Cleaned up ephemeral context');
}

/**
 * Gets a value from the ephemeral context
 */
export function getContextState(contextId: string, cardName: string): any {
    if (!contextId) return undefined;
    return ProtoMemDB('states').get('contexts', contextId, cardName);
}

/**
 * Sets a value in the ephemeral context
 */
export function setContextState(contextId: string, cardName: string, value: any): void {
    if (!contextId) return;
    ProtoMemDB('states').set('contexts', contextId, cardName, value);
}

/**
 * Gets a card state with fallback: context first, then base state
 */
export function getCardState(boardId: string, cardName: string, contextId?: string): any {
    if (contextId) {
        const contextValue = getContextState(contextId, cardName);
        if (contextValue !== undefined) {
            return contextValue;
        }
    }
    return ProtoMemDB('states').get('boards', boardId, cardName);
}

/**
 * Sets a card state - to context if contextId exists, otherwise to base
 */
export function setCardState(boardId: string, cardName: string, value: any, contextId?: string): void {
    if (contextId) {
        setContextState(contextId, cardName, value);
    } else {
        ProtoMemDB('states').set('boards', boardId, cardName, value);
    }
}

/**
 * Gets all state for a context
 */
export function getFullContextState(contextId: string): Record<string, any> | null {
    if (!contextId) return null;
    return ProtoMemDB('states').getByTag('contexts', contextId) || null;
}

/**
 * Checks if a context exists
 */
export function contextExists(contextId: string): boolean {
    if (!contextId) return false;
    const boardId = ProtoMemDB('states').get('contexts', contextId, '_boardId');
    return boardId !== undefined;
}

/**
 * Resolves the effective stateMode for an action
 */
export function resolveStateMode(
    action: { stateMode?: string },
    board: { ephemeral?: boolean }
): 'ephemeral' | 'non-ephemeral' {
    if (action?.stateMode === 'ephemeral') return 'ephemeral';
    if (action?.stateMode === 'non-ephemeral') return 'non-ephemeral';
    // default: depends on board setting
    return board?.ephemeral ? 'ephemeral' : 'non-ephemeral';
}

/**
 * Cleans up orphaned contexts (older than MAX_CONTEXT_AGE_MS)
 */
export function cleanupOrphanedContexts(): void {
    const now = Date.now();
    const allContexts = ProtoMemDB('states').getByGroup('contexts') || {};
    let cleaned = 0;

    for (const contextId in allContexts) {
        const createdAt = allContexts[contextId]?._createdAt;
        if (createdAt && (now - createdAt > MAX_CONTEXT_AGE_MS)) {
            cleanupContext(contextId);
            cleaned++;
        }
    }

    if (cleaned > 0) {
        logger.info({ cleaned }, 'Cleaned up orphaned ephemeral contexts');
    }
}

/**
 * Starts the periodic cleanup of orphaned contexts
 */
export function startContextCleanup(): void {
    if (cleanupInterval) {
        return; // Already running
    }

    cleanupInterval = setInterval(() => {
        try {
            cleanupOrphanedContexts();
        } catch (err) {
            logger.error({ err }, 'Error during orphaned context cleanup');
        }
    }, CLEANUP_INTERVAL_MS);

    logger.info('Started ephemeral context cleanup scheduler');
}

/**
 * Stops the periodic cleanup
 */
export function stopContextCleanup(): void {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
        logger.info('Stopped ephemeral context cleanup scheduler');
    }
}

/**
 * Gets context statistics (for debugging)
 */
export function getContextStats(): { count: number; contexts: Array<{ id: string; boardId: string; age: number }> } {
    const now = Date.now();
    const allContexts = ProtoMemDB('states').getByGroup('contexts') || {};
    const contexts: Array<{ id: string; boardId: string; age: number }> = [];

    for (const contextId in allContexts) {
        const ctx = allContexts[contextId];
        if (ctx?._boardId) {
            contexts.push({
                id: contextId,
                boardId: ctx._boardId,
                age: now - (ctx._createdAt || now)
            });
        }
    }

    return { count: contexts.length, contexts };
}

/**
 * Matrix Board Context Functions
 *
 * Provides context.matrix.* functions for board cards
 */

import { sendToRoom, getAgentForBoard } from '../bridge';
import { getLogger } from 'protobase';

const logger = getLogger();

/**
 * Send a message to the user who initiated the current conversation
 *
 * Usage in board card:
 *   await context.matrix.sendToUser({
 *     boardId: 'myboard',
 *     roomId: board.agent_input.current.params.roomId,
 *     message: 'Processing your request...'
 *   })
 */
export const sendToUser = async (params: {
    boardId: string;
    roomId: string;
    message: string;
}): Promise<{ success: boolean; error?: string }> => {
    const { boardId, roomId, message } = params;

    if (!boardId) {
        return { success: false, error: 'boardId is required' };
    }
    if (!roomId) {
        return { success: false, error: 'roomId is required - make sure the request came from Matrix' };
    }
    if (!message) {
        return { success: false, error: 'message is required' };
    }

    logger.debug({ boardId, roomId, messageLength: message.length }, 'context.matrix.sendToUser called');

    return await sendToRoom(boardId, roomId, message);
};

/**
 * Check if a board has an associated Matrix agent
 */
export const hasAgent = (boardId: string): boolean => {
    return !!getAgentForBoard(boardId);
};

/**
 * Get info about the Matrix agent for a board
 */
export const getAgent = (boardId: string): {
    boardId: string;
    matrixUserId: string;
    displayName: string
} | null => {
    const agent = getAgentForBoard(boardId);
    if (!agent) return null;
    return {
        boardId: agent.boardId,
        matrixUserId: agent.matrixUserId,
        displayName: agent.displayName,
    };
};

export default {
    sendToUser,
    hasAgent,
    getAgent,
};

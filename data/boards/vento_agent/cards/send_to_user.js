/**
 * send_to_user card
 *
 * Sends a message to the Matrix user who initiated the conversation.
 * Uses context.matrix.sendToUser() to send intermediate messages.
 *
 * params.message - The message to send to the user
 *
 * The roomId is obtained from board.agent_input.current.params.roomId
 */

const roomId = board.agent_input?.current?.params?.roomId;
const sender = board.agent_input?.current?.params?.sender;

if (!roomId) {
    return {
        success: false,
        error: 'No roomId available - this action only works when called from a Matrix conversation'
    };
}

if (!params.message) {
    return {
        success: false,
        error: 'message parameter is required'
    };
}

const result = await context.matrix.sendToUser({
    boardId: boardName,
    roomId: roomId,
    message: params.message
});

return result;

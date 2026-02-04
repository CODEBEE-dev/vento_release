/**
 * Board Context for chatgpt extension
 *
 * These functions are available to card rulesCode via context.chatgpt.*
 */

// Re-export from coreContext only what cards need
export { chatGPTPrompt } from '../coreContext';

import { chatGPTPrompt } from '../coreContext';

export default {
    chatGPTPrompt
};

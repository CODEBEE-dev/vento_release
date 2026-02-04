/**
 * Board Context for lmstudio extension
 *
 * These functions are available to card rulesCode via context.lmstudio.*
 */

// Re-export from context only what cards need
// Note: lmstudio uses 'context/' instead of 'coreContext/'
export { chatWithModel } from '../context/chatWithModel';

import { chatWithModel } from '../context/chatWithModel';

export default {
    chatWithModel
};

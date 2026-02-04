/**
 * Board Context for llama extension
 *
 * These functions are available to card rulesCode via context.llama.*
 */

// Re-export from coreContext only what cards need
export { llamaPrompt } from '../coreContext';

import { llamaPrompt } from '../coreContext';

export default {
    llamaPrompt
};

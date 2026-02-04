/**
 * Board Context for matrix extension
 *
 * These functions are available to card rulesCode via context.matrix.*
 */

// Re-export from coreContext only what cards need
export { sendToUser } from '../coreContext';

import { sendToUser } from '../coreContext';

export default {
    sendToUser
};

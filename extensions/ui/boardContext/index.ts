/**
 * Board Context for ui extension
 *
 * These functions are available to card rulesCode via context.ui.*
 */

// Re-export from coreContext only what cards need
export { openTab } from '../coreContext';

import { openTab } from '../coreContext';

export default {
    openTab
};

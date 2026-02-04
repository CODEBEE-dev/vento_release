/**
 * Board Context for settings extension
 *
 * These functions are available to card rulesCode via context.settings.*
 */

// Re-export from coreContext only what cards need
export { get } from '../coreContext';

import { get } from '../coreContext';

export default {
    get
};

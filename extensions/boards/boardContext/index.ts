/**
 * Board Context for boards extension
 *
 * These functions are available to card rulesCode via context.boards.*
 */

// Re-export from coreContext only what cards need
export {
    getStatesByType,
    setVar,
    getVar,
    hasVar,
    clearVar
} from '../coreContext';

import {
    getStatesByType,
    setVar,
    getVar,
    hasVar,
    clearVar
} from '../coreContext';

export default {
    getStatesByType,
    setVar,
    getVar,
    hasVar,
    clearVar
};

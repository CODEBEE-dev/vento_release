/**
 * Board Context for ai extension
 *
 * These functions are available to card rulesCode via context.ai.*
 */

// Re-export from coreContext only what cards need
export {
    runAgent,
    aiAction,
    processResponse,
    processAgentResponse,
    htmlBox,
    cleanCode
} from '../coreContext';

import {
    runAgent,
    aiAction,
    processResponse,
    processAgentResponse,
    htmlBox,
    cleanCode
} from '../coreContext';

export default {
    runAgent,
    aiAction,
    processResponse,
    processAgentResponse,
    htmlBox,
    cleanCode
};

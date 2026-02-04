/**
 * UI Context - Commands for controlling the frontend UI from agent code
 *
 * These functions emit MQTT events that the frontend listens to via PageBus.
 */

import { generateEvent } from "protobase";
import { getServiceToken } from 'protonode';

/**
 * Opens a board as a new tab in the workspace
 * @param boardName - Name of the board to open
 */
export const openTab = async (boardName: string) => {
    await generateEvent({
        path: 'ui/commands/open-tab',
        from: 'agent',
        user: 'system',
        payload: {
            name: boardName,
            tabType: 'board'
        },
        ephemeral: true
    }, getServiceToken());
};

export default {
    openTab
};

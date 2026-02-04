/**
 * open_tab card
 *
 * Opens a board as a new tab in the user's workspace UI.
 * Uses context.ui.openTab() to trigger the tab opening via PageBus.
 *
 * params.board_name - The name of the board to open
 *
 * This allows the agent to guide the user through changes by
 * automatically showing them the relevant boards.
 */

if (!params.board_name) {
    return {
        success: false,
        error: 'board_name parameter is required'
    };
}

try {
    await context.ui.openTab(params.board_name);
    return {
        success: true,
        message: `Opened board '${params.board_name}' in a new tab`
    };
} catch (e) {
    return {
        success: false,
        error: `Failed to open tab: ${String(e)}`
    };
}

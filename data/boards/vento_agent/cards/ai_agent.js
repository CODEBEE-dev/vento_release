// Check if send_to_user action exists in this board
const hasSendToUser = boardActions.some(a => a.name === 'send_to_user');

// Track last message to avoid duplicates
let lastProgressMessage = '';

// Key for storing running processes
const processesKey = `ai_agent_processes:${boardName}`;
const cancelHandlerKey = `cancelHandler:${boardName}:${name}`;

// Progress callback - sends intermediate messages to user via Matrix
const onProgress = hasSendToUser ? async (message) => {
    // Skip empty or duplicate messages
    if (!message || message === lastProgressMessage) return;

    // Skip very short messages or debug noise
    if (message.length < 10) return;

    // Skip lines that look like JSON or code
    if (message.startsWith('{') || message.startsWith('[') || message.startsWith('```')) return;

    lastProgressMessage = message;

    // Send to user via send_to_user action
    try {
        await executeAction({ name: 'send_to_user', params: { message } });
    } catch (e) {
        // Ignore errors - don't let progress updates break the main flow
    }
} : undefined;

// Called when a new process spawns - add to tracking
const onSpawn = (child) => {
    const processes = context.boards.getVar(processesKey) || [];
    processes.push(child);
    context.boards.setVar(processesKey, processes);
};

// Called when a process exits - remove from tracking
const onExit = (child) => {
    const processes = context.boards.getVar(processesKey) || [];
    const filtered = processes.filter(p => p !== child);
    context.boards.setVar(processesKey, filtered);

    // If no more processes, clear the cancel handler
    if (filtered.length === 0) {
        context.boards.clearVar(cancelHandlerKey);
    }
};

// Register cancel handler - kills all running processes
context.boards.setVar(cancelHandlerKey, () => {
    const processes = context.boards.getVar(processesKey) || [];
    processes.forEach(p => {
        try {
            p.kill('SIGTERM');
        } catch (e) {
            // Process may have already exited
        }
    });
    context.boards.clearVar(processesKey);
});

return await context.ai.runAgent({
    system: params.system,
    plan: params.plan,
    prompt: params.prompt,
    boardName,
    boardActions,
    board,
    onProgress,
    onSpawn,
    onExit
});

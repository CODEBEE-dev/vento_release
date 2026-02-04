import { API, getServiceToken } from "protobase";

/**
 * Call the default LLM agent with a prompt (simple version)
 */
export const callModel = async (prompt: string) => {
    const res = await API.post("/api/agents/v1/llm_agent/agent_input?token=" + getServiceToken(), {
        prompt
    });
    return res.data;
};

/**
 * Simple prompt function similar to context.chatgpt.prompt
 * Returns the response directly (string)
 */
export const prompt = async (options: {
    message: string;
    conversation?: any[];
    images?: any[];
    files?: any[];
    model?: string;
    provider?: string;
    board?: string;
    card?: string;
    log_ai_calls?: boolean;
    done?: (result: any) => void;
    error?: (err: any) => void;
}) => {
    const {
        message,
        conversation = [],
        images = [],
        files = [],
        model,
        provider,
        board,
        card,
        log_ai_calls,
        done = () => { },
        error = () => { }
    } = options;

    try {
        const res = await API.post("/api/agents/v1/llm_agent/agent_input?token=" + getServiceToken(), {
            message,
            conversation,
            images,
            files,
            model,
            provider,
            board,
            card,
            log_ai_calls
        });

        const response = res.data;

        // Extract the actual response text
        let result = response;
        if (response.choices[0]?.message?.content) {
            result = response.choices[0]?.message?.content;
        } else if (response?.reply?.choices?.[0]?.message?.content) {
            result = response.reply.choices[0].message.content;
        } else if (response?.reply) {
            result = response.reply;
        }

        done(result);
        return result;
    } catch (err: any) {
        error(err?.message || err);
        return { isError: true, data: { error: { message: err?.message || 'LLM error' } } };
    }
};

/**
 * Generate a system prompt message structure
 */
export const getSystemPrompt = (options: {
    prompt: string;
    done?: (result: any) => any;
    error?: (e: any) => any;
}) => {
    const { prompt, done = async (p) => p, error = (e) => e } = options;

    const result = [
        {
            role: "system",
            content: [
                {
                    type: "text",
                    text: prompt,
                },
            ],
        },
    ];

    done(result);
    return result;
};

/**
 * Clean code from markdown code blocks
 */
export const cleanCode = (code: string): string => {
    // Remove ```(plus anything that's not a space) from the beginning
    // Remove ``` from the end
    let cleaned = code.replace(/^```[^\s]+/g, '').replace(/```/g, '').trim();

    // Remove 'javascript' from the beginning if it exists
    if (cleaned.startsWith('javascript')) {
        cleaned = cleaned.replace('javascript', '').trim();
    }

    return cleaned;
};

/**
 * Process an agent response with actions
 */
export const processAgentResponse = async (options: {
    response: string | { choices: { message: { content: string; } }[] };
    execute_action: (name: string, params: any) => Promise<any>;
    done?: (result: any) => Promise<any>;
    error?: (e: any) => any;
}) => {
    let {
        response,
        execute_action,
        done = async (v) => v,
        error = (e) => e
    } = options;

    if (!response) return null;
    if (!execute_action) return null;

    if (typeof response === 'object' && 'choices' in response && response?.choices?.[0]?.message?.content) {
        response = response.choices[0].message.content;
    }

    try {
        let parsedResponse: any;
        const executedActions: any[] = [];
        const approvals: any[] = [];
        try {
            parsedResponse = JSON.parse(
                response
                    .replace(/^```[\w]*\n?/, '')
                    .replace(/```$/, '')
                    .trim()
            );

        } catch (e) {
            return await done({
                response: response ?? "",
                executedActions,
                approvals,
            });

        }

        for (const action of parsedResponse.actions || []) {
            if (!action || !action.name) continue;

            const params = action.params || {};
            const result = await execute_action(action.name, params);

            executedActions.push({
                name: action.name,
                params,
                result,
            });

            if (result && typeof result === "object" && result.offered === true && result.approvalId) {
                const boardId = result.boardId;
                const actionName = result.action || action.name;
                const approvalId = result.approvalId;
                const message = result.message;

                let urls: any = undefined;
                if (boardId && actionName && approvalId) {
                    const base = `/api/core/v1/boards/${boardId}/actions/${actionName}/approvals/${approvalId}`;
                    urls = {
                        accept: `${base}/accept`,
                        reject: `${base}/reject`,
                        status: `${base}/status`,
                    };
                }

                approvals.push({
                    boardId,
                    action: actionName,
                    approvalId,
                    id: approvalId,
                    message,
                    params,
                    urls,
                });
            }
        }

        return await done({
            response: parsedResponse.response ?? "",
            executedActions,
            approvals,
        });
    } catch (e) {
        console.error({ error: e }, 'Error in processAgentResponse');
        return error(e);
    }
};

function objectToXML(obj, rootName = 'root', options: any = {}) {
    const {
        indent = '  ',  // 2 spaces by default for better compatibility
        arrayItemNameOverrides = {
            board_actions: 'board_action',
            history: 'message', // ex. <history><message>...</message></history>
            actions: 'action'
        },
        parseJsonStrings = true
    } = options;

    function escapeXml(str) {
        return String(str).replace(/[<>&]/g, c => ({
            '<': '&lt;',
            '>': '&gt;',
            '&': '&amp;'
        }[c]));
    }

    function maybeParseJson(value) {
        if (!parseJsonStrings || typeof value !== 'string') return value;
        const s = value.trim();
        if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
            try { return JSON.parse(s); } catch { }
        }
        return value;
    }

    function itemTagFor(parentKey) {
        if (arrayItemNameOverrides && arrayItemNameOverrides[parentKey]) {
            return arrayItemNameOverrides[parentKey];
        }

        if (typeof parentKey === 'string') {
            if (parentKey.endsWith('ies')) return parentKey.slice(0, -3) + 'y';
            if (parentKey.endsWith('s')) return parentKey.slice(0, -1);
        }
        return 'item';
    }

    function convert(key, value, level) {
        value = maybeParseJson(value);

        const pad = indent.repeat(level);

        if (value === null || value === undefined) {
            return `${pad}<${key}></${key}>\n`;
        }

        if (Array.isArray(value)) {
            const itemTag = itemTagFor(key);
            const children = value.map(item => convert(itemTag, item, level + 1)).join('');
            return `${pad}<${key}>\n${children}${pad}</${key}>\n`;
        }

        if (typeof value === 'object') {
            const entries = Object.entries(value);
            const children = entries.map(([k, v]) => convert(k, v, level + 1)).join('');
            return `${pad}<${key}>\n${children}${pad}</${key}>\n`;
        }

        return `${pad}<${key}>${escapeXml(value)}</${key}>\n`;
    }

    const rootWrapped = convert(rootName, obj, 0);
    return rootWrapped.trim();
}

/**
 * Convert an object to semantic HTML - great for LLMs and visual debugging
 * Uses dark-first colors that work in both themes
 */
function objectToHTML(obj, rootName = 'root', options: any = {}) {
    const {
        parseJsonStrings = true,
        styles = true  // include inline styles for visual debugging
    } = options;

    // Dark-first color palette (works in dark mode, acceptable in light)
    const colors = {
        bg: '#1c1c1e',
        bgAlt: '#2c2c2e',
        text: '#e5e5e7',
        textMuted: '#98989d',
        textBold: '#ffffff',
        border: '#3a3a3c',
        accent: '#0a84ff',
        accentBg: '#1a3a5c'
    };

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function maybeParseJson(value) {
        if (!parseJsonStrings || typeof value !== 'string') return value;
        const s = value.trim();
        if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
            try { return JSON.parse(s); } catch { }
        }
        return value;
    }

    function formatKey(key) {
        return key;
    }

    function convert(value, key = null, isArrayItem = false) {
        value = maybeParseJson(value);

        if (value === null || value === undefined) {
            return key ? `<div><strong>${formatKey(key)}:</strong> <em style="color:${colors.textMuted};">empty</em></div>` : `<em style="color:${colors.textMuted};">empty</em>`;
        }

        if (Array.isArray(value)) {
            if (value.length === 0) {
                return key ? `<div><strong>${formatKey(key)}:</strong> <em style="color:${colors.textMuted};">empty list</em></div>` : `<em style="color:${colors.textMuted};">empty list</em>`;
            }
            const items = value.map((item, i) => `<li style="margin:4px 0;">${convert(item, null, true)}</li>`).join('\n');
            const list = `<ul style="margin:4px 0;padding-left:20px;list-style:disc;">\n${items}\n</ul>`;
            return key ? `<details open style="margin:8px 0;"><summary style="cursor:pointer;font-weight:600;color:${colors.textBold};">${formatKey(key)} <span style="color:${colors.textMuted};font-weight:normal;">(${value.length})</span></summary>${list}</details>` : list;
        }

        if (typeof value === 'object') {
            const entries = Object.entries(value);
            if (entries.length === 0) {
                return key ? `<div><strong>${formatKey(key)}:</strong> <em style="color:${colors.textMuted};">empty</em></div>` : `<em style="color:${colors.textMuted};">empty</em>`;
            }

            const dlItems = entries.map(([k, v]) => {
                const rendered = convert(v, null, false);
                // If it's a simple value, use inline style
                if (typeof v !== 'object' || v === null) {
                    return `<div style="margin:4px 0;padding:2px 0;"><strong style="color:${colors.text};">${formatKey(k)}:</strong> ${rendered}</div>`;
                }
                // For nested objects/arrays, use details
                return convert(v, k, false);
            }).join('\n');

            if (key) {
                return `<details open style="margin:8px 0;border-left:2px solid ${colors.border};padding-left:12px;"><summary style="cursor:pointer;font-weight:600;color:${colors.textBold};">${formatKey(key)}</summary>\n${dlItems}\n</details>`;
            }
            return dlItems;
        }

        // Primitive value
        const strVal = escapeHtml(String(value));
        // Truncate very long strings for display
        const displayVal = strVal.length > 300 ? strVal.slice(0, 300) + '...' : strVal;
        return `<span style="color:${colors.accent};">${displayVal}</span>`;
    }

    const content = convert(obj);
    const containerStyle = styles ? ` style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;line-height:1.6;padding:16px;background:${colors.bg};color:${colors.text};border-radius:12px;border:1px solid ${colors.border};overflow:auto;"` : '';

    return `<section${containerStyle}>\n<h3 style="margin:0 0 12px 0;color:${colors.textBold};border-bottom:1px solid ${colors.border};padding-bottom:8px;font-size:15px;">${formatKey(rootName)}</h3>\n${content}\n</section>`;
}

/**
 * Create a simple HTML box with dark-first styling
 */
export function htmlBox(content, title = null, options: any = {}) {
    const { accent = false } = options;

    const colors = {
        bg: accent ? '#1a3a5c' : '#1c1c1e',
        text: '#e5e5e7',
        textBold: '#ffffff',
        border: accent ? '#0a84ff' : '#3a3a3c'
    };

    const titleHtml = title ? `<h3 style="margin:0 0 12px 0;color:${colors.textBold};border-bottom:1px solid ${colors.border};padding-bottom:8px;font-size:15px;">${title}</h3>\n` : '';

    return `<section style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;line-height:1.6;padding:16px;background:${colors.bg};color:${colors.text};border-radius:12px;border:1px solid ${colors.border};overflow:auto;margin:8px 0;">\n${titleHtml}${content}\n</section>`;
}

// Backwards-compatible alias
export const processResponse = processAgentResponse;

/**
 * AI Action - Build prompt and call LLM for AI-powered board cards
 *
 * Handles: filtering actions/states, building HTML prompt, calling LLM.
 * Does NOT execute actions - use processResponse in the card for that.
 *
 * @returns { prompt: string, response: string | null }
 */
export const aiAction = async (options: {
    // Board data
    board: Record<string, any>;
    boardActions: any[];
    name: string;
    boardName?: string; // Name of the board for logging purposes

    // User prompt
    prompt: string;
    prompt_suffix?: string;

    // Visibility
    full_board_view?: boolean;
    actions?: string[];
    invisible_actions?: string[];
    values?: string[];
    invisible_values?: string[];

    // Behavior
    allow_execution?: boolean;
    allow_read?: boolean;
    debug?: boolean;
    log_ai_calls?: boolean;

    // Custom instructions (optional - use defaults if not provided)
    instructionsExecution?: string;
    instructionsReadOnly?: string;

    // State extraction
    getStatesByType?: (options: { board: any; type: string; key: string }) => Promise<any[]>;

    // Callbacks
    done?: (result: any) => any;
    error?: (e: any) => any;
}): Promise<{ prompt: string; response: string | null }> => {
    const {
        board,
        boardActions,
        name,
        boardName,
        prompt: userPrompt,
        prompt_suffix = '',
        full_board_view = false,
        actions = [],
        invisible_actions = [],
        values = [],
        invisible_values = [],
        allow_execution = false,
        allow_read = false,
        debug = false,
        log_ai_calls,
        instructionsExecution: customInstructionsExecution,
        instructionsReadOnly: customInstructionsReadOnly,
        getStatesByType,
        done = (r) => r,
        error = (e) => { throw e; }
    } = options;

    try {
        // Determine visible/invisible lists
        const visibleActions = full_board_view ? ['*'] : actions;
        const invisibleActionsSet = [...invisible_actions, name];
        const visibleStates = full_board_view ? ['*'] : values;
        const invisibleStatesSet = [...invisible_values, name];

        // Fields to always strip from actions (UI-specific, not relevant for AI)
        const stripFields = ['html', 'width', 'height', 'color', 'displayResponse', 'key', 'icon'];

        // Filter and transform actions
        const filteredActions = boardActions.filter((action: any) => {
            const actionName = action.name;
            if (visibleActions.includes('*')) {
                return !invisibleActionsSet.includes(actionName);
            }
            return visibleActions.includes(actionName) && !invisibleActionsSet.includes(actionName);
        }).map((action: any) => {
            const result: any = {};
            for (const key of Object.keys(action)) {
                if (!stripFields.includes(key)) {
                    result[key] = action[key];
                }
            }
            let description = result.description || '';
            if (description.startsWith('Actions can perform tasks, automate processes, and enhance user interactions')) {
                description = 'generic action with no description';
            }
            result.description = description;
            return result;
        });

        // Filter states
        const filteredStates = Object.fromEntries(
            Object.entries(board).filter(([key]) => {
                if (visibleStates.includes('*')) {
                    return !invisibleStatesSet.includes(key);
                }
                return visibleStates.includes(key) && !invisibleStatesSet.includes(key);
            })
        );

        // Build HTML sections
        const boardActionsHtml = objectToHTML(filteredActions, 'Available Actions', { parseJsonStrings: true });
        const boardStatesHtml = objectToHTML(filteredStates, 'Board States', { parseJsonStrings: true });

        // Build prompt content
        const promptContent = prompt_suffix ? `${userPrompt}\n${prompt_suffix}` : userPrompt;
        const promptHtml = htmlBox(
            `<p style="margin:0;font-size:15px;color:#ffffff;">${promptContent}</p>`,
            '💬 User Prompt',
            { accent: true }
        );

        // Use custom instructions if provided, otherwise use defaults
        const instructionsExecution = customInstructionsExecution ?? htmlBox(`
<p>You are an AI agent inside <strong style="color:#0a84ff;">Vento</strong>, an AI agent platform.</p>
<p>The agent is managed through a <strong>board</strong> composed of <em>states</em> and <em>actions</em>.</p>
<p>Your mission is to generate a JSON response in this format:</p>
<pre style="background:#2c2c2e;color:#0a84ff;padding:12px;border-radius:8px;overflow-x:auto;font-size:12px;margin:8px 0;border:1px solid #3a3a3c;">
{
  "response": "your message in markdown format",
  "actions": [
    { "name": "action name", "params": { "key": "value" } }
  ]
}
</pre>
<ul style="margin:8px 0;padding-left:20px;color:#e5e5e7;">
<li>The <strong>response</strong> will be shown to the user</li>
<li>The <strong>actions</strong> array can be empty if no actions needed</li>
<li>Always use the action <strong>name</strong>, never the key, or id, just the name</li>
<li>Use <strong style="color:#0a84ff;">Board States</strong> to answer questions</li>
<li>If something is unavailable, suggest extending the board</li>
</ul>
`, '📋 Instructions');

        const instructionsReadOnly = customInstructionsReadOnly ?? htmlBox(`
<p>You are an assistant providing answers about an agent's state.</p>
<p>Use the <strong style="color:#0a84ff;">Board States</strong> to answer questions.</p>
<p>Answer in plain language, in the same language as the prompt.</p>
<p>Your answer will be sent to a human. Please don't use json or other things except markdown</p>
`, '📋 Instructions');

        // Build final prompt
        const message_prompt = allow_execution
            ? `${instructionsExecution}\n${boardActionsHtml}\n${allow_read ? boardStatesHtml : ''}\n${promptHtml}`
            : `${instructionsReadOnly}\n${boardStatesHtml}\n${promptHtml}`;

        // Debug mode: return prompt only
        if (debug) {
            return done({ prompt: message_prompt, response: null });
        }

        // Extract images and files from states
        let images: any[] = [];
        let files: any[] = [];
        if (getStatesByType) {
            images = await getStatesByType({ board: filteredStates, type: "frame", key: "frame" });
            files = await getStatesByType({ board: filteredStates, type: "file", key: "path" });
        }

        // Call the LLM
        const llmResponse = await prompt({
            message: message_prompt,
            conversation: getSystemPrompt({
                prompt: `You can analyze images provided in the same user turn.
Do NOT claim you cannot see images.
Answer following the JSON contract only (no code fences).`,
            }),
            images,
            files,
            board: boardName,
            card: name,
            log_ai_calls,
        });

        return done({ prompt: message_prompt, response: llmResponse });
    } catch (err: any) {
        return error(err);
    }
};

/**
 * Run AI Agent with system description and task plan
 * Executes claude-code with system context, specific plan, and user prompt
 *
 * System descriptions (data/systems/):
 * - "base": Basic board operations, runs from data/ directory
 * - "system": Full project access, runs from project root, uses CLAUDE.md and skills
 */
export const runAgent = async (options: {
    system?: string;
    plan?: string;
    prompt: string;
    boardName?: string;
    boardActions?: any[];
    board?: any;
    timeout?: number;
    onProgress?: (message: string) => void | Promise<void>;
    onSpawn?: (child: any) => void;
    onExit?: (child: any, code: number | null) => void;
}) => {
    const fs = require('fs');
    const path = require('path');

    const {
        system = 'base',
        plan = 'example',
        prompt: userPrompt,
        boardName = 'unknown',
        boardActions = [],
        board = {},
        timeout = 300000,
        onProgress,
        onSpawn,
        onExit
    } = options;

    // Get project root (process.cwd() is apps/vento, so go up 2 levels)
    const projectRoot = path.resolve(process.cwd(), '..', '..');

    // Read the system description (from data/systems/)
    const systemPath = path.join(projectRoot, 'data', 'systems', `${system}.md`);
    let systemContent = '';
    try {
        systemContent = fs.readFileSync(systemPath, 'utf-8');
    } catch (err) {
        return { error: `System description not found: ${systemPath}` };
    }

    // Read the task plan (from data/plans/)
    // Can be either a single .md file or a folder containing multiple plans
    const planFilePath = path.join(projectRoot, 'data', 'plans', `${plan}.md`);
    const planFolderPath = path.join(projectRoot, 'data', 'plans', plan);

    let planContent = '';
    let isPlanFolder = false;

    // Check if it's a folder first
    try {
        const stat = fs.statSync(planFolderPath);
        if (stat.isDirectory()) {
            isPlanFolder = true;
            // List all .md files in the folder
            const planFiles = fs.readdirSync(planFolderPath)
                .filter((f: string) => f.endsWith('.md'))
                .sort();

            if (planFiles.length === 0) {
                return { error: `Plan folder is empty: ${planFolderPath}` };
            }

            // Build a plan selection prompt
            const planDescriptions = planFiles.map((file: string) => {
                const filePath = path.join(planFolderPath, file);
                const content = fs.readFileSync(filePath, 'utf-8');
                const planName = file.replace('.md', '');
                // Extract first non-empty line as description
                const firstLine = content.split('\n').find((line: string) => line.trim() && !line.startsWith('#')) || 'No description';
                return `- **${planName}**: ${firstLine.substring(0, 150)}`;
            }).join('\n');

            planContent = `## Plan Selection Required

You have access to multiple plans in the "${plan}" folder. Based on the user's task below, choose the MOST APPROPRIATE plan and follow its instructions.

### Available Plans:
${planDescriptions}

### Instructions:
1. Read the user's task carefully
2. Choose the plan that best matches their intent
3. Read that plan file from \`data/plans/${plan}/<chosen-plan>.md\`
4. Follow the chosen plan's instructions to complete the task

**Important**: You MUST read the actual plan file before executing. The descriptions above are just summaries.`;
        }
    } catch (err) {
        // Not a folder, try as file
    }

    // If not a folder, try to read as a single file
    if (!isPlanFolder) {
        try {
            planContent = fs.readFileSync(planFilePath, 'utf-8');
        } catch (err) {
            return { error: `Plan not found: ${planFilePath} (also checked folder: ${planFolderPath})` };
        }
    }

    // Get board info for context
    const actionNames = boardActions.map(a => a.name).join(', ') || 'none';
    const valueNames = Object.keys(board).filter(k => !['name', 'cards', 'layouts'].includes(k)).join(', ') || 'none';

    const boardInfo = `## Current Context\n\nYou are running inside the board/agent: **${boardName}**\n\nAvailable actions: ${actionNames}\n\nBoard values: ${valueNames}\n`;

    // Build the full prompt
    const fullPrompt = `${systemContent}\n\n---\n\n${boardInfo}\n\n---\n\n# Task Plan\n\n${planContent}\n\n---\n\n# User Task\n\n${userPrompt}`;

    // Execute AI agent (async to not block event loop)
    const cliPath = path.join(projectRoot, 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js');
    const { spawn } = require('child_process');

    // Determine working directory and settings based on system type
    // - "system": Run from project root to pick up CLAUDE.md and .claude/skills/
    // - Others (like "base"): Run from data/ to avoid root project settings
    const isSystemMode = system === 'system';
    const agentWorkDir = isSystemMode ? projectRoot : path.join(projectRoot, 'data');

    // Build spawn arguments
    // Use stream-json format when we have a progress callback for real-time updates
    const useStreaming = !!onProgress;

    const spawnArgs = [
        cliPath,
        '--print',
        '--dangerously-skip-permissions',
        '--permission-mode', 'bypassPermissions'
    ];

    if (useStreaming) {
        spawnArgs.push('--output-format', 'stream-json', '--verbose');
    }

    // In non-system modes, avoid loading project settings (CLAUDE.md, .claude/)
    if (!isSystemMode) {
        spawnArgs.push('--setting-sources', 'user');
    }

    spawnArgs.push(fullPrompt);

    return new Promise((resolve) => {
        let stdout = '';
        let stderr = '';
        let finalResult = '';
        let lineBuffer = '';

        const child = spawn('node', spawnArgs, {
            cwd: agentWorkDir,
            stdio: ['ignore', 'pipe', 'pipe']  // ignore stdin so it doesn't wait for input
        });

        // Notify caller that process has spawned
        if (onSpawn) {
            try { onSpawn(child); } catch (e) { /* ignore callback errors */ }
        }

        child.stdout.on('data', (data) => {
            const chunk = data.toString();
            stdout += chunk;

            if (useStreaming && onProgress) {
                // Buffer incomplete lines for stream-json parsing
                lineBuffer += chunk;
                const lines = lineBuffer.split('\n');
                // Keep the last potentially incomplete line in the buffer
                lineBuffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const event = JSON.parse(line);
                        // Handle different event types from stream-json
                        if (event.type === 'assistant' && event.message?.content) {
                            // Assistant message with content blocks
                            for (const block of event.message.content) {
                                if (block.type === 'text' && block.text) {
                                    onProgress(block.text);
                                }
                            }
                        } else if (event.type === 'result' && event.result) {
                            // Final result
                            finalResult = event.result;
                        }
                    } catch (e) {
                        // Not valid JSON, might be plain text - send as-is
                        if (line.length > 10) {
                            onProgress(line);
                        }
                    }
                }
            } else if (onProgress) {
                // Non-streaming mode - split by lines
                const lines = chunk.split('\n').filter(line => line.trim());
                for (const line of lines) {
                    try {
                        onProgress(line);
                    } catch (e) {
                        // Ignore callback errors
                    }
                }
            }
        });

        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        child.on('error', (err) => {
            if (onExit) {
                try { onExit(child, null); } catch (e) { /* ignore callback errors */ }
            }
            resolve({ error: err.message });
        });

        child.on('close', (code) => {
            // Notify caller that process has exited
            if (onExit) {
                try { onExit(child, code); } catch (e) { /* ignore callback errors */ }
            }

            // Process any remaining buffered data
            if (useStreaming && lineBuffer.trim()) {
                try {
                    const event = JSON.parse(lineBuffer);
                    if (event.type === 'result' && event.result) {
                        finalResult = event.result;
                    }
                } catch (e) {}
            }

            if (code !== 0) {
                resolve({
                    error: 'AI Agent failed',
                    stderr,
                    stdout
                });
            } else {
                // For streaming mode, return the final result; otherwise return stdout
                resolve(useStreaming && finalResult ? finalResult : stdout);
            }
        });

        // Timeout after specified time
        setTimeout(() => {
            if (onExit) {
                try { onExit(child, null); } catch (e) { /* ignore callback errors */ }
            }
            child.kill();
            resolve({ error: 'AI Agent timed out' });
        }, timeout);
    });
};

export default {
    callModel,
    prompt,
    getSystemPrompt,
    cleanCode,
    processAgentResponse,
    processResponse,
    objectToXML,
    objectToHTML,
    htmlBox,
    aiAction,
    runAgent
};

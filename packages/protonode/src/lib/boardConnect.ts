
//import boardContext from 'app/bundles/boardContext'
const protobase = require('protobase')
const protonode = require('protonode')
const API = protobase.API
function toPath(path) {
    return path
        .replace(/\?\./g, ".")           // remove optional chaining
        .replace(/\[(["']?)(.*?)\1\]/g, ".$2") // convert [x] or ["x"] into .x
        .split(".")
        .filter(Boolean);
}

function getByPath(obj, path, def?) {
    return toPath(path).reduce((acc, key) => acc?.[key], obj) ?? def;
}

const castValueToType = (value, type, boardStates) => {
    switch (type) {
        case 'string':
            return String(value);
        case 'number':
            return Number(value);
        case 'boolean':
            return value === 'true' || value === true;
        case 'json':
            try {
                return JSON.parse(value);
            } catch (e) {
                return {};
            }
        case 'array':
            try {
                return JSON.parse(value);
            } catch (e) {
                return [];
            }
        case 'card':
            return value; // Assuming card is a string identifier
        case 'text':
            return value; // Assuming markdown is a string
        case "state":
            return JSON.stringify(getByPath(boardStates, value))
        default:
            return value; // Default case, return as is
    }
}

const isState = (value) => {
    if (typeof value !== 'string') return false;
    // check if value starts with 'board.' or board?. or board[ or board?.[
    return value.startsWith('board.') || value.startsWith('board?.') || value.startsWith('board[') || value.startsWith('board?.[');
}

const getStateName = (value) => {
    const statePath = toPath(value)
    return statePath[1]
}

export const resolveBoardParam = async ({ states, boardId, defaultValue, value, type, contextId = undefined, getContextState = undefined }) => {
    let resolved = false;

    if (value === undefined || value === null || value === '') {
        value = defaultValue
    }

    // create boardStates due state value starts with board.
    // When contextId is provided, we need to check context state first
    let boardStateData = states?.boards?.[boardId] ?? {};

    // If contextId is provided and getContextState function is available,
    // create a proxy that checks context first, then falls back to base state
    if (contextId && getContextState) {
        const baseState = boardStateData;
        boardStateData = new Proxy({}, {
            get(target, prop) {
                const propName = String(prop);
                const contextValue = getContextState(contextId, propName);
                if (contextValue !== undefined) {
                    return contextValue;
                }
                return baseState[propName];
            },
            has(target, prop) {
                const propName = String(prop);
                const contextValue = getContextState(contextId, propName);
                if (contextValue !== undefined) {
                    return true;
                }
                return propName in baseState;
            }
        });
    }

    const boardsStates = { board: boardStateData };

    if (isState(value)) {
        const stateName = getStateName(value);
        // Check if state exists (either in context or base state)
        const stateExists = contextId && getContextState
            ? (getContextState(contextId, stateName) !== undefined || (states?.boards?.[boardId] && states.boards[boardId][stateName] !== undefined))
            : (states?.boards?.[boardId] && states.boards[boardId][stateName] !== undefined);

        if (stateExists) {
            value = getByPath(boardsStates, value)
            resolved = true;
        } else {
            value = undefined;
            //console.warn('State ' + stateName + ' not found in board ' + boardId);
        }
    }

    value = castValueToType(value, type, boardsStates);
    return value;
}

export function boardConnect(run) {
    let context = {} as {
        actions: any;
        states: any;
        boardId: string;
    }
    let log = null

    const token = protonode.getServiceToken()
    const listeners = {}

    const onChange = ({ name, key = undefined, changed, inmediate = false }) => {
        if (!name && key) {
            console.warn('onChange called with key but no name, using key as name. key is a deprected parameter, please use name instead.');
            name = key;
        }
        if (!listeners[name]) {
            listeners[name] = [];
        }
        listeners[name].push(changed);
        if (inmediate) {
            changed(context.states[name]);
        }
    }

    async function execute_action({ name, board = undefined, params = {}, done = (result) => { }, error = (err) => { } }) {
        const targetBoard = board || context.boardId;
        console.log('Executing action boardConnect: ', name, 'on board:', targetBoard, 'params:', params);

        // If targeting a different board, call via API directly
        if (board && board !== context.boardId) {
            const url = `/api/core/v1/boards/${encodeURIComponent(board)}/actions/${encodeURIComponent(name)}`;
            const serviceToken = protonode.getServiceToken();
            try {
                const response = await API.post(url + '?token=' + serviceToken, params);
                if (response.isError) {
                    console.error('Error executing action on board ' + board + ': ', response.error);
                    error(response.error);
                    return;
                }
                done(response.data);
                return response.data;
            } catch (err) {
                console.error('Error executing action on board ' + board + ': ', err);
                error(err);
                return;
            }
        }

        // For current board, use registered actions
        const action = context.actions[name]
        if (!action) {
            error('Action not found: ' + name);
            console.error('Action not found: ', name);
            return;
        }
        const url = action.url


        console.log('Action: ', action)

        if (action.receiveBoard) {
            params['board'] = context.boardId;
        }
        //check if the action has configParams and if it does, check if the param is visible
        //if the param is not visible, hardcode the param value to the value in the configParams defaultValue
        if (action.configParams) {
            for (const param in action.configParams) {
                if (action.configParams && action.configParams[param]) {
                    params[param] = await resolveBoardParam({
                        states: context.states,
                        boardId: context.boardId,
                        defaultValue: action.configParams[param].defaultValue,
                        value: params[param],
                        type: action.configParams[param]?.type
                    });
                }
            }
        }
        if (action.method === 'post') {
            //@ts-ignore
            let { token, ...data } = params;
            if (action.token) {
                token = action.token
            }
            //console.log('url: ', url+'?token='+token)
            const response = await API.post(url + '?token=' + (token ? token : protonode.getServiceToken()), data);
            if (response.isError) {
                console.error('Error executing action: ', response.error);
                error(response.error);
                return;
            }
            done(response.data);
            return response.data
        } else {
            function toQueryString(params) {
                return Object.entries(params)
                    .filter(([, v]) => v !== undefined) // drop undefined
                    .map(([k, v]) => {
                        const val =
                            v !== null && typeof v === 'object'
                                ? JSON.stringify(v)
                                : String(v ?? ''); // null -> '', primitives -> string
                        return `${encodeURIComponent(k)}=${encodeURIComponent(val)}`;
                    })
                    .join('&');
            }

            const paramsStr = toQueryString(params);
            //console.log('url: ', url+'?token='+token+'&'+paramsStr)
            const response = await API.get(url + '?token=' + token + '&' + paramsStr);
            if (response.isError) {
                console.error('Error executing action: ', response.error);
                error(response.error);
                return;
            }
            done(response.data);
            return response.data
        }
    }

    process.on('message', (msg: any) => {
        if (msg.type === 'init') {
            // boardContext is now passed from the parent process via IPC
            // This avoids module resolution issues in forked processes
            const boardContext = msg.boardContext || {};
            context = msg.context;
            // console.log('[WORKER] Set state:', msg.states, 'and actions:', msg.actions, 'for board:', msg.boardId);
            log = console.log.bind(console, 'Board log [' + context.boardId + ']: ');
            try {
                run({ context: boardContext, ...context, board: { onChange, execute_action, log, id: context.boardId } });
            } catch (error) {
                console.error('Error running board [' + context.boardId + ']:', error);
            }
            // Confirm init was processed so parent can flush pending updates
            if (process.send) {
                process.send({ type: 'init_confirmed' });
            }
        } else if (msg.type === 'update') {
            // console.log(`[WORKER] Update received for chunk: ${msg.chunk}, key: ${msg.key}, value: ${msg.value}`);
            //msg.key is the key to update, msg.value is the new value
            const chunk = msg.chunk
            const key = msg.key
            const value = msg.value
            if (key) {
                context[chunk][key] = value;
                if (chunk == 'states' && listeners[key]) {
                    listeners[key].forEach(callback => callback(context.states[key]));
                }
            } else {
                context[chunk] = value;
            }
        }
    });
}
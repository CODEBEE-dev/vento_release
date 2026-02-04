if(params.reset) await executeAction({name: "reset"})

// If send_to_user exists, messages were already sent via streaming - send empty reply
const hasSendToUser = boardActions.some(a => a.name === 'send_to_user');
const response = hasSendToUser ? '' : params.response;

await executeAction({name: "agent_input", params: {action:'reply', response}})
return 'ok'

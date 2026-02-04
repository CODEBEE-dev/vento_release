import React from 'react';
import { MaskDefinition, buildAutoMask } from 'protolib/components/GenericMask';

const processResponse: MaskDefinition = {
  from: 'Board',
  id: 'chatgpt.processResponse',
  title: 'ChatGPT Process Response',
  category: 'AI',
  keywords: ['board', 'prompt', 'ai', 'llm', 'chatgpt'],
  context: 'context.chatgpt.processResponse',
  icon: 'sparkles',
  params: {
    response: {
      type: 'input',
      label: 'Response',
      initialValue: { value: '', kind: 'Identifier' },
    },
    execute_action: {
      type: 'input',
      label: 'Execute Action ?',
      initialValue: { value: 'execute_action', kind: 'Identifier' },
    },
    done: {
      type: 'output',
      label: 'Done',
      vars: ['response'],
    },
    error: {
      type: 'output',
      label: 'Error',
      vars: ['err'],
    },
  },
};

export default buildAutoMask(processResponse);
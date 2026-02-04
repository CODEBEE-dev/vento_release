import React from 'react';
import { MaskDefinition, buildAutoMask } from 'protolib/components/GenericMask';

const getAPIKey: MaskDefinition = {
  from: 'Board',
  id: 'chatgpt.getChatGPTApiKey',
  title: 'ChatGPT Get API Key',
  category: 'AI',
  keywords: ['board', 'prompt', 'ai', 'llm', 'chatgpt'],
  context: 'context.chatgpt.getChatGPTApiKey',
  icon: 'sparkles',
  params: {
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

export default buildAutoMask(getAPIKey);
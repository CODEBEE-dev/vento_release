import React from 'react';
import { MaskDefinition, buildAutoMask } from 'protolib/components/GenericMask';

const getSystemPrompt: MaskDefinition = {
  from: 'Board',
  id: 'chatgpt.getSystemPrompt',
  title: 'Get System Prompt',
  category: 'AI',
  keywords: ['board', 'prompt', 'ai', 'llm', 'chatgpt', 'system'],
  context: 'context.chatgpt.getSystemPrompt',
  icon: 'sparkles',
  params: {
    prompt: {
      type: 'input',
      label: 'Prompt',
      initialValue: { value: '', kind: 'StringLiteral' },
    },
    done: {
      type: 'output',
      label: 'Done',
      vars: ['prompt'],
    },
    error: {
      type: 'output',
      label: 'Error',
      vars: ['err'],
    },
  },
};

export default buildAutoMask(getSystemPrompt);
import React from 'react';
import { MaskDefinition, buildAutoMask } from 'protolib/components/GenericMask';

const promptMask: MaskDefinition = {
  from: 'Board',
  id: 'chatgpt.prompt',
  title: 'ChatGPT Prompt',
  category: 'AI',
  keywords: ['board', 'prompt', 'ai', 'llm', 'chatgpt'],
  context: 'context.chatgpt.prompt',
  icon: 'sparkles',
  params: {
    message: {
      type: 'input',
      label: 'Message',
      initialValue: { value: '', kind: 'StringLiteral' },
    },
    conversation: {
      type: 'input',
      label: 'Conversation ?',
      initialValue: { value: '', kind: 'Identifier' },
    },
    images: {
      type: 'input',
      label: 'Images ?',
      initialValue: { value: '', kind: 'Identifier' },
    },
    files: {
      type: 'input',
      label: 'Files ?',
      initialValue: { value: '', kind: 'Identifier' },
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

export default buildAutoMask(promptMask);
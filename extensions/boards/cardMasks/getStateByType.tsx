import React from 'react';
import { MaskDefinition, buildAutoMask } from 'protolib/components/GenericMask';

const getStateByType: MaskDefinition = {
  from: 'Board',
  id: 'board.getStateByType',
  title: 'Get board states by types',
  category: 'board',
  keywords: ['board', 'state', 'type', 'states'],
  context: 'context.boards.getStatesByType',
  icon: 'sparkles',
  params: {
    board: {
      type: 'input',
      label: 'Board',
      initialValue: { value: '', kind: 'StringLiteral' },
    },
    type: {
      type: 'input',
      label: 'Type',
      initialValue: { value: '', kind: 'StringLiteral' },
    },
    key: {
      type: 'input',
      label: 'Key',
      initialValue: { value: '', kind: 'StringLiteral' },
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

export default buildAutoMask(getStateByType);
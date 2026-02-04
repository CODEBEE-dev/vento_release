import React, { memo } from 'react';
import { connectItem, dumpConnection, PORT_TYPES, DumpType } from '../lib/Node';
import Node, { Field, FlowPort, NodeParams } from '../Node';
import { DataOutput } from '../lib/types';
import { AlertOctagon } from '@tamagui/lucide-icons';
import { useNodeColor } from '../diagram/Theme';

const ThrowStatement = (node) => {
  const { id, type } = node;
  const color = useNodeColor(type);

  const nodeParams: Field[] = [
    { label: 'Expression', field: 'error', type: 'input', description: 'Expression to throw, e.g. new Error(msg)' }
  ];

  return (
    <Node
      icon={AlertOctagon}
      node={node}
      isPreview={!id}
      title="throw"
      id={id}
      color={color}
      dataOutput={DataOutput.flow}
    >
      <NodeParams id={id} params={nodeParams} />
      <FlowPort id={id} type="input" label="Flow" style={{ top: '60px' }} handleId={'in'} />
    </Node>
  );
};

ThrowStatement.category = 'error control';
ThrowStatement.keywords = ['throw', 'error', 'exception'];
ThrowStatement.dataOutput = DataOutput.flow;

ThrowStatement.getData = (node, data, nodesData, edges) => {
  return {
    error: connectItem(node.getExpression?.(), 'output', node, 'error', data, nodesData, edges, 'error')
  };
};

ThrowStatement.dump = (node, nodes, edges, nodesData, metadata = null, enableMarkers = false, dumpType: DumpType = 'partial', level = 0) => {
  const data = nodesData[node.id] ?? {};

  let expr =
    dumpConnection(node, 'target', 'error', PORT_TYPES.data, data?.error ?? '', edges, nodes, nodesData, metadata, enableMarkers, dumpType, level) ||
    (typeof data.error === 'string' ? data.error.trim() : '');

  const code = `throw ${expr}`.trim();

  return code + dumpConnection(node, 'source', 'output', PORT_TYPES.flow, '', edges, nodes, nodesData, metadata, enableMarkers, dumpType, level);
};

export default memo(ThrowStatement);

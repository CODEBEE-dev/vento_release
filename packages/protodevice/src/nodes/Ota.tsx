import { Node, Field, NodeParams } from 'protoflow';
import { getColor } from '.';

const Ota = ({ node = {}, nodeData = {}, children, color }: any) => {
  const nodeParams: Field[] = [] as Field[]

  return (
    <Node node={node} isPreview={!node.id} title='OTA' color={color} id={node.id} skipCustom={true} disableInput disableOutput>
      <NodeParams id={node.id} params={nodeParams} />
    </Node>
  )
}

export default {
  id: 'Ota',
  type: 'CallExpression',
  category: "connectivity",
  keywords: ["ota", "wifi", "update", "over the air", "firmware", "device"],
  check: (node, nodeData) => node.type == "CallExpression" && nodeData.to?.startsWith('ota'),
  getComponent: (node, nodeData, children) => <Ota color={getColor('Ota')} node={node} nodeData={nodeData} children={children} />,
  getInitialData: () => { return { to: 'ota' } }
}

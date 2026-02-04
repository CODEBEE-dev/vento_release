import React, { useContext } from "react";
import { Node, Field, NodeParams, FlowStoreContext } from 'protoflow';
import { getColor } from ".";

const TCS34725 = ({ node = {}, nodeData = {}, children, color }: any) => {
    const [name, setName] = React.useState(nodeData['param-1'])
    const nameErrorMsg = 'Reserved name'
    const intervalErrorMsg = 'Add units h/m/s/ms'
    const useFlowsStore = useContext(FlowStoreContext)
    const metadata = useFlowsStore(state => state.metadata)
    const ports = metadata.board.ports
    const nodeParams: Field[] = [
        {
            label: 'Name', static: true, field: 'param-1', type: 'input', onBlur: () => { setName(nodeData['param-1']) },
            error: nodeData['param-1']?.value?.replace(/['"]+/g, '') == 'tcs34725' ? nameErrorMsg : null
        },
        {
            label: 'i2c bus id', static: true, field: 'param-2', type: 'input',
        },
        {
            label: 'Address', static: true, field: 'param-3', type: 'input',
        },
        {
            label: 'Glass attenuation factor', static: true, field: 'param-4', type: 'input',
        },
        {
            label: 'Update Interval', static: true, field: 'param-5', type: 'input',
            error: !['h', 'm', 's', 'ms'].includes(nodeData['param-5']?.value?.replace(/['"0-9]+/g, '')) ? intervalErrorMsg : null
        },
    ] as Field[]
    return (
        <Node node={node} isPreview={!node.id} title='TCS34725 Color Sensor' color={color} id={node.id} skipCustom={true} >
            <NodeParams id={node.id} params={nodeParams} />
        </Node>
    )
}

export default {
    id: 'TCS34725',
    type: 'CallExpression',
    category: "sensor",
    keywords: ["i2c", "rgb", "tcs34725", "color"],
    check: (node, nodeData) => node.type == "CallExpression" && nodeData.to?.startsWith('tcs34725'),
    getComponent: (node, nodeData, children) => <TCS34725 color={getColor('tcs34725')} node={node} nodeData={nodeData} children={children} />,
    getInitialData: () => {
        return {
            to: 'tcs34725',
            "param-1": { value: "", kind: "StringLiteral" },
            "param-2": { value: "", kind: "StringLiteral" },
            "param-3": { value: "0x29", kind: "StringLiteral" },
            "param-4": { value: "1.0", kind: "NumericLiteral" },
            "param-5": { value: "30s", kind: "StringLiteral" },
        }
    }
}
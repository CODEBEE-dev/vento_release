import React, { useContext } from "react";
import { Node, Field, NodeParams, FlowStoreContext } from 'protoflow';
import { getColor } from ".";

const GPS = ({ node = {}, nodeData = {}, children, color }: any) => {
    const [name, setName] = React.useState(nodeData['param-1'])
    const nameErrorMsg = 'Reserved name'
    const intervalErrorMsg = 'Add units h/m/s/ms'
    const useFlowsStore = useContext(FlowStoreContext)
    const metadata = useFlowsStore(state => state.metadata)
    const ports = metadata.board.ports
    const nodeParams: Field[] = [
        {
            label: 'Name', static: true, field: 'param-1', type: 'input', onBlur: () => { setName(nodeData['param-1']) },
            error: nodeData['param-1']?.value?.replace(/['"]+/g, '') == 'gps' ? nameErrorMsg : null
        },
        {
            label: 'UART bus id', static: true, field: 'param-2', type: 'input',
        },
        {
            label: 'Update Interval', static: true, field: 'param-3', type: 'input',
            error: !['h', 'm', 's', 'ms'].includes(nodeData['param-3']?.value?.replace(/['"0-9]+/g, '')) ? intervalErrorMsg : null
        },
    ] as Field[]
    return (
        <Node node={node} isPreview={!node.id} title='GPS' color={color} id={node.id} skipCustom={true} >
            <NodeParams id={node.id} params={nodeParams} />
        </Node>
    )
}

export default {
    id: 'GPS',
    type: 'CallExpression',
    category: "sensor",
    keywords: ["i2c", "uart", "expansor", "gps", "dfr0627"],
    check: (node, nodeData) => node.type == "CallExpression" && nodeData.to?.startsWith('gps'),
    getComponent: (node, nodeData, children) => <GPS color={getColor('gps')} node={node} nodeData={nodeData} children={children} />,
    getInitialData: () => {
        return {
            to: 'gps',
            "param-1": { value: "", kind: "StringLiteral" },
            "param-2": { value: "", kind: "StringLiteral" },
            "param-3": { value: "30s", kind: "StringLiteral" },
        }
    }
}
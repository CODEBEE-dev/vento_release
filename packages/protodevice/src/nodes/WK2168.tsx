import React, { useContext } from "react";
import { Node, Field, NodeParams, FlowStoreContext } from 'protoflow';
import { getColor } from ".";

const WK2168 = ({ node = {}, nodeData = {}, children, color }: any) => {
    const [name, setName] = React.useState(nodeData['param-1'])
    const nameErrorMsg = 'Reserved name'
    const intervalErrorMsg = 'Add units h/m/s/ms'
    const useFlowsStore = useContext(FlowStoreContext)
    const metadata = useFlowsStore(state => state.metadata)
    const ports = metadata.board.ports
    const nodeParams: Field[] = [
        {
            label: 'Name', static: true, field: 'param-1', type: 'input', onBlur: () => { setName(nodeData['param-1']) },
            error: nodeData['param-1']?.value?.replace(/['"]+/g, '') == 'wk2168_i2c' ? nameErrorMsg : null
        },
        {
            label: 'i2c bus name', static: true, field: 'param-2', type: 'input',
        },
        {
            label: 'Address', static: true, field: 'param-3', type: 'input',
        },
        {
            label: 'UART1 Name', static: true, field: 'param-4', type: 'input',
        },
        {
            label: 'UART1 baud rate', static: true, field: 'param-5', type: 'input',
        },
        {
            label: 'UART2 Name', static: true, field: 'param-6', type: 'input',
        },
        {
            label: 'UART2 baud rate', static: true, field: 'param-7', type: 'input',
        },
    ] as Field[]
    return (
        <Node node={node} isPreview={!node.id} title='WK2168 UART expansor' color={color} id={node.id} skipCustom={true} >
            <NodeParams id={node.id} params={nodeParams} />
        </Node>
    )
}

export default {
    id: 'WK2168',
    type: 'CallExpression',
    category: "bus",
    keywords: ["i2c", "uart", "expansor", "wk2168", "dfr0627"],
    check: (node, nodeData) => node.type == "CallExpression" && nodeData.to?.startsWith('wk2168'),
    getComponent: (node, nodeData, children) => <WK2168 color={getColor('WK2168')} node={node} nodeData={nodeData} children={children} />,
    getInitialData: () => {
        return {
            to: 'wk2168',
            "param-1": { value: "", kind: "StringLiteral" },
            "param-2": { value: "", kind: "StringLiteral" },
            "param-3": { value: "0x70", kind: "StringLiteral" },
            "param-4": { value: "myuart1", kind: "StringLiteral" },
            "param-5": { value: "9600", kind: "StringLiteral" },
            "param-6": { value: "myuart2", kind: "StringLiteral" },
            "param-7": { value: "9600", kind: "StringLiteral" }

        }
    }
}
import React, { useContext } from "react";
import { Node, Field, NodeParams, FlowStoreContext } from 'protoflow';
import { getColor } from ".";

const MPU6050 = ({ node = {}, nodeData = {}, children, color }: any) => {
    const [name, setName] = React.useState(nodeData['param-1'])
    const nameErrorMsg = 'Reserved name'
    const intervalErrorMsg = 'Add units h/m/s/ms'
    const useFlowsStore = useContext(FlowStoreContext)
    const metadata = useFlowsStore(state => state.metadata)
    const ports = metadata.board.ports
    const nodeParams: Field[] = [
        {
            label: 'Name', static: true, field: 'param-1', type: 'input', onBlur: () => { setName(nodeData['param-1']) },
            error: nodeData['param-1']?.value?.replace(/['"]+/g, '') == 'mpu6050' ? nameErrorMsg : null
        },
        {
            label: 'i2c bus name', static: true, field: 'param-2', type: 'input',
        },
        {
            label: 'Address', static: true, field: 'param-3', type: 'input',
        },
        {
            label: 'Update Interval', static: true, field: 'param-4', type: 'input',
            error: !['h', 'm', 's', 'ms'].includes(nodeData['param-4']?.value?.replace(/['"0-9]+/g, '')) ? intervalErrorMsg : null
        },
        {
            label: 'Int Pin', static: true, field: 'param-5', type: 'select',
            data: ports.filter(port => port.type.includes('I') && !['EN', '36', '39', 'CLK', 'TX', 'RX'].includes(port.name)).map(port => port.name)
        },
        {
            label: 'Motion threshold (0-255)', static: true, field: 'param-6', type: 'input',
        },
        {
            label: 'Motion duration (ms)', static: true, field: 'param-7', type: 'input',
        }
    ] as Field[]
    return (
        <Node node={node} isPreview={!node.id} title='MPU6050 Interrupt' color={color} id={node.id} skipCustom={true} >
            <NodeParams id={node.id} params={nodeParams} />
        </Node>
    )
}

export default {
    id: 'MPU6050Interrupt',
    type: 'CallExpression',
    category: "sensors",
    keywords: ["i2c","mpu6050", "gyroscope", "accelerometer", "balancing", "device", "interrupt"],
    check: (node, nodeData) => node.type == "CallExpression" && nodeData.to?.startsWith('mpu6050interrupt'),
    getComponent: (node, nodeData, children) => <MPU6050 color={getColor('MPU6050Interrupt')} node={node} nodeData={nodeData} children={children} />,
    getInitialData: () => { return { to: 'mpu6050interrupt', 
        "param-1": { value: "", kind: "StringLiteral" }, 
        "param-2": { value: "", kind: "StringLiteral" }, 
        "param-3": { value: "0x68", kind: "StringLiteral" }, 
        "param-4": { value: "30s", kind: "StringLiteral" },
        "param-5": { value: "", kind: "StringLiteral" },
        "param-6": { value: "100", kind: "StringLiteral" },
        "param-7": { value: "5", kind: "StringLiteral" }

    } }
}
import React from "react";
import {Node, Field, NodeParams } from 'protoflow';
import { getColor } from ".";

const INA260 = ({node= {}, nodeData= {}, children, color}: any) => {
    const [name,setName] = React.useState(nodeData['param1'])

    const nodeParams: Field[] = [
        {
            label: 'Name', static: true, field: 'param-1', type: 'input', onBlur:()=>{setName(nodeData['param1'])},
            error: nodeData['param1']?.replace(/['"]+/g, '') == 'i2c' ? 'Reserved name' : null
        },
        {
            label: 'Address', static: true, field: 'param-2', type: 'input', 
        },
        {
            label: 'i2c bus name', static: true, field: 'param-3', type: 'input', 
        },
        {
            label: 'Update Interval', static: true, field: 'param-4', type: 'input',
            error: !['h', 'm', 's', 'ms'].includes(nodeData['param-4']?.value?.replace(/['"0-9]+/g, '')) ? 'Add units h/m/s/ms' : null
        }
    ] as Field[]
    return (
        <Node node={node} isPreview={!node.id} title='INA260' color={color} id={node.id} skipCustom={true}>
            <NodeParams id={node.id} params={nodeParams} />
        </Node>
    ) 
}

export default {
    id: 'INA260',
    type: 'CallExpression',
    category: "sensors",
    keywords: ["analog", "INA260", "adc","sensor","current", "voltage", "power", "i2c", "device"],
    check: (node, nodeData) => node.type == "CallExpression" && nodeData.to?.startsWith('ina260'),
    getComponent: (node, nodeData, children) => <INA260 color={getColor('INA260')} node={node} nodeData={nodeData} children={children} />,
    getInitialData: () => { 
        return { 
            to: 'ina260',
            "param-1": { value: "", kind: "StringLiteral" },
            "param-2": { value: "0x40", kind: "StringLiteral" },
            "param-3": { value: "", kind: "StringLiteral" },
            "param-4": { value: "60s", kind: "StringLiteral" } 
        }
    }
}
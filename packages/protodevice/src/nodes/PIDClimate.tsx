import React, { useContext } from "react";
import { Node, Field, NodeParams, FlowStoreContext } from "protoflow";
import { getColor } from ".";

const tempRegex = /^\s*-?\d+(\.\d+)?\s*°C\s*$/i; // e.g., "25°C", "25.0°C", "-0.5°C"
const posTempRegex = /^\s*\d+(\.\d+)?\s*°C\s*$/i; // e.g., "25°C", "25.0°C"
const isNumeric = (v: any) =>
    (typeof v === "number" && !Number.isNaN(v)) ||
    (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v)));

const PIDClimate = ({ node = {}, nodeData = {}, children, color }: any) => {
    const [name, setName] = React.useState(nodeData["param-1"]);
    const nameErrorMsg = "Reserved name";
    const sensorRequiredMsg = "Sensor is required";
    const tempErrorMsg = "Use number + °C (e.g., 25°C)";
    const pidNumberMsg = "Must be a number";
    const deadbandErrorMsg = "Use signed number + °C (e.g., -0.5°C)";

    const useFlowsStore = useContext(FlowStoreContext);
    const metadata = useFlowsStore((state: any) => state.metadata);

    const param = (k: string) => nodeData?.[k]?.value;

    const nameVal =
        typeof param("param-1") === "string"
            ? param("param-1")?.replace(/['"]+/g, "")
            : param("param-1");

    const defaultTarget = param("param-5");
    const kp = param("param-6");
    const ki = param("param-7");
    const kd = param("param-8");
    const dbHigh = param("param-9");
    const dbLow = param("param-10");

    const nodeParams: Field[] = [
        {
            label: "Name",
            static: true,
            field: "param-1",
            type: "input",
            onBlur: () => {
                setName(nodeData["param-1"]);
            },
            error: ["climate", "pid"].includes(nameVal?.toLowerCase?.()) ? nameErrorMsg : null,
        },
        {
            label: "Sensor",
            static: true,
            field: "param-2",
            type: "input",
            error:
                (param("param-2") === undefined ||
                    (typeof param("param-2") === "string" && param("param-2").trim() === "")) ?
                    sensorRequiredMsg : null,
        },
        {
            label: "Heat output",
            static: true,
            field: "param-3",
            type: "input",
        },
        {
            label: "Cool output",
            static: true,
            field: "param-4",
            type: "input",
        },
        {
            label: "Default target temperature",
            static: true,
            field: "param-5",
            type: "input",
            error:
                typeof defaultTarget === "string" && posTempRegex.test(defaultTarget)
                    ? null
                    : tempErrorMsg,
        },
        {
            label: "kp",
            static: true,
            field: "param-6",
            type: "input",
            error: isNumeric(kp) ? null : pidNumberMsg,
        },
        {
            label: "ki",
            static: true,
            field: "param-7",
            type: "input",
            error: isNumeric(ki) ? null : pidNumberMsg,
        },
        {
            label: "kd",
            static: true,
            field: "param-8",
            type: "input",
            error: isNumeric(kd) ? null : pidNumberMsg,
        },
        {
            label: "Deadband threshold high",
            static: true,
            field: "param-9",
            type: "input",
            error:
                typeof dbHigh === "string" && tempRegex.test(dbHigh) ? null : deadbandErrorMsg,
        },
        {
            label: "Deadband threshold low",
            static: true,
            field: "param-10",
            type: "input",
            error:
                typeof dbLow === "string" && tempRegex.test(dbLow) ? null : deadbandErrorMsg,
        },
    ] as Field[];

    return (
        <Node
            node={node}
            isPreview={!node.id}
            title="PID Climate Control"
            color={color}
            id={node.id}
            skipCustom={true}
        >
            <NodeParams id={node.id} params={nodeParams} />
        </Node>
    );
};

export default {
    id: "PIDCClimate",
    type: "CallExpression",
    category: "sensor",
    keywords: ["i2c", "rgb", "pid", "climate"],
    check: (node: any, nodeData: any) =>
        node.type == "CallExpression" && nodeData.to?.startsWith("pidClimate"),
    getComponent: (node: any, nodeData: any, children: any) => (
        <PIDClimate
            color={getColor("pidClimate")}
            node={node}
            nodeData={nodeData}
            children={children}
        />
    ),
    getInitialData: () => {
        return {
            to: "pidClimate",
            "param-1": { value: "mypid", kind: "StringLiteral" }, // Name
            "param-2": { value: "", kind: "StringLiteral" }, // Sensor
            "param-3": { value: "", kind: "StringLiteral" }, // Heat output
            "param-4": { value: "", kind: "StringLiteral" }, // Cool output
            "param-5": { value: "25°C", kind: "StringLiteral" }, // Default target temperature
            "param-6": { value: 0.0, kind: "NumericLiteral" }, // kp
            "param-7": { value: 0.0, kind: "NumericLiteral" }, // ki
            "param-8": { value: 0.0, kind: "NumericLiteral" }, // kd
            "param-9": { value: "0.5°C", kind: "StringLiteral" }, // Threshold high
            "param-10": { value: "-0.5°C", kind: "StringLiteral" }, // Threshold low
        };
    },
};

import { Panel, PanelGroup } from "react-resizable-panels";
import { XStack, YStack, useTheme } from "@my/ui";
import { Tinted } from "../../components/Tinted";
import CustomPanelResizeHandle from "../MainPanel/CustomPanelResizeHandle";
import { useThemeSetting } from '@tamagui/next-theme'
import { useMemo, useRef, useState } from "react";
import { useSettingValue } from "@extensions/settings/hooks";
import { CodeView } from '@extensions/files/intents';
import { ActionsAndStatesPanel } from "./ActionsAndStatesPanel";
import { SelectList } from "../../components/SelectList";

/**
 * A partir de un objeto JS, genera una declaración TS
 * con todas las propiedades opcionales y arrays tipados.
 */
function generateStatesDeclaration(name, statesObj: any): string {
    function inferType(value: any): string {
        if (value === null || value === undefined) {
            return 'any';
        }
        switch (typeof value) {
            case 'string': return 'string';
            case 'number': return 'number';
            case 'boolean': return 'boolean';
            case 'function': return '(...args: any[]) => any';
        }
        if (Array.isArray(value)) {
            // Inferir tipo de elementos y unificarlos si hay varios
            const types = Array.from(new Set(value.map(inferType)));
            const itemType = types.length > 0
                ? types.join(' | ')
                : 'any';
            return `Array<${itemType}>`;
        }
        // Objeto: todas las claves opcionales
        const props = Object.entries(value).map(([key, val]) => {
            const t = inferType(val);
            // notación "key"?: type
            return `"${key}"?: ${t}`;
        });
        return `{ ${props.join('; ')} }`;
    }

    const tsType = inferType(statesObj);
    return `declare const ${name}: ${tsType};`;
}



const generateParamsDeclaration = (cardData) => {
    if (!cardData.params || Object.keys(cardData.params).length === 0) return '';

    const params = Object.entries(cardData.params).map(([key, value]) => {
        return `\t"${key}": ${typeof value === 'string' ? `'${value}'` : value}, // ${value}`;
    }).join('\n');

    return `declare const params: {\n${params}\n};`;
}

export const AutopilotEditor = ({ cardData, board, panels = ['actions', 'states'], actions, states, rules, rulesCode, setRulesCode, value, valueReady = true, setRules, rulesConfig = {}, readOnly = false }) => {
    const { resolvedTheme } = useThemeSetting()
    const isAIEnabled = useSettingValue('ai.enabled', false);
    const [rulesMode, setRulesMode] = useState(null)

    const declarations = useMemo(() => {
        const decl = generateStatesDeclaration('states', { board: states });
        return `
${decl}
${cardData.type == 'action' ? `declare function executeAction({name: string, params?: Record<string, any>}): void;` : ''}
${cardData.type == 'action' ? generateParamsDeclaration(cardData) : ''}`
    }, [states, cardData]);


    const theme = useTheme()
    const editedCode = useRef(rulesCode ?? 'return;')

    // const isPlainHTML = rulesCode?.trim().startsWith('<')

    const flows = useMemo(() => {
        return <CodeView
            rulesProps={{ title: `Card Rules`, allowParams: true, availableParams: Object.keys(cardData?.params ?? {}) }}
            pathname={cardData.type == 'action' ? '/rules' : '/observerCard'}
            onApplyRules={async (rules) => {
                return await setRules(rules)
            }}
            disableAIPanels={!isAIEnabled || cardData.editRulesInNaturalLanguage === false}
            disableFlowMode={cardData.editRulesInLowCode === false}
            defaultMode={isAIEnabled ? 'rules' : 'code'}
            rules={rules}
            viewPort={{ x: 20, y: window.innerHeight / 8, zoom: 0.8 }}
            onFlowChange={(code) => {
                editedCode.current = code
                setRulesCode(code)
            }}
            onCodeChange={(code) => {
                editedCode.current = code
                setRulesCode(code)
            }}
            // disableFlowMode={isPlainHTML}
            path={cardData.name + (rulesCode && rulesCode.trim && rulesCode.trim().startsWith('<') ? '.html' : '.ts')}
            flowsPath={cardData.name}
            sourceCode={editedCode}
            rulesConfig={rulesConfig}
            monacoOnMount={(editor, monaco) => {
                monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions?.({
                    // noSemanticValidation: false,
                    // noSyntaxValidation: false,
                    // @ts-ignore
                    diagnosticCodesToIgnore: [1375, 1108],
                });
                monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
                    target: monaco.languages.typescript.ScriptTarget.ESNext,
                    module: monaco.languages.typescript.ModuleKind.None,
                    allowNonTsExtensions: true,
                    allowJs: true,
                    allowSyntheticDefaultImports: true,
                    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
                    noEmit: true,
                    typeRoots: ["node_modules/@types"],
                    allowUmdGlobalAccess: true,
                    resolveJsonModule: true,
                    isolatedModules: false,
                    useDefineForClassFields: true,
                    lib: ["esnext"],
                })
                monaco.languages.typescript.typescriptDefaults.addExtraLib(
                    declarations,
                    'ts:filename/customTypes.d.ts'
                );
            }}
            monacoOptions={{
                folding: true,
                lineDecorationsWidth: 0,
                lineNumbersMinChars: 0,
                lineNumbers: true,
                minimap: { enabled: false }
            }}
            onModeChange={(currMode) => setRulesMode(currMode)}
            readOnly={readOnly}
        />
    }, [resolvedTheme, board.name, theme, isAIEnabled, rulesConfig["enabled"], rulesConfig["loading"], cardData.returnType, readOnly]);

    return (
        <PanelGroup direction="horizontal">
            <Panel defaultSize={70} minSize={20}>
                <YStack flex={1} height="100%" borderRadius="$3" gap="$2" overflow="hidden" >
                    <Tinted>{flows}</Tinted>
                </YStack>
            </Panel>

            <CustomPanelResizeHandle direction="vertical" borderLess={false} borderColor="var(--gray4)" />

            <ActionsAndStatesPanel type="card" board={board} panels={panels} actions={actions} states={states} copyMode={rulesMode} showActionsTabs showStatesTabs />
        </PanelGroup>
    );
};

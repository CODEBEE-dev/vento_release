
import { API } from 'protobase'
import { YStack, XStack, useToastController, useTheme } from '@my/ui'
import { Tinted } from '../../components/Tinted'
import { useRef, useMemo } from 'react'
import { Panel, PanelGroup } from "react-resizable-panels";
import CustomPanelResizeHandle from '../MainPanel/CustomPanelResizeHandle'
import { useSettingValue } from "@extensions/settings/hooks";
import { CodeView } from '@extensions/files/intents';
import { Save } from '@tamagui/lucide-icons'
import { ComponentCodeGeneration } from './ComponentCodeGeneration'

export const UISideMenu = ({ leftIcons = <></>, icons = <></>, uiCode, boardRef, board, actions, states, resolvedTheme, onChange, readOnly = false }) => {
    const boardStates = states?.boards ? states.boards[board.name] : {}
    const boardActions = actions?.boards ? actions.boards[board.name] : {}

    const savedCode = useRef(uiCode.code)
    const editedCode = useRef(uiCode.code)
    const editorRef = useRef<any>(null);
    const toast = useToastController()
    const isAIEnabled = useSettingValue('ai.enabled', false);

    function handleEditorMount(editor: any) {
        editorRef.current = editor;
    }

    const theme = useTheme()
    const flows = useMemo(() => {
        return <CodeView
            onApplyRules={async (rules) => {
                if (readOnly) return
                try {
                    const rulesCode = await API.post(`/api/core/v1/autopilot/getBoardCode`, { rules: rules, states: boardStates, actions: actions.boards ? actions.boards[board.name] : {}, boardName: board.name })
                    boardRef.current.rules = rules
                    if (rulesCode.error || !rulesCode.data?.jsCode) {
                        toast.show(`Error generating board code: ${rulesCode.error}`)
                        return
                    }

                    savedCode.current = rulesCode.data.jsCode
                    editedCode.current = rulesCode.data.jsCode
                    await API.post(`/api/core/v1/boards/${board.name}`, boardRef.current)
                } catch (e) {
                    toast.show(`Error generating board code: ${e.message}`)
                    console.error(e)
                }
            }}
            disableAIPanels={true}
            disableFlowMode={true}
            defaultMode={'code'}
            leftIcons={
                <XStack gap="$3" pl="$2">
                    {leftIcons}
                </XStack>
            }
            icons={<XStack gap="$3">
                {icons}
                <XStack
                    p="$2"
                    pr="$3"
                    cursor={readOnly ? 'default' : 'pointer'}
                    onPress={() => {
                        if (readOnly) return;
                        API.post(`/api/core/v1/boards/${board.name}/uicode`, { code: editedCode.current })
                        onChange ? onChange(editedCode.current) : null
                    }}
                    o={readOnly ? 0.5 : 0.8}
                    pressStyle={readOnly ? undefined : { opacity: 0.8 }}
                    ml="$5"
                    hoverStyle={readOnly ? undefined : { opacity: 1 }}
                >
                    <Save size="$1" color="var(--color)" />
                </XStack>
            </XStack>}
            viewPort={{ x: 20, y: window.innerHeight / 8, zoom: 0.8 }}
            onFlowChange={(code) => {
                if (readOnly) return;
                editedCode.current = code
            }}
            onCodeChange={(code) => {
                if (readOnly) return;
                editedCode.current = code
            }}
            path={board.name + '_ui.jsx'}
            sourceCode={editedCode}
            monacoOptions={{
                folding: true,
                lineDecorationsWidth: 0,
                lineNumbersMinChars: 0,
                lineNumbers: true,
                minimap: { enabled: false }
            }}
            monacoProps={{
                onMount: handleEditorMount
            }}
            readOnly={readOnly}
        />
    }, [resolvedTheme, board.name, theme, editedCode.current, isAIEnabled]);
    return <Tinted>
        <YStack f={1} pb="$4">
            <PanelGroup direction="horizontal">
                <Panel defaultSize={67}>
                    <YStack f={1} h="100%">
                        {flows}
                    </YStack>
                </Panel>
                <CustomPanelResizeHandle direction="vertical" />
                {isAIEnabled
                    ? <Panel defaultSize={30} minSize={25} style={{ paddingTop: "32px" }}>
                        <YStack h="100%" f={1} o={readOnly ? 0.6 : 1} pointerEvents={readOnly ? "none" : "auto"}>
                            <ComponentCodeGeneration
                                setHTMLCode={c => {
                                    if (readOnly) return;
                                    if (editorRef.current) {
                                        editorRef.current.setValue(c); // clean editor
                                    }
                                }}
                                htmlCode={uiCode.code} />
                        </YStack>
                    </Panel>
                    : <></>
                }
            </PanelGroup>
        </YStack>
    </Tinted>
}

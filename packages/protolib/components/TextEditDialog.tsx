import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { XStack, YStack, TextArea, StackProps } from "@my/ui";
import { AlertDialog } from "./AlertDialog";
import { Tinted } from "./Tinted";
import { Monaco } from "./Monaco";
import { v4 as uuid } from "uuid";
import { useThemeSetting } from "@tamagui/next-theme";
import { Markdown } from "./Markdown";

type TextEditDialogContextValue = {
    open: boolean;
    setOpen: (v: boolean) => void;
    tempValue: string;
    setTempValue: (v: string) => void;
};

const TextEditDialogContext = createContext<TextEditDialogContextValue | null>(null);

function useTextEditDialogCtx() {
    const ctx = useContext(TextEditDialogContext);
    if (!ctx) throw new Error("TextEditDialog.* debe usarse dentro de <TextEditDialog>.");
    return ctx;
}

type RootProps = { children: React.ReactNode } & StackProps;

type EditorProps = {
    value: string;
    readValue?: () => string;
    onChange: (value: string) => void;
    placeholder?: string;
    textAreaProps?: Partial<React.ComponentProps<typeof TextArea>>;
    type: "text" | "markdown" | "html";
};

type TriggerProps = { children: React.ReactNode } & StackProps;

const Root = ({ children, ...props }: RootProps) => {
    const [open, setOpen] = useState(false);
    const [tempValue, setTempValue] = useState("");

    const ctx = useMemo(
        () => ({ open, setOpen, tempValue, setTempValue }),
        [open, tempValue]
    );

    return (
        <TextEditDialogContext.Provider value={ctx}>
            {children}
        </TextEditDialogContext.Provider>
    );
};

const Trigger = ({ children, ...props }: TriggerProps) => {
    const { setOpen } = useTextEditDialogCtx();

    const handleOpen = (e?: any) => {
        if (e?.stopPropagation) e.stopPropagation();
        if (e?.preventDefault) e.preventDefault();
        setOpen(true);
    };

    return (
        <XStack onPress={handleOpen} {...props}>
            {children}
        </XStack>
    );
};

const Editor = ({ value, readValue, onChange, placeholder = "", textAreaProps, type = "text" }: EditorProps) => {
    const { open, setOpen, tempValue, setTempValue } = useTextEditDialogCtx();
    const { resolvedTheme } = useThemeSetting()
    const id = uuid();

    useEffect(() => {
        if (open) {
            const current = typeof readValue === "function" ? readValue() : value;
            setTempValue(current ?? "");
        }
    }, [open]);

    const handleClose = () => setOpen(false);
    const handleSave = () => {
        onChange(tempValue);
        setOpen(false);
    };

    return (
        <Tinted>
            <AlertDialog
                open={open}
                hideAccept={true}
                setOpen={handleSave}
                overlayProps={{ o: 0.2 }}
                p={0}
            >
                <YStack
                    f={1}
                    gap="$2"
                    br="$4"
                    style={{ boxShadow: "rgba(0, 0, 0, 0.1) 0 1px 10px" }}
                >
                    {
                        type === "html"
                            ? <YStack width="70vw" maxWidth="90vw" height="70vh" pt="$4">
                                <Monaco
                                    path={`${id || 'html-editor'}.html`}
                                    language="html"
                                    height="100%"
                                    darkMode={resolvedTheme === 'dark'}
                                    sourceCode={tempValue}
                                    onChange={setTempValue}
                                    // onSave={onSave}
                                    // onEscape={onCancel}
                                    options={{
                                        minimap: { enabled: false },
                                        wordWrap: "on",
                                        folding: false,
                                    }}
                                />
                            </YStack>
                            : type === "markdown"
                                ? <YStack width="70vw" maxWidth="90vw" height="70vh" >
                                    <Markdown data={tempValue} setData={setTempValue} />
                                </YStack>
                                : <TextArea
                                    spellCheck={false}
                                    value={tempValue}
                                    onChangeText={setTempValue}
                                    size="$5"
                                    width="60vw"
                                    pl="$6"
                                    br="$4"
                                    pt="$6"
                                    h={"60vh"}
                                    fontSize="$7"
                                    borderColor="$gray8"
                                    outlineColor="$gray8"
                                    focusStyle={{ outlineColor: "transparent", borderColor: "$gray8" }}
                                    outlineWidth={0.5}
                                    borderWidth={1}
                                    ac="flex-start"
                                    style={{ transition: "all 0.2s ease-in-out", alignSelf: "flex-start" }}
                                    placeholder={placeholder}
                                    placeholderTextColor={"$gray8"}
                                    bc="$bgContent"
                                    hoverStyle={{ borderColor: "$gray8" }}
                                    onKeyPress={(e: any) => {
                                        const key = e.key;
                                        const mod = e.ctrlKey || e.metaKey;
                                        if ((key === "s" || key === "S") && mod) {
                                            handleSave();
                                            e.preventDefault();
                                            e.stopPropagation();
                                        } else if (key === "Enter" && !e.shiftKey) {
                                            handleSave();
                                            e.preventDefault();
                                            e.stopPropagation();
                                        } else if (key === "Escape") {
                                            handleClose();
                                        }
                                    }}
                                    autoFocus
                                    // selection={{
                                    //     start: tempValue.length,
                                    //     end: tempValue.length
                                    // }}
                                    {...textAreaProps}
                                />}
                </YStack>
            </AlertDialog>
        </Tinted>
    );
};

export const TextEditDialog = Object.assign(Root, { Trigger, Editor });

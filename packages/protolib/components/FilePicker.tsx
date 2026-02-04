import { useEffect, useState } from "react"
import { Button, Input, XStack, Spinner, Dialog, Text, StackProps } from "@my/ui"
import { Folder } from '@tamagui/lucide-icons'
import { Tinted, } from './Tinted'
import { Center } from './Center'
import dynamic from 'next/dynamic'
import { InputMultiple } from "./InputMultiple"

const FileBrowser = dynamic<any>(() =>
    import('../adminpanel/next/components/FileBrowser').then(module => module.FileBrowser),
    { ssr: false, loading: () => <Tinted><Center><Spinner size='small' color="$color7" scale={4} /></Center></Tinted> }
);

type FilePickerProps = {
    onFileChange?: (value: string | string[]) => void,
    file?: string | string[],
    placeholder?: string
    initialPath?: string
    fileFilter?: Function,
    disabled?: boolean
    onPressOpen?: Function
    allowMultiple?: boolean
}


const toArray = (value?: string | string[]) => {
    if (!value) return [] as string[];
    return Array.isArray(value) ? value : [value];
};

const toSingle = (value?: string | string[]) => {
    if (!value) return "";
    return Array.isArray(value) ? (value[0] ?? "") : value;
};

const parseTextToArray = (text: string) => {
    if (!text) return [] as string[];
    try {
        const parsed = JSON.parse(text);
        ; if (Array.isArray(parsed)) {
            return parsed.map((entry) => typeof entry === 'string' ? entry.trim() : '').filter(Boolean);
        }
    } catch { }
    return text
        .split(/[\n,]/)
        .map((entry) => entry.trim())
        .filter(Boolean);
};

export function FilePicker({ onFileChange, file, placeholder, initialPath = "", fileFilter, disabled, onPressOpen = () => { }, allowMultiple = false, ...props }: FilePickerProps & StackProps) {
    const [open, setOpen] = useState(false)
    const [value, setValue] = useState<string | string[]>(allowMultiple ? toArray(file) : toSingle(file))
    const [tmpFile, setTmpFile] = useState<string | string[]>(allowMultiple ? toArray(file) : toSingle(file))
    const [baseFiles, setBaseFiles] = useState<string[]>([])

    useEffect(() => {
        const nextValue = allowMultiple ? toArray(file) : toSingle(file)
        setValue(nextValue)
        setTmpFile(nextValue)
    }, [file, allowMultiple])


    const onChange = (val: string | string[]) => {
        setValue(val)
        setTmpFile(val)
        if (onFileChange) onFileChange(val)
    }

    const handleManualChange = (text: string) => {
        if (allowMultiple) {
            onChange(parseTextToArray(text))
        } else {
            onChange(text)
        }
    }

    const currentValue = file !== undefined ? (allowMultiple ? toArray(file) : toSingle(file)) : value

    return <XStack {...props}>
        {allowMultiple
            ? <InputMultiple
                values={value as any}
                setValues={onChange}
                placeholder={placeholder ?? "Path or URL"}
            />
            : <Input
                placeholder={placeholder ?? "Path or URL"}
                value={Array.isArray(currentValue) ? toSingle(currentValue) : currentValue}
                onChangeText={(e) => handleManualChange(e)}
                f={1}
                paddingRight={"50px"}
                disabled={disabled}
            />
        }
        <Dialog open={open} onOpenChange={setOpen}>

            <Dialog.Trigger >
                <Button
                    h="$4"
                    position="absolute"
                    borderTopLeftRadius={"$0"}
                    borderBottomLeftRadius={"$0"}
                    disabled={disabled}
                    right={"$0"}
                    onPress={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onPressOpen()
                        const current = allowMultiple ? toArray(currentValue) : toArray(currentValue)
                        setBaseFiles(current)
                        setTmpFile(allowMultiple ? current : toSingle(current))
                        setOpen(!open)
                    }}
                    icon={<Folder fillOpacity={0} color="gray" size={15} />}>
                </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Content height={"80vh"} width={"80vw"} padding="$6" >
                    <Tinted>
                        <Text fontWeight="bold" fontSize={30} color={"$color8"}>File Browser</Text>
                        <Text marginBottom="$4">
                            Selected {allowMultiple ? 'files' : 'file'}:
                            {' '}
                            <Text color={"$color7"} fontStyle="italic">
                                {allowMultiple
                                    ? (Array.isArray(tmpFile) ? tmpFile.join(', ') || 'None' : toArray(tmpFile).join(', ') || 'None')
                                    : (Array.isArray(tmpFile) ? tmpFile[0] ?? '' : tmpFile)}
                            </Text>
                        </Text>
                    </Tinted>
                    <FileBrowser
                        initialPath={initialPath}
                        explorer={{disableFileToolbar: true}}
                        onOpenFile={(file) => {
                            setOpen(false)
                            if (allowMultiple) {
                                const selected = file?.path ? [file.path] : []
                                const merged = Array.from(new Set([...(Array.isArray(currentValue) ? currentValue : toArray(currentValue)), ...selected])).filter(Boolean)
                                onChange(merged)
                            } else {
                                onChange(file.path)
                            }
                        }}
                        onChangeSelection={(f) => {
                            if (allowMultiple) {
                                const selectedFiles = f.map((file) => file?.path).filter(Boolean)
                                setTmpFile(selectedFiles)
                            } else {
                                const pathFile = f[0]?.path
                                if (pathFile) {
                                    setTmpFile(pathFile)
                                }
                            }
                        }}
                        fileFilter={fileFilter}
                        selection={allowMultiple ? (Array.isArray(tmpFile) ? tmpFile[0] : toArray(tmpFile)[0]) : tmpFile}
                    />
                    <XStack gap="$4" justifyContent="center" alignSelf="center" width={"100%"} maxWidth={"500px"}>
                        <Tinted>
                            <Button
                                f={1}
                                onPress={() => setOpen(false)}
                                backgroundColor={"transparent"}
                                borderWidth={2}
                                borderColor="$color6"
                                hoverStyle={{
                                    backgroundColor: "$color2",
                                    borderColor: "$color6",
                                    borderWidth: 2
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                f={1}
                                onPress={() => {
                                    setOpen(false)
                                    if (allowMultiple) {
                                        const merged = Array.from(new Set([...
                                            baseFiles,
                                            ...(Array.isArray(tmpFile) ? tmpFile : toArray(tmpFile))
                                        ])).filter(Boolean)
                                        onChange(merged)
                                    } else {
                                        onChange(tmpFile)
                                    }
                                }}>
                                Accept
                            </Button>
                        </Tinted>
                    </XStack>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog >
    </XStack>
}

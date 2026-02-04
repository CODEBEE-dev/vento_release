import { useCallback, useEffect, useRef, useState } from "react"
import { Button, Input, XStack, Text, YStack } from "@my/ui"
import { ListChecks, Trash2, X } from '@tamagui/lucide-icons'
import { Popover } from "./Popover"

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

const normalizeArray = (value: string | string[]) => {
    const arr = toArray(value);
    return Array.from(new Set(arr.map((entry) => entry.trim()).filter(Boolean)));
}

type InputMultipleProps = {
    values?: string[];
    setValues: (values: string[]) => void;
    placeholder?: string;
}

const ValueChip = ({ value, onRemove }: { value: string; onRemove: () => void }) => {

    return <XStack
        alignItems="center"
        jc="space-between"
        backgroundColor="$bgContent"
        borderRadius="$4"
        paddingHorizontal="$2"
        h={"$1.5"}
    >
        <YStack w="140px" overflow="hidden">
            <Text fontSize={12} fontWeight="400" numberOfLines={1}>{value}</Text>
        </YStack>
        <Button
            size="$1"
            mr={-4}
            circular
            chromeless
            bc="transparent"
            pressStyle={{ bc: "tr" }}
            borderWidth={0}
            onPress={onRemove}
            icon={<X size={12} color="var(--red8)" />}
            aria-label={`Remove ${value}`}
        />
    </XStack>
};

const ValueEntries = ({ onRemove, values, onClear }: { onRemove: (value: string) => void; values: string[]; onClear: () => void }) => {
    const entries = normalizeArray(values)

    return <Popover
        color="$bgPanel"
        trigger={
            <YStack
                hoverStyle={{ bc: "$gray4" }}
                p="$3"
                h="$4"
                ai="center"
                jc="center"
                borderTopLeftRadius={"$4"}
                borderBottomLeftRadius={"$4"}
            >
                <ListChecks size={"$1"} />
                {entries.length > 0
                    && <XStack pos="absolute" top={"$1.5"} right={"$1"} bc="$color8" br={300} aspectRatio={1} w="15px" ai="center" jc="center">
                        <Text fos={10}>{entries.length}</Text>
                    </XStack>}
            </YStack>
        }
    >
        <YStack mah={300} w={200} p="$3" gap="$2" bc={"$bgPanel"} overflow="auto">
            <XStack >
                <Text fow="bold" mb="$2" fos="12px">Entries</Text>
                <Button onPress={onClear} theme="red" ml="auto" size="$1" p="$1" px="$2" br="$4">
                    Clear <X size={12} />
                </Button>
            </XStack>
            {entries.length === 0 && <Text fos="12px" o={0.6}>No entries</Text>}
            {entries.map((entry) => (
                <ValueChip
                    key={entry}
                    value={entry}
                    onRemove={() => onRemove(entry)}
                />
            ))}
        </YStack>
    </Popover>
}

const toArray = (value?: string | string[]) => {
    if (!value) return [] as string[];
    return Array.isArray(value) ? value : [value];
};

export const InputMultiple = ({ values = [], setValues, placeholder }: InputMultipleProps) => {
    const [value, setValue] = useState<string | string[]>(toArray(values))
    const [draftValue, setDraftValue] = useState<string>("")
    const [isInputFocus, setInputFocus] = useState(false)
    const inputRef = useRef(null)
    const scrollRef = useRef(null)

    useEffect(() => {
        const nextValue = toArray(values)
        setValue(nextValue)
        setDraftValue("")
    }, [values])


    const onChange = (val: string[]) => {
        setValue(val)
        if (setValues) setValues(val)
    }

    const currentValue = values !== undefined ? toArray(values) : value
    const handleRemoveValue = useCallback((value: string) => {
        const remaining = normalizeArray(currentValue).filter((entry) => entry !== value)
        onChange(remaining)
    }, [currentValue, onChange])

    const commitDraft = useCallback(() => {
        if (!draftValue.trim()) {
            setDraftValue("")
            return
        }
        const entries = normalizeArray([...normalizeArray(currentValue), ...parseTextToArray(draftValue)])
        setDraftValue("")
        onChange(entries)
    }, [currentValue, draftValue, onChange])

    const handleDraftKeyPress = useCallback((event: any) => {
        const key = event?.nativeEvent?.key ?? event?.key
        if (key === 'Enter' || key === ',' || key === 'Tab') {
            event.preventDefault?.()
            commitDraft()
        }
    }, [draftValue, currentValue, commitDraft, handleRemoveValue])


    return <XStack
        ref={scrollRef}
        h="$4"
        w="100%"
        f={1}
        outlineWidth={"2px"}
        flexWrap="nowrap"
        boxShadow={isInputFocus ? `0px 0px 0px 2px var(--color)` : `0px 0px 0px 1px var(--gray6)`}
        br="$4"
        bc="$gray1"
        gap="$4"
    >
        <ValueEntries onRemove={handleRemoveValue} values={currentValue} onClear={() => onChange([])} />
        <Input
            ref={inputRef}
            unstyled
            w="400px"
            onFocus={() => setInputFocus(true)}
            bw={0}
            f={1}
            placeholder={placeholder ?? "Add an entry"}
            placeholderTextColor="$gray8"
            value={draftValue}
            onChangeText={setDraftValue}
            onKeyPress={handleDraftKeyPress}
            onBlur={() => {
                commitDraft()
                setInputFocus(false)
            }}
        />
    </XStack>
};
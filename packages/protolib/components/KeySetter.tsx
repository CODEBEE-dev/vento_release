import { YStack, Text, Button, Input, XStack, useToastController, Spinner } from '@my/ui';
import { useEffect, useState } from 'react';
import { getKey } from "@extensions/keys/coreContext";
import { API } from 'protobase';
import { Check, RefreshCcw, Trash2, Plus } from '@tamagui/lucide-icons';
import { Tinted } from './Tinted';
import { useEventEffect } from '@extensions/events/hooks/useEventEffect';

interface KeySetterProps {
    nameKey: string;
    validate?: (value: string) => Promise<string | true>;
    placeholderValue?: string;
    onAdd?: (value: string) => void;
    onRemove?: (value: string) => void;
}


export const useKeyState = (nameKey: string) => {
    const [keyValue, setKeyValue] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const hasKey = !!(!loading && keyValue && keyValue.trim() !== "")

    const updateKey = async (newKey) => {
        setLoading(true)
        let res = await API.post("/api/core/v1/keys/" + nameKey, { name: nameKey, value: newKey });
        if (res.isError && !res.data) { // If the key does not exist, create it
            res = await API.post("/api/core/v1/keys", { name: nameKey, value: newKey });
        }

        if (res?.data) {
            setKeyValue(res?.data.value);
        }
        setLoading(false);
    }

    useEffect(() => {
        const checkKey = async () => {
            setLoading(true)
            const key = await getKey({
                key: nameKey
            })
            setKeyValue(key)
            setLoading(false)
        }
        checkKey()
    }, [])

    const onKeyValueChange = (payload, msg) => {
        try {
            const parsedMessage = JSON.parse(msg.message)
            const payload = parsedMessage.payload
            const newKey = payload?.data?.value
            setKeyValue(newKey)
        } catch (e) {
            console.error(e)
        }
    }

    const onKeyDelete = (payload, msg) => {
        setKeyValue(null)
    }

    useEventEffect(onKeyValueChange, { path: `keys/update/${nameKey}` })
    useEventEffect(onKeyValueChange, { path: `keys/create/${nameKey}` })
    useEventEffect(onKeyDelete, { path: `keys/delete/${nameKey}` })

    return { keyValue, loading, updateKey, hasKey };
}

export const KeySetter: React.FC<KeySetterProps> = ({
    nameKey,
    validate = async (value) => {
        return true; // Default validation always passes
    },
    placeholderValue = "Enter your key here",
    onAdd = (value) => { },
    onRemove = (value) => { }
}) => {

    const [value, setValue] = useState("");
    const [currKey, setCurrKey] = useState<any>("-");
    const [loading, setLoading] = useState(false);
    const toast = useToastController()

    const loadKey = async () => {
        const keyRes = await getKey({
            key: nameKey
        });

        if (keyRes && keyRes.trim() !== "") {
            setCurrKey(keyRes);
        } else {
            setCurrKey("");
        }
    }

    const onEditKey = async (keyVal) => {
        setLoading(true);
        if (keyVal !== placeholderValue) {
            const validationResult = await validate(keyVal);
            if (validationResult !== true) {
                toast?.show?.(validationResult, { duration: 2000, tint: "red" });
                setLoading(false);
                return;
            }
        }

        const keyData = { name: nameKey, value: keyVal }

        let res = await API.post("/api/core/v1/keys/" + nameKey, keyData);

        if (res.isError && !res.data) { // If the key does not exist, create it
            res = await API.post("/api/core/v1/keys", keyData);
        }

        if (res?.data) {
            setCurrKey(res?.data.value);
            if (keyVal !== placeholderValue) {
                onAdd(keyVal)
                toast?.show?.("Key set successfully", { duration: 1000, tint: "green" });
            } else {
                onRemove(keyVal);
            }
        } else if (res?.isError) {
            toast?.show?.("Error setting key", { duration: 2000, tint: "red" });
        }
        setLoading(false);
    }

    useEffect(() => {
        loadKey()
    }, [])

    return <YStack p="$4">
        {
            currKey && currKey !== "" && currKey != placeholderValue
                ? <XStack ai="center" jc="space-between" gap="$4" flexWrap='wrap'>
                    <XStack ai="center" gap="$2">
                        <Text color="$color10" fow="500">{nameKey}</Text>
                        <Check color="$green10" size={14} strokeWidth={4} />
                    </XStack>
                    <XStack gap="$2" ai="center">
                        <Tinted tint="red">
                            <Button circular icon={Trash2} onPress={() => onEditKey("")}></Button>
                        </Tinted>
                        <Button bc="transparent" circular icon={RefreshCcw} onPress={loadKey}></Button>
                    </XStack>
                </XStack>
                : <YStack>
                    <XStack ai="center" jc="space-between" gap="$4" flexWrap='wrap'>
                        <YStack >
                            <Text fos="$3" col="$red9" l={0}>Required</Text>
                            <Text color="$color10" fow="500" >{nameKey}</Text>
                        </YStack>
                        <XStack gap="$2" flex={1} >
                            <Input
                                focusStyle={{ outlineWidth: 0 }}
                                f={1}
                                placeholder={placeholderValue}
                                value={value}
                                bc="$bgPanel"
                                secureTextEntry={true}
                                onChangeText={(text) => setValue(text)}
                            />
                            <Button themeInverse bc="$color7" circular disabled={loading} icon={loading ? <Spinner /> : <Plus />} onPress={() => onEditKey(value)}></Button>
                        </XStack>
                    </XStack>
                </YStack>
        }
    </YStack>
};

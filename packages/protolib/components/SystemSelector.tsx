import { YStack, Text } from "@my/ui";
import { SelectList } from "./SelectList";
import { useSystems } from '@extensions/ai/hooks/useSystems';

export const SystemSelector = ({
    value,
    onChange,
    placeholder,
}: {
    value: string
    onChange: (v: string) => void
    placeholder?: string
}) => {
    const { systems, loading, error } = useSystems()
    const elements = (systems || []).map((s: any) => s.name).filter(Boolean)

    if (loading) {
        return (
            <Text size="$2" mx="10px">
                Loading systems...
            </Text>
        )
    }

    if (error) {
        return (
            <Text size="$2" mx="10px" color="$red10">
                {error}
            </Text>
        )
    }

    if (!elements.length) {
        return (
            <Text size="$2" mx="10px" color="$color11">
                No systems available.
            </Text>
        )
    }

    return (
        <YStack>
            <SelectList
                title={placeholder || 'System'}
                elements={elements}
                value={value}
                onValueChange={(v) => onChange(v)}
                selectorStyle={{
                    normal: { backgroundColor: "$gray1", borderColor: "$gray7" },
                    hover: { backgroundColor: "$gray2" },
                }}
            />
        </YStack>
    )
}

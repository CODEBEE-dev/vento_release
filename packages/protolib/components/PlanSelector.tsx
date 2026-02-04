import { YStack, Text } from "@my/ui";
import { SelectList } from "./SelectList";
import { usePlans } from '@extensions/ai/hooks/usePlans';

export const PlanSelector = ({
    value,
    onChange,
    placeholder,
}: {
    value: string
    onChange: (v: string) => void
    placeholder?: string
}) => {
    const { plans, loading, error } = usePlans()
    // Show folder indicator for plan groups
    const elements = (plans || []).map((p: any) => {
        if (p.isFolder) {
            return `${p.name}/ (${p.planCount} plans)`;
        }
        return p.name;
    }).filter(Boolean)

    if (loading) {
        return (
            <Text size="$2" mx="10px">
                Loading plans...
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
                No plans available.
            </Text>
        )
    }

    // Extract clean name from display value (removes "/ (X plans)" suffix for folders)
    const extractName = (displayValue: string) => {
        const match = displayValue.match(/^(.+?)\/\s*\(\d+ plans\)$/);
        return match ? match[1] : displayValue;
    };

    // Find display value for current value
    const displayValue = elements.find(e => extractName(e) === value) || value;

    return (
        <YStack>
            <SelectList
                title={placeholder || 'Plan'}
                elements={elements}
                value={displayValue}
                onValueChange={(v) => onChange(extractName(v))}
                selectorStyle={{
                    normal: { backgroundColor: "$gray1", borderColor: "$gray7" },
                    hover: { backgroundColor: "$gray2" },
                }}
            />
        </YStack>
    )
}

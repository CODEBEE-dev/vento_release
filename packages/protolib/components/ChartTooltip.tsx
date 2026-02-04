import { Text, YStack, XStack } from "@my/ui";
import { TooltipProps } from "recharts";

type ChartTooltipProps = TooltipProps<any, any> & { tooltipFormatter?: (value: string) => string };

export const ChartTooltip = ({ active, payload, label, tooltipFormatter }: ChartTooltipProps) => {

    if (active && payload && payload.length) {
        return <YStack
            p="$3"
            br="$4"
            bg="$bgContent"
            shadowColor="$shadowColor"
            shadowRadius={8}
            minWidth={200}
            gap="$2"
        >
            {
                label && typeof label === 'string'
                && <Text fontWeight="700" fontSize={14} mb="$2">
                    {label}
                </Text>
            }
            {payload.map((item, idx) => (
                <XStack key={idx} jc="space-between" ai="center" gap="$2">
                    <Text color="$color" fontSize={13}>
                        {item.dataKey}
                    </Text>
                    <Text fow="700" color={item.color || "$color"} fontSize={13}>
                        {tooltipFormatter ? tooltipFormatter(item.value) : item.value}
                    </Text>
                </XStack>
            ))}
        </YStack>
    }
    return null;
};
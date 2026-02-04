import { YStack, Text } from '@my/ui';
import {
    LineChart as LineChartR,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import { DashboardCard } from './DashboardCard';
import { ChartTooltip } from './ChartTooltip';

interface LineChartProps {
    title: string;
    id: string;
    data: any[];
    dataKeys: string[]
    nameKey: string;
    colors: string[];
    color?: string;
    tooltipFormatter?: (value: string) => string;
    isAnimationActive?: boolean;
    aspect?: any;
}

export const LineChart: React.FC<LineChartProps> = ({
    title,
    id,
    data,
    dataKeys,
    nameKey,
    colors,
    tooltipFormatter = (value) => `${value}`,
    isAnimationActive = false,
    aspect = 1,
}) => {
    return (
        <YStack
            borderRadius={10}
            backgroundColor="$bgColor"
            padding={10}
            flex={1}
            justifyContent="center"
            alignItems="center"
        >
            {Array.isArray(data) && data.length > 0 ? (
                <ResponsiveContainer aspect={parseFloat(aspect)}>
                    <LineChartR data={data}>
                        <XAxis dataKey={nameKey} />
                        <YAxis />
                        <Tooltip content={(props) => <ChartTooltip {...props} tooltipFormatter={tooltipFormatter} />} />
                        {/* <Legend /> */}
                        {
                            dataKeys?.map((dataKey, index) => {
                                return <Line
                                    type="monotone"
                                    dataKey={dataKey}
                                    stroke={colors[index]}
                                    isAnimationActive={isAnimationActive}
                                />
                            })
                        }
                    </LineChartR>
                </ResponsiveContainer>
            ) : (
                <YStack>
                    <Text>No data available</Text>
                </YStack>
            )}
        </YStack>
    );
};

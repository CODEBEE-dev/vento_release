import { YStack, Text } from '@my/ui';
import {
    AreaChart as AreaChartR,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import { DashboardCard } from './DashboardCard';
import { ChartTooltip } from './ChartTooltip';

interface AreaChartProps {
    title: string;
    id: string;
    data: any[];
    dataKeys: string[];
    nameKey: string;
    colors: string[];
    tooltipFormatter?: (value: string) => string;
    isAnimationActive?: boolean;
    aspect?: any;
    color?: string;
}

export const AreaChart: React.FC<AreaChartProps> = ({
    title,
    id,
    data,
    dataKeys,
    nameKey,
    colors,
    color = '#8884d8',
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
                    <AreaChartR data={data}>
                        <XAxis dataKey={nameKey} />
                        <YAxis />
                        <Tooltip content={(props) => <ChartTooltip {...props} tooltipFormatter={tooltipFormatter} />} />
                        {/* <Legend /> */}
                        {dataKeys?.map((dataKey, index) => (
                            <Area
                                key={index}
                                type="monotone"
                                dataKey={dataKey}
                                stroke={colors[index]}
                                fill={colors[index]}
                                isAnimationActive={isAnimationActive}
                            />
                        ))}
                    </AreaChartR>
                </ResponsiveContainer>
            ) : (
                <YStack>
                    <Text>No data available</Text>
                </YStack>
            )}
        </YStack>
    );
};

import { useCallback, useRef } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import { Stack } from "@my/ui";
import { Tinted } from './Tinted';
import { gridSizes } from 'protobase';
import { useBoardLayer } from '@extensions/boards/store/boardStore'

const ResponsiveGridLayout = WidthProvider(Responsive);

export { gridSizes };

export const breakpoints = { lg: 1500, md: 800, sm: 400, xs: 0 };

export const getCurrentBreakPoint = (w, bps?) => {
    if (!bps) {
        bps = breakpoints;
    }
    return w >= bps.lg ? "lg" :
        w >= bps.md ? "md" :
            w >= bps.sm ? "sm" : "xs";
};

export const DashboardGrid = ({
    items = [],
    layouts = {},
    borderRadius = 10,
    padding = 10,
    settings = {},
    extraScrollSpace = 0,
    ...props
}) => {
    const [boardLayer] = useBoardLayer()
    const mergedWrapperStyle = extraScrollSpace ? {
        height: '100%',
        overflow: 'auto',
        flex: 1,
        minHeight: 0,
        paddingBottom: extraScrollSpace,
        boxSizing: 'border-box' as const,
    } : {};

    // 👇 filtramos las cards según la capa activa
    const filteredItems = items.filter((item) => {
        const cardLayer = item.layer || "base";
        return cardLayer === boardLayer;
    });

    const allHandles = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

    const layoutsWithHandles = Object.fromEntries(
        Object.entries(layouts).map(([bp, arr]: any) => [
            bp,
            arr.map(item => ({ ...item, resizeHandles: allHandles }))
        ])
    );

    return (
        <Tinted>
            <Stack style={mergedWrapperStyle}>
                <ResponsiveGridLayout
                    key={boardLayer}  // force re-render when layer changes
                    {...props}
                    className="layout"
                    layouts={layoutsWithHandles}
                    margin={[6, 6]}
                    breakpoints={breakpoints}
                    rowHeight={30}
                    draggableCancel=".no-drag"
                    {...settings}
                    style={{
                        ...props['style'],
                        ...settings['style'],
                    }}
                    cols={{
                        lg: gridSizes.lg.totalCols,
                        md: gridSizes.md.totalCols,
                        sm: gridSizes.sm.totalCols,
                        xs: gridSizes.xs.totalCols,
                    }}
                >
                    {filteredItems.map((item) => (
                        <Stack flex={1} key={item.key}>{item.content}</Stack>
                    ))}
                </ResponsiveGridLayout>
            </Stack>
        </Tinted>
    );
};

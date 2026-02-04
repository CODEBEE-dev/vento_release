import { ReactNode, useState, useEffect, useRef, forwardRef } from "react";
import { Tinted } from './Tinted';
import { StackProps, XStack, YStack, Paragraph } from '@my/ui';

interface DashboardCardProps {
    children: ReactNode;
    id: string;
    title?: string;
    status?: "running" | "error" | "idle" | "success";
    hideTitle?: boolean;
    hideFrame?: boolean;
    titleProps?: StackProps;
    containerProps?: StackProps;
    header?: ReactNode;
    highlighted?: boolean;
}

export const DashboardCard = forwardRef(({
    children,
    status,
    hideTitle,
    hideFrame,
    id,
    title,
    header,
    titleProps = {},
    containerProps = {},
    highlighted = false,
}: DashboardCardProps, ref: any) => {
    const [showRunning, setShowRunning] = useState(false);
    const visualRunningUntil = useRef<number>(0);

    useEffect(() => {
        if (status === 'running') {
            const now = Date.now();
            visualRunningUntil.current = now + 1000; // mantener visible al menos 1 segundo
            setShowRunning(true);
        } else if (status !== 'running') {
            const now = Date.now();
            const delay = visualRunningUntil.current - now;

            if (delay <= 0) {
                setShowRunning(false);
            } else {
                const timeout = setTimeout(() => {
                    setShowRunning(false);
                }, delay);
                return () => clearTimeout(timeout);
            }
        }
    }, [status]);

    return (
        <>
            <style>{`
        @keyframes dashOffset {
          0% { stroke-dashoffset: 100; }
          100% { stroke-dashoffset: 0; }
        }
      `}</style>

            <Tinted>
                <YStack
                    ref={ref}
                    enterStyle={{ scale: 0.4, opacity: 0 }}
                    animation="quick"
                    cursor="default"
                    key={id}
                    id={id}
                    borderRadius="var(--radius-6)"
                    flex={1}
                    position="relative"
                    {...containerProps}
                    backgroundColor={hideFrame ? "transparent" : (containerProps["bgColor"] || containerProps["backgroundColor"] || "var(--bgPanel)")}
                    style={{
                        height: '100%',
                        overflow: 'hidden',
                        ...containerProps.style,
                    }}
                >
                    {(showRunning || highlighted) && (
                        <div
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                zIndex: 0,
                                pointerEvents: 'none',
                            }}
                        >
                            <svg width="100%" height="100%">
                                <rect
                                    x="1"
                                    y="1"
                                    width="calc(100% - 2px)"
                                    height="calc(100% - 2px)"
                                    fill="none"
                                    stroke="var(--color7)"
                                    strokeWidth={highlighted ? "3" : "2"}
                                    rx="10"
                                    ry="10"
                                    {...(highlighted
                                        ? {} // borde fijo, sin dash
                                        : {
                                            strokeDasharray: "8 4",
                                            strokeDashoffset: "0",
                                            style: { animation: "dashOffset 2s linear infinite" },
                                        })}
                                />
                            </svg>
                        </div>
                    )}

                    {!showRunning && status !== 'running' && (
                        <YStack
                            position="absolute"
                            top={0}
                            left={0}
                            right={0}
                            bottom={0}
                            borderRadius={"var(--radius-6)"}
                            borderWidth={highlighted ? 3 : 2}
                            borderStyle={highlighted ? "solid" : "dashed"}
                            borderColor={status === "error" ? "var(--red7)" : "transparent"}
                            pointerEvents="none"
                            style={{ zIndex: 0 }}
                        />
                    )}

                    {header}

                    {(title && !hideTitle && !header) && (
                        <XStack
                            w="100%"
                            btrr={9}
                            btlr={9}
                            mt={"$3"}
                            h={20}
                            ai="center"
                            zIndex={1}
                            {...titleProps}
                        >
                            <Paragraph
                                flex={1}
                                fow="500"
                                textOverflow={"ellipsis"}
                                textAlign="center"
                                overflow="hidden"
                                whiteSpace={"nowrap"}
                                fos={"$4"}
                            >
                                {title}
                            </Paragraph>
                        </XStack>
                    )}
                    <YStack
                        flex={1}
                        style={{ overflowY: 'auto', maxHeight: '100%', zIndex: 1 }}
                    >
                        {children}
                    </YStack>
                </YStack>
            </Tinted>
        </>
    );
});

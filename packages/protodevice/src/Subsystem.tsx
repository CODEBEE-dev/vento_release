import React, { useState } from "react";
import { XStack, YStack, Text, Paragraph, Button, Input, Spinner, Switch, useToastController, Select, Popover, Checkbox } from '@my/ui';
import { ContainerLarge } from 'protolib/components/Container';
import { Tinted } from 'protolib/components/Tinted';
import { Chip } from 'protolib/components/Chip';
import { Megaphone, MegaphoneOff, ChevronDown, Check } from "@tamagui/lucide-icons"
import { useSubscription } from 'protolib/lib/mqtt';
import { useFetch } from 'protolib/lib/useFetch'
import { DeviceSubsystemMonitor } from '@extensions/devices/devices/devicesSchemas';

const useHoverDelay = (delay = 1000) => {
    const [open, setOpen] = useState(false);
    const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, []);

    const begin = () => {
        if (open || timerRef.current) return;
        timerRef.current = setTimeout(() => {
            setOpen(true);
            timerRef.current = null;
        }, delay);
    };

    const cancel = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        setOpen(false);
    };

    const keepOpen = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        setOpen(true);
    };

    return { open, begin, cancel, keepOpen };
};

const Monitor = ({ deviceName, monitorData, subsystem }) => {
    const monitor = new DeviceSubsystemMonitor(deviceName, subsystem.name, monitorData)
    // Define the state hook outside of JSX mapping
    const [value, setValue] = useState<any>(undefined);
    //const value = 'test'
    const { message } = useSubscription(monitor.getEndpoint())
    const [result, loading, error] = useFetch(monitor.getValueAPIURL())
    const [scale, setScale] = useState(1);
    const [ephemeral, setEphemeral] = useState(monitorData?.ephemeral ?? false);
    const { open: infoOpen, begin: beginInfoHover, cancel: cancelInfoHover, keepOpen: keepInfoHover } = useHoverDelay(1000);

    const toast = useToastController()
    const onToggleEphemeral = (checked) => {
        setEphemeral(checked)
        fetch("/api/core/v1/devices/" + deviceName + "/subsystems/" + subsystem.name + "/monitors/" + monitor.data.name + "/ephemeral", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ value: checked })
        })
            .then(response => response.json())
            .then(data => console.log(data))

        toast.show("[" + deviceName + "/" + subsystem.name + "] events are now " + (checked ? '"EPHEMERAL".' : '"PERSISTENT".'), {
            duration: 2000
        })
    }

    React.useEffect(() => {
        setValue(message?.message?.toString())
        setScale(1.15);
        setTimeout(() => {
            setScale(1);
        }, 200);
    }, [message])

    return (
        <YStack
            borderWidth="1px"
            paddingVertical="$2"
            paddingHorizontal="$4"
            gap="$2"
            cursor="pointer"
            borderRadius="$4"
            alignItems="center"
            backgroundColor="$transparent"
            borderColor="$color8"
            hoverStyle={{ backgroundColor: "$color2" }}
            onPress={() => onToggleEphemeral(!ephemeral)}
        >
            <XStack alignItems="center" gap="$2" width="100%">
                <XStack alignItems="center" gap="$2" flex={1} minWidth={0}>
                <Popover
                    open={infoOpen}
                    onOpenChange={(next) => {
                        if (!next) cancelInfoHover();
                    }}
                    placement="bottom"
                    allowFlip
                >
                    <Popover.Trigger asChild>
                        <Button
                            size="$1"
                            circular
                                backgroundColor="$color2"
                                borderWidth={1}
                                borderColor="$color5"
                                hoverStyle={{ backgroundColor: "$color3" }}
                                pressStyle={{ backgroundColor: "$color4" }}
                                aria-label={`${monitor.data.label ?? monitor.data.name} description`}
                                onPress={(e) => e?.stopPropagation?.()}
                                onPointerDown={(e) => e?.stopPropagation?.()}
                                onMouseEnter={beginInfoHover}
                                onMouseLeave={cancelInfoHover}
                            >
                                i
                            </Button>
                        </Popover.Trigger>
                        {monitor.data?.description ? (
                            <Popover.Content
                                padding="$2"
                                borderWidth={1}
                                borderColor="$borderColor"
                                backgroundColor="$bgPanel"
                                maxWidth={260}
                                onPress={(e) => e?.stopPropagation?.()}
                                onPointerDown={(e) => e?.stopPropagation?.()}
                                onMouseEnter={keepInfoHover}
                                onMouseLeave={cancelInfoHover}
                            >
                                <Popover.Arrow borderWidth={1} borderColor="$borderColor" bc="$bgPanel" />
                                <Text size="$2">{monitor.data.description}</Text>
                            </Popover.Content>
                        ) : null}
                    </Popover>
                    <Text flex={1} whiteSpace="nowrap" textOverflow="ellipsis" overflow="hidden">
                        {monitor.data.label}
                    </Text>
                </XStack>
                <Button
                    size="$1"
                    circular
                    backgroundColor="$color2"
                    borderWidth={1}
                    borderColor="$color5"
                    hoverStyle={{ backgroundColor: "$color3" }}
                    pressStyle={{ backgroundColor: "$color4" }}
                    onPress={(e) => {
                        e?.stopPropagation?.();
                        onToggleEphemeral(!ephemeral);
                    }}
                    aria-label={`Toggle ${monitor.data.label ?? monitor.data.name} ephemeral state`}
                >
                    {ephemeral ? <MegaphoneOff size={14} color="$color8" /> : <Megaphone size={14} color="$color10" />}
                </Button>
            </XStack>
            {(loading || (value === undefined && result?.value === undefined))
                ? <Spinner color="$color7" />
                : <Text
                    fontWeight="600"
                    color={value === undefined ? 'gray' : '$color8'}
                    scale={scale} 
                    animation="bouncy"
                >
                    {`${value ?? result?.value} ${monitor.getUnits()}`}
                </Text>
            }
        </YStack>
    );
}

const InfoButton = ({ description, label = "Description" }) => {
    if (typeof description !== "string" || description.trim() === "") return null;
    const { open, begin, cancel, keepOpen } = useHoverDelay(1000);

    return (
        <Popover placement="bottom" allowFlip open={open} onOpenChange={(next) => !next && cancel()}>
            <Popover.Trigger>
                <Button
                    size="$2"
                    circular
                    aria-label={label}
                    onMouseEnter={begin}
                    onMouseLeave={cancel}
                >
                    i
                </Button>
            </Popover.Trigger>
            <Popover.Content
                padding="$2"
                borderWidth={1}
                borderColor="$borderColor"
                backgroundColor="$bgPanel"
                maxWidth={260}
                onMouseEnter={keepOpen}
                onMouseLeave={cancel}
            >
                <Popover.Arrow borderWidth={1} borderColor="$borderColor" bc="$bgPanel" />
                <Text size="$2">{description}</Text>
            </Popover.Content>
        </Popover>
    );
};

const getSubsystemDescription = (subsystem) =>
    subsystem?.description ?? subsystem?.config?.description ?? subsystem?.meta?.description;

const Action = ({ deviceName, subsystemName, action, subsystem }) => {
    const toast = useToastController();
    const [isRunning, setIsRunning] = useState(false);
    const [reply, setReply] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const subsystemDescription = getSubsystemDescription(subsystem);
    const actionDescription = action?.description;
    const infoDescription = subsystemDescription ?? actionDescription;
    const infoLabel = subsystemDescription
        ? `${subsystem?.name ?? "Subsystem"} description`
        : `${action?.label ?? action?.name ?? "Action"} description`;
    const {
        open: buttonPopoverOpen,
        begin: beginButtonHover,
        cancel: cancelButtonHover,
        keepOpen: keepButtonHover,
    } = useHoverDelay(1000);

    const sendActionRequest = async (payload?: string) => {
        setIsRunning(true);
        setReply(null);
        setError(null);
        const query = payload !== undefined ? `?value=${encodeURIComponent(payload)}` : '';
        const url = `/api/core/v1/devices/${deviceName}/subsystems/${subsystemName}/actions/${action.name}${query}`;
        try {
            const resp = await fetch(url);
            let data: any = null;
            try {
                data = await resp.json();
            } catch (e) { }
            if (!resp.ok) {
                throw new Error(data?.error || `Action failed (${resp.status})`);
            }
            if (data?.reply !== undefined) {
                setReply(typeof data.reply === 'string' ? data.reply : JSON.stringify(data.reply, null, 2));
            } else {
                toast.show(`[${action.label ?? action.name}] command sent`, { duration: 2000 });
            }
        } catch (err: any) {
            setError(err?.message ?? 'Action failed');
        } finally {
            setIsRunning(false);
        }
    };

    const buttonAction = async (action, value?) => {
        const sendValue = value !== undefined ? value : action.payload?.value;

        let payloadToSend: string | undefined;

        if (typeof sendValue === "object" && sendValue !== null) {
            payloadToSend = JSON.stringify(sendValue);
        } else if (typeof sendValue === "string") {
            payloadToSend = sendValue;
        } else if (sendValue !== undefined) {
            payloadToSend = String(sendValue);
        }

        await sendActionRequest(payloadToSend);
    };

    const renderStatus = () => {
        if (isRunning) {
            return (
                <XStack gap="$2" alignItems="center" mt="$2">
                    <Spinner size="small" color="$color10" />
                    <Text size="$2">Waiting for response...</Text>
                </XStack>
            );
        }
        if (reply !== null) {
            return (
                <Paragraph mt="$2" size="$2" color="$color10">
                    Response: {reply}
                </Paragraph>
            );
        }
        if (error) {
            return (
                <Paragraph mt="$2" size="$2" color="$red10">
                    {error}
                </Paragraph>
            );
        }
        return null;
    };

    // ---- json-schema helpers (minimal) ----
    const normalizeType = (t?: string) => (t === "int" || t === "integer" ? "integer" : (t || "string"));

    const buildInitialFromSchema = (schema?: Record<string, any>) => {
    if (!schema) return {};
    const out: Record<string, any> = {};
    Object.entries(schema).forEach(([k, f]: any) => {
        const t = normalizeType(f?.type);
        if (f?.default !== undefined) out[k] = f.default;
        else if (t === "object") out[k] = buildInitialFromSchema(f?.properties || {});
        else if (t === "boolean" || String(f?.type ?? "").toLowerCase() === "bool") out[k] = false;
        else if (t === "integer" || t === "number") {
            const minConstraint = typeof f?.minimum === "number" ? f.minimum : f?.min;
            out[k] = typeof minConstraint === "number" ? minConstraint : "";
        } else out[k] = "";
    });
    return out;
    };

    const setNested = (obj: any, path: string[], val: any) => {
    if (path.length === 0) return val;
    const [h, ...r] = path;
    return { ...obj, [h]: setNested(obj?.[h] ?? {}, r, val) };
    };
    const getNested = (obj: any, path: string[]) =>
    path.reduce((acc, k) => (acc ? acc[k] : undefined), obj);

    const [value, setValue] = useState(
    action?.payload?.type == "json-schema"
        ? buildInitialFromSchema(action?.payload?.schema)
        : Array.isArray(action?.payload)
        ? (action?.payload?.[0]?.value ?? "")
        : ""
);

    var type
    if (action?.payload?.value) {
        type = "button"
    } else if (Array.isArray(action?.payload)) {
        type = "select"
    } else if (action?.payload?.type === "slider") {
        type = "slider"
    } else if (action?.payload?.type != "json-schema") {
        type = "input"
    }

    switch (type) {
        case "button":
            const hasButtonInfo = Boolean(infoDescription);
            const hoverHandlers = hasButtonInfo
                ? {
                      onMouseEnter: beginButtonHover,
                      onMouseLeave: cancelButtonHover,
                  }
                : {};
            const actionButton = (
                <Button
                    key={action.name}
                    onPress={() => {
                        buttonAction(action);
                    }}
                    color="$color10"
                    title={"Description: " + action.description}
                    disabled={isRunning}
                    {...action.props}
                    {...hoverHandlers}
                >
                    {action.label ?? action.name}
                </Button>
            );
            return (
                <YStack gap="$2" minWidth={140}>
                    {hasButtonInfo ? (
                        <Popover
                            allowFlip
                            placement="bottom"
                            open={buttonPopoverOpen}
                            onOpenChange={(next) => {
                                if (!next) cancelButtonHover();
                            }}
                        >
                            <Popover.Trigger asChild>{actionButton}</Popover.Trigger>
                            <Popover.Content
                                padding="$2"
                                borderWidth={1}
                                borderColor="$borderColor"
                                backgroundColor="$bgPanel"
                                maxWidth={260}
                                onMouseEnter={keepButtonHover}
                                onMouseLeave={cancelButtonHover}
                            >
                                <Popover.Arrow borderWidth={1} borderColor="$borderColor" bc="$bgPanel" />
                                <Text size="$2">{infoDescription}</Text>
                            </Popover.Content>
                        </Popover>
                    ) : (
                        actionButton
                    )}
                    {renderStatus()}
                </YStack>
            )
        case "input":
            return (
                <YStack gap="$2" width="100%">
                    <XStack gap="$3" width={'100%'} alignItems="center">
                        <Text whiteSpace="nowrap" textOverflow="ellipsis" overflow="hidden" maxWidth="150px">{action.label ?? action.name}</Text>
                        <Input
                            value={value}
                            onChange={async (e) => setValue(e.target.value)}
                            width={80}
                            placeholder="value"
                            flex={1}
                        />
                        <Button
                            key={action.name}
                            onPress={() => { buttonAction(action, value) }}
                            color="$color10"
                            title={"Description: " + action.description}
                            disabled={isRunning}
                        >
                            Send
                        </Button>
                    </XStack>
                    {renderStatus()}
                </YStack>
            )
        case "select":
            const payloadOptions = Array.isArray(action.payload) ? action.payload : [];
            const [selectedOption, setSelectedOption] = useState(payloadOptions[0]?.value ?? "");
            console.log("🤖 ~ Action ~ payloadOptions:", payloadOptions)

            console.log("🤖 ~ Action ~ selectedOption:", selectedOption)
            
            return (
                <YStack gap="$2" width="100%">
                    <XStack gap="$3" width={'100%'} alignItems="center">
                        <Text whiteSpace="nowrap" textOverflow="ellipsis" overflow="hidden" maxWidth="150px">{action.label ?? action.name}</Text>
                        <Select value={selectedOption} onValueChange={setSelectedOption} disablePreventBodyScroll>
                            <Select.Trigger
                                iconAfter={ChevronDown}
                                width={180}
                                maxWidth={220}
                                flexShrink={0}
                            >
                                <Select.Value placeholder="Select an option" numberOfLines={1} />
                            </Select.Trigger>
                            <Select.Content zIndex={9999999999}>
                                <Select.Viewport>
                                    <Select.Group>
                                        {action.payload.map((item, i) => (
                                            <Select.Item key={i} value={item.value}>
                                                <Select.ItemText>{item.label}</Select.ItemText>
                                                <Select.ItemIndicator marginLeft="auto">
                                                    <Check size={16} />
                                                </Select.ItemIndicator>
                                            </Select.Item>
                                        ))}
                                    </Select.Group>
                                </Select.Viewport>
                            </Select.Content>
                        </Select>
                        <Button
                            key={action.name}
                            onPress={() => { 
                                const selectedPayload = payloadOptions.find(option => option.value === selectedOption);
                                buttonAction(action, selectedPayload ? selectedPayload.value : selectedOption);
                            }}
                            color="$color10"
                            title={"Description: " + action.description}
                            disabled={isRunning}
                        >
                            Send
                        </Button>
                    </XStack>
                    {renderStatus()}
                </YStack>
            )
        case "slider": {
            const {
                min_value = 0,
                max_value = 100,
                step = 1,
                initial_value = 0,
                unit = ""
            } = action.payload;

            const [sliderValue, setSliderValue] = useState(initial_value);
            const trackRef = React.useRef<HTMLInputElement>(null);

            const clamp = (val: number) => {
                return Math.min(Math.max(val, min_value), max_value);
            };

            const roundToStep = (val: number) => {
                const rounded = Math.round((val - min_value) / step) * step + min_value;
                return clamp(rounded);
            };

            const handleSliderChange = (val: number) => {
                setSliderValue(roundToStep(val));
            };

            const handleInputChange = (e) => {
                const raw = e.target.value;
                // Allow empty input for editing
                if (raw === "") {
                    setSliderValue(NaN);
                    return;
                }

                // Prevent non-numeric characters
                const num = Number(raw);
                if (!isNaN(num)) {
                    setSliderValue(clamp(num));
                }
            };

            const handleInputBlur = () => {
                if (isNaN(sliderValue)) {
                    setSliderValue(clamp(initial_value));
                } else {
                    setSliderValue(roundToStep(sliderValue));
                }
            };

            return (
                <YStack gap="$2" width="100%">
                    <XStack gap="$3" alignItems="center" width="100%">
                        <Text
                            whiteSpace="nowrap"
                            textOverflow="ellipsis"
                            overflow="hidden"
                            maxWidth="150px"
                            minWidth="120px"
                        >
                            {action.label ?? action.name}
                        </Text>

                        <Text size="$2">{min_value}{unit}</Text>

                        <YStack flex={1} minWidth={200}>
                            <input
                                ref={trackRef}
                                type="range"
                                min={min_value}
                                max={max_value}
                                step={step}
                                value={isNaN(sliderValue) ? initial_value : sliderValue}
                                onChange={(e) => handleSliderChange(Number(e.target.value))}
                                style={{
                                    width: '100%',
                                    height: '4px',
                                    borderRadius: '4px',
                                    background: 'var(--color4)',
                                    accentColor: 'var(--color10)',
                                    appearance: 'none',
                                    cursor: 'pointer'
                                }}
                            />
                        </YStack>

                        <Text size="$2">{max_value}{unit}</Text>

                        <Input
                            value={isNaN(sliderValue) ? "" : sliderValue.toString()}
                            onChange={handleInputChange}
                            onBlur={handleInputBlur}
                            width="$8"
                            textAlign="center"
                            inputMode="numeric"
                        />
                        <Button
                            key={action.name}
                            onPress={() => { buttonAction(action, sliderValue) }}
                            color="$color10"
                            title={"Description: " + action.description}
                            disabled={isRunning}
                        >
                            Send
                        </Button>
                    </XStack>
                    {renderStatus()}
                </YStack>
            );
        }
        default: {
            const schema = action?.payload?.schema;

            const NumberInput = ({
                current,
                onCommit,
                minimum,
                maximum,
                step,
                placeholder
            }: {
                current: number | string;
                onCommit: (n: number) => void;
                minimum?: number;
                maximum?: number;
                step?: number;
                placeholder?: string;
            }) => {
                const toStr = (v: any) =>
                    v === undefined || v === null || Number.isNaN(v) ? "" : String(v);

                const [text, setText] = React.useState<string>(toStr(current));

                // keep in sync if parent changes value externally
                React.useEffect(() => {
                    setText(toStr(current));
                }, [current]);

                const clamp = (n: number) => {
                    const lo = minimum ?? -Infinity;
                    const hi = maximum ?? Infinity;
                    return Math.min(hi, Math.max(lo, n));
                };

                const commit = (raw: string) => {
                    if (raw.trim() === "") {
                        const fallback = minimum ?? 0;
                        onCommit(fallback);
                        setText(String(fallback));
                        return;
                    }
                    const n = Number(raw);
                    if (isNaN(n)) {
                        // do not commit invalid; restore previous rendered value
                        setText(toStr(current));
                        return;
                    }
                    const rounded = step && step > 0 ? Math.round(n / step) * step : n;
                    const final = clamp(rounded);
                    onCommit(final);
                    setText(String(final));
                };

                return (
                    <Input
                        value={text}
                        onChange={(e) => setText(e.target.value)}        // no commit while typing
                        onBlur={(e) => commit(e.target.value)}           // commit on blur
                        onKeyDown={(e) => {
                            if (e.key === "Enter") commit(text);           // optional: commit on Enter
                        }}
                        width="$8"
                        inputMode="numeric"
                        textAlign="center"
                        placeholder={placeholder}
                    />
                );
            };

            const renderFields = (objSchema: Record<string, any>, basePath: string[] = []) =>
                Object.entries(objSchema).map(([key, field]: any) => {
                    const t = normalizeType(field?.type);
                    const path = [...basePath, key];
                    const cur = getNested(value, path);
                    const label = field?.title ?? key;
                    const labelWithInfo = (
                        <XStack gap="$2" alignItems="center">
                            <Text maxWidth="150px" whiteSpace="nowrap" textOverflow="ellipsis" overflow="hidden">{label}</Text>
                            <InfoButton description={field?.description} label={`${label} description`} />
                        </XStack>
                    );

                    if (t === "object") {
                        return (
                            <YStack key={path.join(".")} gap="$2" width="100%" mt="$2">
                                <XStack gap="$2" alignItems="center">
                                    <Text fontWeight="600">{label}</Text>
                                    <InfoButton description={field?.description} label={`${label} description`} />
                                </XStack>
                                <XStack gap="$3" flexWrap="wrap">
                                    {renderFields(field?.properties || {}, path)}
                                </XStack>
                            </YStack>
                        );
                    }

                    if (["bool", "boolean"].includes(String(field?.type ?? "").toLowerCase())) {
                        return (
                            <XStack key={path.join(".")} gap="$2" alignItems="center" width="100%">
                                {labelWithInfo}
                                <Checkbox
                                    checked={cur === undefined ? "indeterminate" : !!cur}
                                    onCheckedChange={(val) =>
                                        setValue((prev) =>
                                            setNested(prev, path, val === "indeterminate" ? true : !!val)
                                        )
                                    }
                                    aria-label={label}
                                >
                                    <Checkbox.Indicator>
                                        <Check size={14} />
                                    </Checkbox.Indicator>
                                </Checkbox>
                            </XStack>
                        );
                    }

                    if (Array.isArray(field?.enum) && field.enum.length > 0) {
                        return (
                            <XStack key={path.join(".")} gap="$2" alignItems="center" width="100%">
                                {labelWithInfo}
                                <Select
                                    value={cur ?? ""}
                                    onValueChange={(v) => setValue((prev) => setNested(prev, path, v))}
                                    disablePreventBodyScroll
                                >
                                    <Select.Trigger
                                        iconAfter={ChevronDown}
                                        width={180}          // or "$12" / any token you like
                                        maxWidth={220}
                                        flexShrink={0}
                                    >
                                        <Select.Value placeholder="Select value" numberOfLines={1} />
                                    </Select.Trigger>
                                    <Select.Content zIndex={9999999999}>
                                        <Select.Viewport>
                                            <Select.Group>
                                                {field.enum.map((ev) => (
                                                    <Select.Item key={String(ev)} value={String(ev)}>
                                                        <Select.ItemText>{String(ev)}</Select.ItemText>
                                                        <Select.ItemIndicator marginLeft="auto">
                                                            <Check size={16} />
                                                        </Select.ItemIndicator>
                                                    </Select.Item>
                                                ))}
                                            </Select.Group>
                                        </Select.Viewport>
                                    </Select.Content>
                                </Select>
                            </XStack>
                        );
                    }

                    if (t === "integer" || t === "number") {
                        const minConstraint = field?.minimum ?? field?.min;
                        const maxConstraint = field?.maximum ?? field?.max;
                        return (
                            <XStack key={path.join(".")} gap="$2" alignItems="center">
                                {labelWithInfo}
                                <NumberInput
                                    current={cur}
                                    onCommit={(n) => setValue((prev) => setNested(prev, path, n))}
                                    minimum={minConstraint}
                                    maximum={maxConstraint}
                                    step={field?.step ?? (t === "integer" ? 1 : undefined)}
                                    placeholder={label}
                                />
                            </XStack>
                        );
                    }

                    return (
                        <XStack key={path.join(".")} gap="$2" alignItems="center" width="100%">
                            {labelWithInfo}
                            <Input
                                value={cur ?? ""}
                                onChange={(e) => setValue((prev) => setNested(prev, path, e.target.value))}
                                placeholder={label}
                                flex={1}
                            />
                        </XStack>
                    );
                });

            const isValueEmpty = (val: any) =>
                val === undefined ||
                val === null ||
                (typeof val === "string" && val.trim() === "");

            const isSchemaComplete = (objSchema?: Record<string, any>, current?: any): boolean => {
                if (!objSchema || Object.keys(objSchema).length === 0) return true;
                for (const [key, field] of Object.entries(objSchema)) {
                    const t = normalizeType((field as any)?.type);
                    const rawType = String((field as any)?.type ?? "").toLowerCase();
                    const cur = current?.[key];

                    if (t === "object") {
                        const props = (field as any)?.properties || {};
                        const requiredKeys = Array.isArray((field as any)?.required) && (field as any).required.length
                            ? (field as any).required
                            : Object.keys(props);
                        for (const reqKey of requiredKeys) {
                            if (!isSchemaComplete({ [reqKey]: props[reqKey] }, cur ?? {})) return false;
                        }
                        continue;
                    }

                    if (t === "integer" || t === "number" || ["int", "integer", "float", "number"].includes(rawType)) {
                        if (cur === "" || cur === undefined || cur === null || Number.isNaN(cur)) return false;
                        const numericValue = Number(cur);
                        const minConstraint = field?.minimum ?? field?.min;
                        const maxConstraint = field?.maximum ?? field?.max;
                        if (typeof minConstraint === "number" && numericValue < minConstraint) return false;
                        if (typeof maxConstraint === "number" && numericValue > maxConstraint) return false;
                        continue;
                    }

                    if (["bool", "boolean"].includes(rawType)) {
                        if (isValueEmpty(cur)) return false;
                        continue;
                    }

                    if (Array.isArray((field as any)?.enum) && (field as any).enum.length > 0) {
                        if (isValueEmpty(cur)) return false;
                        continue;
                    }

                    if (isValueEmpty(cur)) return false;
                }
                return true;
            };

            const canSend = isSchemaComplete(schema || {}, value);
            return (
                <YStack
                    gap="$3"
                    alignSelf="stretch"
                    width="100%"
                    borderWidth="1px"
                    borderRadius="$4"
                    borderColor="$color8"
                    padding="$3"
                >
                    <XStack alignItems="center" justifyContent="space-between" gap="$2">
                        <Text whiteSpace="nowrap" textOverflow="ellipsis" overflow="hidden" fow="600" flex={1}>
                            {action.label ?? action.name}
                        </Text>
                        <InfoButton description={infoDescription} label={infoLabel} />
                    </XStack>

                    {/* recursive fields */}
                    <XStack gap="$3" flexWrap="wrap">
                        {renderFields(schema || {})}
                        <Button
                            key={action.name}
                            onPress={() => { buttonAction(action, value); }}
                            color="$color10"
                            title={"Description: " + action.description}
                            alignSelf="center"
                            width="100%"
                            disabled={isRunning || !canSend}
                        >
                            Send
                        </Button>
                        {renderStatus()}
                    </XStack>
                </YStack>
            );
        }
    }
}

// SUBSYSTEM COMPONENT IS NOW DEPRECATED NOW WE USE SUBSYSTEMS COMPONENT
const subsystem = ({ subsystem, deviceName }) => {
    const eventGenerationFlag = false;

    // Map the actions to buttons and return them as JSX
    const actionButtons = subsystem.actions?.map((action, key) => {
        return <Action key={key} deviceName={deviceName} subsystemName={subsystem.name} action={action} subsystem={subsystem} />
    });

    const monitorLabels = subsystem.monitors?.map((monitorData, key) => {
        return <Monitor key={key} deviceName={deviceName} monitorData={monitorData} subsystem={subsystem} />
    });

    return (
        <ContainerLarge position="relative" borderRadius="10px" mt="10px">
            <Tinted>
                <XStack alignItems="center" justifyContent="space-between">
                    <XStack alignItems="center" gap="$2">
                        <Paragraph textAlign='left' color={'$color10'}>{subsystem.name}</Paragraph>
                        <InfoButton description={getSubsystemDescription(subsystem)} label={`${subsystem?.name ?? "Subsystem"} description`} />
                    </XStack>
                    {eventGenerationFlag ? <Switch id={"pa"} size="$2" defaultChecked={subsystem.generateEvent}>
                        <Switch.Thumb animation="quick" />
                    </Switch> : null}
                </XStack>
                <YStack mb="10px" mt="10px" alignSelf='flex-start'>
                    {actionButtons?.length > 0 ? <XStack gap="$2" flexWrap='wrap' mt="10px" mb="10px">
                        {actionButtons}
                    </XStack> : null}
                    {monitorLabels?.length > 0 ? <XStack gap="$3" flexWrap='wrap' mt="10px" mb="10px">
                        {monitorLabels}
                    </XStack> : null}
                </YStack>
            </Tinted>
        </ContainerLarge>

    );
}

export const Subsystems = ({ subsystems, deviceName }) => <YStack maxHeight={750} overflow="scroll" padding="$2" paddingTop="20px">
    <>
        <YStack gap="$3" width="100%" maxWidth={800}>
            {
                subsystems
                    .sort((a, b) => {
                        if (a.monitors && !a.actions && b.actions) return -1;
                        if (!a.monitors && a.actions && b.monitors) return 1;
                        return 0;
                    })
                    .map((subsystem, key) => <>
                        <XStack alignItems="center" gap="$2" mt="$4">
                            <Text fow="600">{subsystem.name}</Text>
                            <InfoButton description={getSubsystemDescription(subsystem)} label={`${subsystem?.name ?? "Subsystem"} description`} />
                        </XStack>
                        {
                            subsystem.monitors?.length > 0 && <>
                                <XStack flexWrap="wrap" gap="$3">
                                    {
                                        subsystem.monitors.map((monitor) => <Monitor key={key} deviceName={deviceName} monitorData={monitor} subsystem={subsystem} />)
                                    }
                                </XStack>
                            </>
                        }
                        {
                            subsystem.actions?.length > 0 && <>
                                <XStack flexWrap="wrap" gap="$3">
                                    {
                                        subsystem.actions.map((action) => <Action key={key} deviceName={deviceName} subsystemName={subsystem.name} action={action} subsystem={subsystem} />)
                                    }
                                </XStack>
                            </>
                        }
                    </>)

            }
        </YStack>
    </>
</YStack>

export default subsystem

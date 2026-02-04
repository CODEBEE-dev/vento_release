import { Popover, Square, useTheme, XStack } from "@my/ui"
import { SketchPicker } from "react-color";
import { Input } from "./Input";

type Props = {
    color: string,
    onChange: (color: any) => void,
    placeholder?: string,
    inputProps?: any,
    mode?: 'sketch' | 'custom',
    presetColors?: string[],
    popoverProps?: any,
    disabled?: boolean,
}

export const InputColor = ({ color, onChange, placeholder, inputProps, mode, presetColors, popoverProps = {}, disabled = false }: Props) => {
    const theme = useTheme()

    if (disabled) {
        return (
            <XStack f={1}>
                <Input
                    f={1}
                    value={color}
                    placeholder={placeholder ?? "#000000"}
                    disabled
                    {...inputProps}
                />
                <Square
                    size="$2"
                    backgroundColor={color}
                    borderColor="$color"
                    borderRadius="$2"
                    position="absolute"
                    borderWidth="$0.5"
                    right="8px"
                    top="8px"
                    opacity={0.6}
                    style={{ pointerEvents: "none" }}
                />
            </XStack>
        );
    }

    return <Popover
        allowFlip
    >
        <Popover.Trigger f={1}>
            <Input
                f={1}
                value={color}
                placeholder={placeholder ?? "#000000"}
                {...inputProps}
            />
            <Square
                size="$2"
                backgroundColor={color}
                borderColor="$color"
                borderRadius="$2"
                cursor="pointer"
                position="absolute"
                borderWidth="$0.5"
                right="8px"
                top="8px"
            />
        </Popover.Trigger>
        <Popover.Content backgroundColor="$bgPanel" width='250px' shadowRadius={"$4"} shadowColor={"black"} shadowOpacity={0.3} {...popoverProps}>
            {
                mode == "custom"
                    ? <XStack gap="$2" flexWrap="wrap">
                        {
                            presetColors?.map((presetColor) => (
                                <Square
                                    key={presetColor}
                                    size={30}
                                    backgroundColor={presetColor == "default" ? "transparent" : presetColor}
                                    borderRadius="$2"
                                    cursor="pointer"
                                    borderWidth={color === presetColor ? 3 : 1}
                                    borderColor={presetColor == "default" ? "$red8" : color === presetColor ? "$color" : "$gray7"}
                                    onPress={() => onChange(presetColor)}
                                />
                            ))
                        }
                    </XStack>
                    : <SketchPicker
                        color={color}
                        presetColors={presetColors ?? [
                            theme.orange9.val, theme.yellow9.val, theme.green9.val, theme.blue9.val, theme.purple9.val, theme.pink9.val, theme.red9.val, theme.gray9.val,
                            theme.orange7.val, theme.yellow7.val, theme.green7.val, theme.blue7.val, theme.purple7.val, theme.pink7.val, theme.red7.val, theme.gray7.val,
                        ]}
                        onChange={onChange}
                        disableAlpha={true}
                        styles={{
                            default: {
                                picker: {
                                    background: 'transparent',
                                    border: '0px',
                                    boxShadow: 'none',
                                    width: '210px',
                                }
                            }
                        }}
                    />}
        </Popover.Content>
    </Popover>
}

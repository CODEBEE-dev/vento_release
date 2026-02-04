import React, { Children, cloneElement, isValidElement } from 'react'
import { YStack, XStack, Label, Input, Checkbox } from "@my/ui"
import { Check } from 'lucide-react'
import { Toggle } from './Toggle'
import { SelectList } from './SelectList'

// ============================================================================
// INTERNAL COMPONENTS (not exported)
// ============================================================================

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <Label ml="$3" h="$3.5" color="$text" size="$6" fontWeight={500}>
        {children}
    </Label>
)

const SettingRow = ({ label, description, children, noDivider = false, onPress }: {
    label: string
    description?: string
    children: React.ReactNode
    noDivider?: boolean
    onPress?: () => void
}) => (
    <YStack>
        <XStack
            ai="center"
            justifyContent="space-between"
            gap="$5"
            {...(onPress ? {
                cursor: 'pointer',
                hoverStyle: { opacity: 0.8 },
                onPress
            } : {})}
        >
            <YStack gap="0px" flex={1}>
                <Label color="$text" fontSize="$5" lineHeight="fit-content">
                    {label}
                </Label>
                {description && (
                    <Label fontSize="$4" color="$gray10" lineHeight="fit-content">
                        {description}
                    </Label>
                )}
            </YStack>
            {children}
        </XStack>
        {!noDivider && <YStack width="100%" height={2} backgroundColor="$bgContent" opacity={0.7} my="$3" />}
    </YStack>
)
SettingRow.displayName = 'SettingRow'

const SettingInput = (props: any) => (
    <Input
        minWidth={280}
        backgroundColor="$bgContent"
        borderColor="$gray6"
        borderWidth={1}
        placeholderTextColor="$gray9"
        borderRadius={8}
        {...props}
    />
)

// ============================================================================
// PUBLIC COMPONENTS
// ============================================================================

type SettingBaseProps = {
    label: string
    description?: string
    noDivider?: boolean
    disabled?: boolean
    onPress?: () => void
}

type SettingWithValue<T extends string, V> = SettingBaseProps & {
    type: T
    value: V
    onChange: (value: V) => void
}

type SettingToggleProps = SettingWithValue<'toggle', boolean>
type SettingCheckboxProps = SettingWithValue<'checkbox', boolean>
type SettingTextProps = SettingWithValue<'text', string> & { placeholder?: string }
type SettingSecretProps = SettingWithValue<'secret', string> & { placeholder?: string }
type SettingSelectProps = SettingWithValue<'select', string> & { options: { value: string; label: string }[] }
type SettingCustomProps = SettingBaseProps & { type?: never; control: React.ReactNode }

export type SettingProps =
    | SettingToggleProps
    | SettingCheckboxProps
    | SettingTextProps
    | SettingSecretProps
    | SettingSelectProps
    | SettingCustomProps

/**
 * Setting component - renders the appropriate control based on type,
 * or accepts a custom control via the `control` prop
 *
 * @example // Toggle
 * <Setting
 *   type="toggle"
 *   label="Enable Feature"
 *   description="Turn this feature on or off"
 *   value={enabled}
 *   onChange={setEnabled}
 * />
 *
 * @example // Select
 * <Setting
 *   type="select"
 *   label="Choose Option"
 *   value={selected}
 *   onChange={setSelected}
 *   options={[{ value: 'a', label: 'Option A' }]}
 * />
 *
 * @example // Custom control
 * <Setting
 *   label="Icon"
 *   description="Select an icon"
 *   control={<IconSelect ... />}
 * />
 *
 * @example // Clickable link
 * <Setting
 *   label="Advanced Settings"
 *   description="View all settings"
 *   control={<ChevronRight />}
 *   onPress={() => navigate('/settings/advanced')}
 * />
 */
export const Setting = (props: SettingProps) => {
    const { label, description, noDivider = false, disabled = false, onPress } = props

    // Custom control - just render what was passed
    if ('control' in props && props.control !== undefined) {
        return (
            <SettingRow label={label} description={description} noDivider={noDivider} onPress={onPress}>
                {props.control}
            </SettingRow>
        )
    }

    const { type } = props as SettingToggleProps | SettingSelectProps | SettingTextProps | SettingSecretProps | SettingCheckboxProps

    // Checkbox has a different layout - inline with label
    if (type === 'checkbox') {
        const checkboxProps = props as SettingCheckboxProps
        return (
            <YStack>
                <XStack ai="center" gap="$2">
                    <Checkbox
                        w="$2"
                        h="$2"
                        focusStyle={{ outlineWidth: 0 }}
                        checked={checkboxProps.value}
                        onCheckedChange={checkboxProps.onChange}
                        disabled={disabled}
                        className="no-drag"
                        backgroundColor="$bgContent"
                        borderColor="$gray6"
                    >
                        <Checkbox.Indicator>
                            <Check size={16} color='var(--color8)' />
                        </Checkbox.Indicator>
                    </Checkbox>
                    <Label>{label}</Label>
                </XStack>
                {!noDivider && <YStack width="100%" height={2} backgroundColor="$bgContent" opacity={0.7} my="$3" />}
            </YStack>
        )
    }

    let control: React.ReactNode = null

    switch (type) {
        case 'toggle': {
            const toggleProps = props as SettingToggleProps
            control = (
                <Toggle
                    checked={toggleProps.value}
                    onChange={toggleProps.onChange}
                    disabled={disabled}
                />
            )
            break
        }

        case 'select': {
            const selectProps = props as SettingSelectProps
            control = (
                <YStack minWidth={280}>
                    <SelectList
                        triggerProps={{ backgroundColor: '$bgContent', borderWidth: 1, borderColor: '$gray6' }}
                        title={label}
                        value={selectProps.value}
                        elements={selectProps.options.map(opt => ({ value: opt.value, caption: opt.label }))}
                        setValue={selectProps.onChange}
                        disabled={disabled}
                    />
                </YStack>
            )
            break
        }

        case 'text': {
            const textProps = props as SettingTextProps
            control = (
                <SettingInput
                    value={textProps.value}
                    placeholder={textProps.placeholder ?? label}
                    onChangeText={textProps.onChange}
                    disabled={disabled}
                />
            )
            break
        }

        case 'secret': {
            const secretProps = props as SettingSecretProps
            control = (
                <SettingInput
                    value={secretProps.value}
                    placeholder={secretProps.placeholder ?? '••••••••'}
                    onChangeText={secretProps.onChange}
                    secureTextEntry
                    disabled={disabled}
                />
            )
            break
        }
    }

    return (
        <SettingRow label={label} description={description} noDivider={noDivider} onPress={onPress}>
            {control}
        </SettingRow>
    )
}
Setting.displayName = 'Setting'

type SettingsGroupProps = {
    title: string
    children: React.ReactNode
}

/**
 * SettingsGroup - groups settings with a title and background panel
 * Automatically handles dividers (last child won't have a divider)
 * Only passes noDivider to Setting and SettingRow components
 *
 * @example
 * <SettingsGroup title="AI & Chat">
 *   <Setting type="toggle" label="Enable AI" ... />
 *   <Setting type="select" label="Provider" ... />
 * </SettingsGroup>
 */
export const SettingsGroup = ({ title, children }: SettingsGroupProps) => {
    const childArray = Children.toArray(children).filter(isValidElement)

    // Find the last Setting/SettingRow child to mark it with noDivider
    let lastSettingIndex = -1
    childArray.forEach((child, index) => {
        if (isValidElement(child)) {
            const displayName = (child as any).type?.displayName || (child as any).type?.name || ''
            if (displayName === 'Setting' || displayName === 'SettingRow') {
                lastSettingIndex = index
            }
        }
    })

    const childrenWithProps = childArray.map((child, index) => {
        if (isValidElement(child)) {
            const displayName = (child as any).type?.displayName || (child as any).type?.name || ''
            if (displayName === 'Setting' || displayName === 'SettingRow') {
                return cloneElement(child as React.ReactElement<any>, {
                    noDivider: index === lastSettingIndex
                })
            }
        }
        return child
    })

    return (
        <YStack>
            <SectionTitle>{title}</SectionTitle>
            <YStack borderRadius="$3" p="$4" backgroundColor="$bgPanel">
                {childrenWithProps}
            </YStack>
        </YStack>
    )
}

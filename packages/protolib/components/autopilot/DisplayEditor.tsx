import React, { useMemo, useState, useCallback } from 'react'
import { YStack, XStack, Input } from '@my/ui'
import { v4 as uuidv4 } from 'uuid'
import { IconSelect } from '../IconSelect'
import { InputColor } from '../InputColor'
import { useBoardLayer } from '@extensions/boards/store/boardStore'
import { Setting, SettingsGroup } from '../SettingsComponents'

const colors = ["orange", "yellow", "green", "blue", "purple", "pink", "red", "gray"]
const colorShades = [11, 9, 7, 5]
const presetColors = [...colorShades.reduce((total, current) => {
    colors.forEach((val) => {
        total.push(`var(--${val}${current})`)
    })
    return total
}, []), "default"]

type SettingDef = {
    key: string
    label: string
    description?: string
    section: string
    type: 'checkbox' | 'text' | 'toggle' | 'select'
    indent?: number
    placeholder?: string
    visible?: (ctx: { card: any; cardData: any }) => boolean
    // get/set custom for especial cases (tokens, buttonMode...)
    get?: (cardData: any, card: any) => any
    set?: (cardData: any, value: any) => any // returns new cardData
    // For 'select' type
    options?: { value: string; caption: string }[]
}

export const DisplayEditor = ({
    card,
    cardData,
    setCardData,
    icons,
    board,
    style,
    readOnly = false,
}: {
    card: any
    cardData: any
    icons: any
    setCardData: (data: any) => void
    board: any
    style?: any
    readOnly?: boolean
}) => {
    const [error, setError] = useState<string | null>(null)
    const [filter, setFilter] = useState("")

    const getCheckedDefault = useCallback((cd: any, key: string, noValueIs: boolean = false) => {
        if (cd[key] === undefined) return noValueIs
        return cd[key]
    }, [])
    const [activeLayer] = useBoardLayer();

    const settings: SettingDef[] = [
        // ----- General -----
        { label: 'Keep value permanently', description: 'Persiste the value of the card on project restart', key: 'persistValue', type: 'toggle', section: 'General', visible: ({ card }) => card.type === 'action' },
        { label: 'Autorun on start', description: 'Autorun the card on board start', key: 'autorun', type: 'toggle', section: 'General', visible: ({ card }) => card.type === 'action' },
        { label: 'Always report value', description: 'Report the card value on each execution to the board', key: 'alwaysReportValue', type: 'toggle', section: 'General' },
        { label: 'Keep history', description: 'Save value changes to history database', key: 'keepHistory', type: 'toggle', section: 'General' },
        { label: 'History retention (days)', description: 'Number of days to keep history entries (default 30)', key: 'historyRetentionDays', type: 'text', section: 'General', indent: 1, visible: ({ cardData }) => !!cardData.keepHistory, get: (cd) => cd.historyRetentionDays ?? '30' },
        { label: 'Natural language rules', description: 'Enable natural language rules view', key: 'editRulesInNaturalLanguage', type: 'toggle', section: 'General', get: (cd) => cd.editRulesInNaturalLanguage !== false },
        { label: 'Low code', description: 'Enable low code view', key: 'editRulesInLowCode', type: 'toggle', section: 'General', get: (cd) => cd.editRulesInLowCode !== false },
        { label: 'Layer', description: 'Layer to show the card in', key: 'layer', type: 'text', section: 'General', get: (cd) => cd.layer ?? activeLayer },
        // ----- Ephemeral State -----
        {
            label: 'State Mode',
            description: 'Controls how this card handles state during concurrent execution',
            key: 'stateMode',
            type: 'select',
            section: 'Ephemeral State',
            visible: ({ card }) => card.type === 'action',
            options: [
                { value: 'default', caption: 'Default (inherit from board)' },
                { value: 'ephemeral', caption: 'Ephemeral (isolated per request)' },
                { value: 'non-ephemeral', caption: 'Non-ephemeral (shared state)' }
            ],
            get: (cd) => cd.stateMode ?? 'default'
        },
        {
            label: 'Chain Terminator',
            description: 'When enabled, cleans up the ephemeral context after this action completes',
            key: 'chainTerminator',
            type: 'toggle',
            section: 'Ephemeral State',
            visible: ({ card }) => card.type === 'action'
        },
        // ----- Display -----
        { label: 'Display title', description: 'Show name of the card as title', key: 'displayTitle', type: 'toggle', section: 'Display', get: (cd) => cd.displayTitle !== false },
        { label: 'Display icon', description: 'Show the card icon', key: 'displayIcon', type: 'toggle', section: 'Display', get: (cd) => cd.displayIcon !== false },
        { label: 'Display frame', description: 'Show a background frame to the card content', key: 'displayFrame', type: 'toggle', section: 'Display', get: (cd) => cd.displayFrame !== false },
        { label: 'Markdown display', description: 'Show the card output as formatted markdown', key: 'markdownDisplay', type: 'toggle', section: 'Display' },
        { label: 'Html display', description: 'Show the card output as formatted html', key: 'htmlDisplay', type: 'toggle', section: 'Display' },
        { label: 'Display value', description: 'Show the card output value on the card', key: 'displayResponse', type: 'toggle', section: 'Display', get: (cd) => cd.displayResponse !== false, visible: ({ card }) => card.type === 'action' },
        { label: 'Display button', description: 'Show the card execution button', key: 'displayButton', type: 'toggle', section: 'Display', get: (cd) => cd.displayButton !== false, visible: ({ card }) => card.type === 'action' },
        { label: 'Button text', description: 'Displayed text on the execution button', key: 'buttonLabel', type: 'text', section: 'Display', visible: ({ card, cardData }) => card.type === 'action' && !!getCheckedDefault(cardData, 'displayButton', true) },
        {
            label: 'Button Full',
            description: 'Grow the button size to fill the card size',
            key: 'buttonMode',
            type: 'toggle',
            section: 'Display',
            visible: ({ card, cardData }) => card.type === 'action' && !!getCheckedDefault(cardData, 'displayButton', true),
            get: (cd) => cd.buttonMode === 'full',
            set: (cd, checked) => {
                if (checked) return { ...cd, buttonMode: 'full' }
                const { buttonMode, ...rest } = cd
                return rest
            },
        },
        {
            label: 'Display button icon',
            description: 'Show the card icon on the execution button',
            key: 'displayButtonIcon',
            type: 'toggle',
            section: 'Display',
            visible: ({ card, cardData }) => card.type === 'action' && !!getCheckedDefault(cardData, 'displayButton', true),
            get: (cd) => cd.displayButtonIcon === true,
            set: (cd, checked) => ({ ...cd, displayButtonIcon: !!checked }),
        },
        { label: 'Auto Minimize', description: 'Enable card auto minimize to show in reduced space boards', key: 'autoResponsive', type: 'toggle', section: 'Display', get: (cd) => cd.autoResponsive !== false },

        // ----- Paths and Permissions -----
        {
            label: 'API access',
            description: 'Allow access to this card through the API.',
            key: 'apiAccess',
            type: 'toggle',
            section: 'Paths and Permissions',
            get: (cd) => Object.keys(cd.tokens ?? {}).length > 0,
            set: (cd, checked) => {
                if (checked) return { ...cd, tokens: { read: uuidv4(), run: uuidv4() } }
                const { tokens, ...rest } = cd
                return rest
            },
        },
        { label: 'User access', key: 'userAccess', type: 'toggle', section: 'Paths and Permissions' },
        { label: 'Admin access', key: 'adminAccess', type: 'toggle', section: 'Paths and Permissions' },

        { label: 'Allow public read', description: 'Allow the read of the card content outside board', key: 'publicRead', type: 'toggle', section: 'Paths and Permissions' },
        { label: 'Card read path', description: 'Path to read the content of the card outside the board. This setting requires <Allow public read> to be enabled.', key: 'enableCustomPath', type: 'toggle', section: 'Paths and Permissions' },
        {
            label: 'Path to card',
            key: 'customPath',
            type: 'text',
            section: 'Paths and Permissions',
            indent: 1,
            visible: ({ cardData }) => !!cardData.enableCustomPath,
            get: (cd) => cd.customPath ?? `/workspace/cards/${cd.name}`,
        },
        { label: 'Card page path', description: 'Path of the card content page. This setting requires <Allow public read> to be enabled.', key: 'customCardViewPath', type: 'text', placeholder: "Path to card (Ex: /card)", section: 'Paths and Permissions' },
        // @ts-ignore
        ...(cardData.type === "action"
            ? [
                { label: 'Event Trigger', description: 'event path triggering this action', key: 'eventPath', type: 'text', placeholder: "Event path trigger (Ex: auth/login/done)", section: 'Paths and Permissions' },
                { label: 'Default Input', description: 'The default input name for this action. Used by Event Trigger and similar triggers to know the name of the input to put the event payload into.', key: 'defaultInput', type: 'text', placeholder: "Default input name", section: 'Paths and Permissions' },
                { label: 'Allow public run', key: 'publicRun', type: 'toggle', section: 'Paths and Permissions' },
                { label: 'Custom run path', key: 'enableCustomRunPath', type: 'toggle', section: 'Paths and Permissions' },
                {
                    label: 'Path to card run',
                    key: 'customRunPath',
                    type: 'text',
                    section: 'Paths and Permissions',
                    indent: 1,
                    visible: ({ cardData }) => !!cardData.enableCustomRunPath,
                    get: (cd) => cd.customRunPath ?? `/workspace/cards/${cd.name}/run`,
                },

                { label: 'Run Card Page Path', key: 'customCardRunViewPath', type: 'text', placeholder: "Path to card run (Ex: /card/run)", section: 'Paths and Permissions' },
                { label: 'Request approval', description: 'Require user approval before executing this action', key: 'requestApproval', type: 'toggle', section: 'Paths and Permissions', visible: ({ card }) => card.type === 'action' },
                { label: 'Approval message', description: 'Custom message shown when requesting approval', key: 'approvalMessage', type: 'text', section: 'Paths and Permissions', indent: 1, visible: ({ card, cardData }) => card.type === 'action' && !!(cardData?.requestApproval === true), placeholder: 'Explain what this action will do' },
            ]
            : []
        ),
    ]

    // Group settings by section and filter by visible
    const settingsBySection = useMemo(() => {
        const acc: Record<string, SettingDef[]> = {}
        const ctx = { card, cardData }
        for (const s of settings) {
            if (s.visible && !s.visible(ctx)) continue
            if (!acc[s.section]) acc[s.section] = []
            acc[s.section].push(s)
        }
        return acc
    }, [settings, card, cardData])

    const renderSetting = (s: SettingDef) => {
        const getValue = () => {
            if (s.type === 'checkbox' || s.type === 'toggle') {
                return s.get ? !!s.get(cardData, card) : getCheckedDefault(cardData, s.key)
            }
            return s.get ? s.get(cardData, card) : cardData?.[s.key] ?? ''
        }

        const handleChange = (newValue: any) => {
            if (readOnly) return
            if (s.set) setCardData(s.set(cardData, newValue))
            else setCardData({ ...cardData, [s.key]: newValue })
        }

        const settingProps: any = {
            type: s.type,
            label: s.label,
            description: s.description,
            value: getValue(),
            onChange: handleChange,
            disabled: readOnly,
            ...(s.type === 'select' && { options: (s.options ?? []).map(opt => ({ value: opt.value, label: opt.caption })) }),
            ...(s.type === 'text' && { placeholder: s.placeholder ?? s.label }),
        }

        return s.indent
            ? <YStack key={s.key} ml={`$${s.indent * 4}`}><Setting {...settingProps} /></YStack>
            : <Setting key={s.key} {...settingProps} />
    }

    return (
        <XStack f={1} gap="$6" style={style}>
            <YStack py="$6" pl="$5" gap="$4">
                <Setting
                    label="Icon"
                    control={
                        <YStack minWidth={280}>
                            <IconSelect
                                br={"8px"}
                                inputProps={{ backgroundColor: '$bgPanel', borderColor: error ? '$red9' : '$gray6' }}
                                icons={icons}
                                onSelect={(icon) => setCardData({ ...cardData, icon })}
                                selected={cardData.icon}
                                disabled={readOnly}
                            />
                        </YStack>
                    }
                    noDivider
                />
                <Setting
                    label="Main Color"
                    control={
                        <YStack minWidth={280}>

                            <InputColor
                                br={"8px"}
                                color={cardData.color ?? ""}
                                mode='custom'
                                presetColors={presetColors}
                                popoverProps={{ width: "325px" }}
                                placeholder='#F7B500 or var(--yellow9)'
                                onChange={(color) => {
                                    if (readOnly) return
                                    if (color === "default") {
                                        delete cardData.color
                                    } else {
                                        cardData.color = color
                                    }
                                    setCardData({ ...cardData })
                                }}
                                inputProps={{
                                    backgroundColor: '$bgPanel',
                                    borderColor: error ? '$red9' : '$gray6',
                                    onChange: e => {
                                        if (readOnly) return
                                        setCardData({ ...cardData, color: e.target.value })
                                    }
                                }}
                                disabled={readOnly}
                            />
                        </YStack>
                    }
                    noDivider
                />
                {cardData.displayFrame !== false && (
                    <Setting
                        label="Background Color"
                        control={
                            <YStack minWidth={280}>
                                <InputColor
                                    br={"8px"}
                                    color={cardData.bgColor ?? ""}
                                    mode='custom'
                                    placeholder='#F7B500 or var(--yellow9)'
                                    presetColors={presetColors}
                                    popoverProps={{ width: "325px" }}
                                    onChange={(color) => {
                                        if (readOnly) return
                                        if (color === "default") {
                                            delete cardData.bgColor
                                        } else {
                                            cardData.bgColor = color
                                        }
                                        setCardData({ ...cardData })
                                    }}
                                    inputProps={{
                                        backgroundColor: '$bgPanel',
                                        borderColor: error ? '$red9' : '$gray6',
                                        onChange: e => {
                                            if (readOnly) return
                                            setCardData({ ...cardData, bgColor: e.target.value })
                                        }
                                    }}
                                    disabled={readOnly}
                                />
                            </YStack>
                        }
                        noDivider
                    />
                )}
            </YStack>

            <YStack pb="$7" pr="$5" overflow='auto' overflowBlock='scroll' flex={1} >
                <YStack
                    pos='sticky' top="0px" left="0px" zIndex={20} pt="$6" px="$3"
                >
                    <Input
                        zi={1}
                        br={"8px"}
                        value={filter}
                        fontSize={"$5"}
                        placeholderTextColor={"$gray8"}
                        disabled={readOnly}
                        style={{
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            background: 'color-mix(in srgb, var(--bgPanel) 50%, transparent)',
                        }}
                        boc="$gray6"
                        color={error ? '$red9' : undefined}
                        onChangeText={(t) => {
                            setFilter(t)
                        }}
                        placeholder='Search for a setting'
                    />
                </YStack>
                <YStack display="grid" pt="$3" gap="$2" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    {Object.entries(settingsBySection).map(([section, items]) => {
                        // disable half sections for the moment
                        // const layout = section == "General" ? 'full' : 'half'
                        // const gridColumn = layout === 'full' ? '1 / -1' : 'auto'
                        const layout = "full"
                        const gridColumn = "1 / -1"
                        const loweredFilter = filter.toLowerCase()
                        const filteredItems = items.filter((i) => i?.label?.toLocaleLowerCase()?.includes(loweredFilter) || i?.description?.toLocaleLowerCase()?.includes(loweredFilter)) ?? []
                        return (
                            // @ts-ignore
                            <>
                                {
                                    filteredItems.length
                                        ? <YStack key={section} gridColumn='1 / -1' $gtMd={{ gridColumn }} >
                                            <SettingsGroup title={section}>
                                                {filteredItems.map(renderSetting)}
                                            </SettingsGroup>
                                        </YStack>
                                        : <></>
                                }
                            </>
                        )
                    })}
                </YStack>
            </YStack>
        </XStack >
    )
}

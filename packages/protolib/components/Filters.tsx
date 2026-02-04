import { DatePicker } from './datepickers';
import { Tinted } from './Tinted'
import { SelectList } from './SelectList'
import { Filter, X, RefreshCcw } from '@tamagui/lucide-icons'
import { XStack, Button, Popover, Text, Label, YStack, Tooltip, Input, Stack, Switch, Circle } from '@my/ui'
import { Fragment, useState } from 'react';
import { usePageParams } from '../next';
import { Chip } from './Chip';
import { InteractiveIcon } from './InteractiveIcon';

type FiltersType = {
    model: any,
    state: any,
    customFilters?: any
    extraFilters?: any[]
}

export const QueryFilters = ({ state, extraFilters }) => {
    const { removePush, query } = usePageParams(state)

    const queryKeys = Object.keys(query)
    const extraFiltersKeys = extraFilters?.map((extraFilter) => extraFilter.queryParam)
    const queryFilters = queryKeys.filter(q => q.startsWith('filter') || extraFiltersKeys?.includes(q))

    return <XStack gap="$2" mt="$2" flexWrap='wrap' f={1}>
        {
            queryFilters.map((q, i) => <Tooltip key={i}>
                <Tooltip.Trigger cursor='pointer' >
                    <Chip color={"$color7"} text={q.replace('filter[', '').replace(']', '')} textProps={{ fontWeight: '400', fontSize: 12 }} gap="$2" pl="$1" pr="$3" py="$1">
                        <Button onPress={() => removePush(q)} size="$1" circular={true}>
                            <X size={12} color={"var(--color8)"}></X>
                        </Button>
                    </Chip>
                </Tooltip.Trigger>
                <Tooltip.Content
                    enterStyle={{ x: 0, y: -5, opacity: 0, scale: 0.9 }}
                    exitStyle={{ x: 0, y: -5, opacity: 0, scale: 0.9 }}
                    scale={1}
                    backgroundColor={"$color9"}
                    x={0}
                    y={5}
                    opacity={1}
                    zIndex={9999999999}
                    animation={[
                        'quick',
                        {
                            opacity: {
                                overshootClamping: true,
                            },
                        },
                    ]}
                >
                    <Text fontSize={12} color={"white"}>{query[q]}</Text>
                </Tooltip.Content>
            </Tooltip>
            )
        }
    </XStack>
}


export const Filters = ({ model, state, customFilters, extraFilters }: FiltersType) => {

    const [open, setOpen] = useState(false)
    const { push, removePush, query } = usePageParams(state)
    const schema = model.getObjectSchema()
    const shape = schema?.shape
    const schemaKeys = Object.keys(shape || {})

    const hasAnyFilterable = schemaKeys.some(key => {
        const def = shape[key]?._def?.innerType?._def ?? shape[key]?._def
        if (!def) return false
        if (customFilters?.[key]?.component) return true
        return ['ZodBoolean', 'ZodDate', 'ZodUnion', 'ZodNumber'].includes(def?.typeName)
    }) || extraFilters.length

    if (!hasAnyFilterable) return null  // Hide Filters menu if no filterable fields or extra filters

    const onClear = () => {
        removePush(Object.keys(query).filter(q => q.startsWith('filter')))
    }

    const getExtraFilter = (extraFilter) => {
        const key = extraFilter.queryParam
        const changesFilterExtra = (value) => {
            value !== undefined
                ? push(key, value)
                : removePush(key)
        }
        var currentValue: any = query[key]
        return <>
            {!extraFilter.hideLabel && <Label>{extraFilter.label ?? key}</Label>}
            {
                extraFilter.component(currentValue, changesFilterExtra)
            }
        </>
    }

    const getFilter = (def, key) => {

        var value: any = query[`filter[${key}]`]

        if (def?.typeName === 'ZodBoolean') {
            if (value === "true") value = true
            else if (value === "false") value = false
        }

        const onFilter = (value) => {
            value !== undefined
                ? push(`filter[${key}]`, value)
                : removePush(`filter[${key}]`)
        }

        if (def.filter == false) return

        const customFilter = customFilters[key]

        if (customFilters && customFilter && customFilter.component) {
            return <>
                {!customFilter.hideLabel && <Label>{customFilter.label ?? key}</Label>}
                {customFilter.component(value, onFilter)}
            </>
        }

        if (def?.typeName === 'ZodBoolean') {
            const isUndefined = value === undefined
            return <>
                <Label>{key}</Label>
                <Tinted>
                    <Stack flexDirection="row" gap="$2" alignItems="center">
                        <Switch cursor="pointer" checked={value === true} onCheckedChange={onFilter} size="$2" bc="$color7">
                            {/*@ts-ignore*/}
                            <Switch.Thumb style={{ width: isUndefined ? '100%' : '50%' }} animation="quick">
                                {isUndefined ? <Stack enterStyle={{ opacity: 0 }} alignSelf="center"><Circle size={18} fillOpacity={1} fill="var(--color)"></Circle></Stack> : null}
                            </Switch.Thumb>
                        </Switch>
                        <InteractiveIcon IconColor='$gray10' Icon={RefreshCcw} onPress={() => removePush(`filter[${key}]`)} />
                    </Stack>
                </Tinted>
            </>
        } else if (def?.typeName === 'ZodDate') {
            return <>
                <Label>{key}</Label>
                <DatePicker
                    selectedDates={value ? [new Date(value)] : []}
                    onDatesChange={([selectedDate]) => onFilter(selectedDate ? new Date(selectedDate).toISOString() : undefined)}
                />
            </>
        } else if (def?.typeName === 'ZodUnion') {
            const options = def.options?.map(option => option._def.value)
            return <Fragment key={key}>
                <Label>{key}</Label>
                <SelectList
                    triggerProps={{ bc: "$bgContent" }}
                    titleStyle={{ normal: { bc: "$bgContent" } }}
                    rowStyle={{ normal: { bc: "$bgContent" }, hover: { filter: "brightness(0.5)", bc: "$bgContent" } }}

                    value={value}
                    title={key}
                    elements={options}
                    setValue={(val) => onFilter(val)}
                />
            </Fragment>
        } else if (def?.typeName === 'ZodNumber') {
            const fromKey = `filter[${key}][from]`
            const toKey = `filter[${key}][to]`
            const fromValue = query[fromKey]
            const toValue = query[toKey]

            const onFilterFrom = (val) => {
                val !== undefined && val !== ''
                    ? push(fromKey, val)
                    : removePush(fromKey)
            }
            const onFilterTo = (val) => {
                val !== undefined && val !== ''
                    ? push(toKey, val)
                    : removePush(toKey)
            }

            return <YStack maw="$20" key={key}>
                <Label>{key}</Label>
                <XStack gap={'$2'}>
                    <Input
                        bc="$bgContent"
                        type="number"
                        placeholder="From"
                        value={fromValue ?? ''}
                        onChange={(e: any) => onFilterFrom(e?.target?.value)}
                        onChangeText={(t: any) => onFilterFrom(t)}
                    />
                    <Input
                        bc="$bgContent"
                        type="number"
                        placeholder="To"
                        value={toValue ?? ''}
                        onChange={(e: any) => onFilterTo(e?.target?.value)}
                        onChangeText={(t: any) => onFilterTo(t)}
                    />
                </XStack>
            </YStack>
        }
    }

    return <Popover
        open={open}
        onOpenChange={setOpen}
        size="$5"
    >
        <Popover.Trigger>
            <Tinted>
                <Button onPress={() => setOpen(!open)} transparent circular icon={<Filter fillOpacity={0} color={'$color10'} size={16} />} />
            </Tinted>
        </Popover.Trigger>
        <Popover.Content
            backgroundColor={"$bgPanel"}
            borderWidth={1}
            borderColor="$borderColor"
            elevate
            mr={'$4'}
            maxWidth={"350px"}
        >
            <Popover.Arrow ml={'$4'} borderWidth={1} borderColor="$borderColor" bc="$bgPanel" />
            <YStack miw={'$20'} gap={'$2'}>
                <Text fontWeight="bold">Filters</Text>
                <Tinted key="filter" >
                    <XStack gap={'$2'} mt="$2" flexWrap='wrap'>
                        <QueryFilters state={state} extraFilters={extraFilters} />
                    </XStack>
                </Tinted>
                <YStack overflow='auto' p="2px" maxHeight="300px">
                    {schemaKeys.map((key) => {
                        const def = schema.shape[key]._def?.innerType?._def ?? schema.shape[key]._def
                        return <Fragment key={key}>
                            {getFilter(def, key)}
                        </Fragment>
                    })}
                    {
                        extraFilters?.map((extraFilter) => {
                            if (!extraFilter.queryParam || !extraFilter.component) return
                            return <Fragment key={extraFilter.queryParam}>
                                {getExtraFilter(extraFilter)}
                            </Fragment>
                        })
                    }
                </YStack>
                <XStack mt={'$4'} jc={'flex-end'} gap={'$3'} p={'$3'}>
                    <Tinted>
                        <Button bc="$color6" icon={RefreshCcw} onPress={onClear}>Clear</Button>
                    </Tinted>
                </XStack>
            </YStack>
        </Popover.Content>
    </Popover>
}
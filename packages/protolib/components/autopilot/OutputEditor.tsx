import { Text, YStack, Paragraph, XStack, Checkbox, Input, TextArea, Label, Button } from '@my/ui'
import { Check } from "@tamagui/lucide-icons"
import { useEffect, useState } from 'react'
import { types } from "@extensions/boards/system/types"
import { TabContainer, TabTitle } from './Tab'
import { LinksEditor } from './LinksEditor'

export const OutputEditor = ({ card, setCardData, links, setLinks, readOnly = false }: any) => {
  const [selectedType, setSelectedType] = useState(card.returnType)
  const [isAuto, setIsAuto] = useState(true)

  const borderColor = "$gray6"
  const inputBgColor = "$bgContent"

  useEffect(() => {
    if (readOnly) return
    if (selectedType === "auto") {
      setIsAuto(true)
    } else {
      setIsAuto(false)
    }

    setCardData(prev => ({
      ...prev,
      returnType: selectedType
    }))
  }, [selectedType, readOnly])

  {/* <TabTitle tabname="Output Configuration" tabDescription='Configure all the possible behaviours that your card' /> */ }
  return <YStack gap="$3" f={1} w="100%">
    <YStack bc="$bgPanel" p="$3" borderRadius="$4" >
      <YStack pb="$3">
        <Label pl="$2">Return Type</Label>
        <XStack gap="$2" flexWrap='wrap'>
          {types.map(type => <Button
            size="$3"
            bc={type === selectedType ? "$color3" : inputBgColor}
            borderColor={type === selectedType ? "$color6" : borderColor}
            color={type === selectedType ? "$color8" : "$color"}
            borderWidth="1px"
            br="$3"
            fontSize="$5"
            onPress={readOnly ? undefined : () => setSelectedType(type)}
            disabled={readOnly}
          >{type}</Button>)}
        </XStack>
      </YStack>
      <YStack gap="$3">
        <XStack gap="$3" jc="flex-start" ai="center">
          <Checkbox
            w="$2"
            h="$2"
            bc={inputBgColor}
            boc={borderColor}
            focusStyle={{ outlineWidth: 0 }}
            checked={card.enableReturnCustomFallback}
            onCheckedChange={readOnly ? undefined : (val) => setCardData(prev => ({
              ...prev,
              enableReturnCustomFallback: val
            }))}
            disabled={readOnly}
          >
            <Checkbox.Indicator>
              <Check size={16} color='var(--color8)' />
            </Checkbox.Indicator>
          </Checkbox>
          <Label>Enable Custom Fallback</Label>
        </XStack>
        {/* <Text fontSize={"$5"} fontWeight={"300"} color="$gray8">Modify the default value returned if the card execution return type is not the configured</Text> */}
        {(!isAuto && card.enableReturnCustomFallback) && <TextArea
          h="100%"
          value={card.fallbackValue}
          bc={inputBgColor}
          placeholderTextColor="$gray10"
          borderColor={borderColor}
          placeholder='Define which should be the return type of the card execution'
          onChangeText={readOnly ? undefined : (text) => setCardData(prev => ({ ...prev, fallbackValue: text }))}
          disabled={readOnly}
        />}
      </YStack>
    </YStack>
    <YStack bc="$bgPanel" p="$3" borderRadius="$4" >
      <Label pl="$2">Actions after run</Label>
      <LinksEditor
        mode={"post"}
        links={links}
        setLinks={setLinks}
        selectProps={{
          backgroundColor: "var(--bgContent)",
          borderColor: borderColor,
          placeholderTextColor: "$gray10",
        }}
        readOnly={readOnly}
      />
    </YStack>
  </YStack>
}

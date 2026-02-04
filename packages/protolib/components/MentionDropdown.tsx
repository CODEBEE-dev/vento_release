import * as React from 'react'
import { XStack, YStack, Text } from '@my/ui'
import { ChevronDown } from '@tamagui/lucide-icons'

export type MentionOption = {
  key: string
  label: string
  description?: string
  rightText?: string
  children?: Array<{ key: string; label: string; rightText?: string }>
}

export type MentionTab = {
  key: string
  label?: string
  color?: string
  options: MentionOption[]
}

export type MentionDropdownProps = {
  tabs: MentionTab[]
  activeTabKey: string
  onTabChange: (key: string) => void
  position: { top: number; left: number }
  maxWidth?: number
  selectedIndex: number
  onSelectedIndexChange: (index: number) => void
  onSelect: (args: { tabKey: string; optionKey: string; childKey?: string }) => void
  itemRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
  anchorRef?: React.MutableRefObject<HTMLElement | null>
  onClose?: () => void
}

const ExpandableOptionRow: React.FC<{ option: MentionOption; onSelect: (childKey?: string) => void }> = ({ option, onSelect }) => {
  const [open, setOpen] = React.useState(false)

  if (option.children && option.children.length > 0) {
    return (
      <YStack gap="$3">
        <XStack jc="space-between" gap="$3" ai="center" onPress={() => onSelect()}>
          <Text>{option.label}</Text>
          <YStack
            br="$2"
            hoverStyle={{ backgroundColor: "$gray8" }}
            onPress={(e) => {
              e.stopPropagation()
              setOpen((prev) => !prev)
            }}
          >
            <ChevronDown height="20px" color="$gray9" rotate={open ? "180deg" : "0deg"} style={{ transition: 'all ease-in-out 120ms' }} />
          </YStack>
        </XStack>
        {open && (
          <YStack pl="$5" pb="$2">
            {option.children.map((child) => (
              <XStack
                key={child.key}
                jc="space-between"
                gap="$3"
                br="$2"
                px="$2"
                py="$1"
                hoverStyle={{ backgroundColor: 'var(--gray8)' }}
                onPress={() => onSelect(child.key)}
              >
                <XStack gap="$3" ai="center">
                  <Text>{child.label}</Text>
                </XStack>
                {child.rightText ? <Text color="$green11">{child.rightText}</Text> : null}
              </XStack>
            ))}
          </YStack>
        )}
      </YStack>
    )
  }

  return (
    <XStack
      onPress={(e) => {
        setTimeout(() => onSelect(), 100)
      }}
      jc="space-between"
      gap="$3"
      ai="center"
    >
      <XStack gap="$3" ai="center">
        <Text>{option.label}</Text>
      </XStack>
      {option.description ? (
        <Text color="$blue11" ellipsizeMode='tail' numberOfLines={1}>{option.description}</Text>
      ) : option.rightText ? (
        <Text color="$green11" textAlign="right" ellipsizeMode='tail' numberOfLines={1}>{option.rightText}</Text>
      ) : null}
    </XStack>
  )
}

export const MentionDropdown: React.FC<MentionDropdownProps> = ({
  tabs,
  activeTabKey,
  onTabChange,
  position,
  maxWidth,
  selectedIndex,
  onSelectedIndexChange,
  onSelect,
  itemRefs,
  anchorRef,
  onClose,
}) => {
  const dropdownRef = React.useRef<HTMLElement | null>(null)

  const closeDropdown = () => {
    onClose?.()
    setTimeout(() => {
      const node: any = anchorRef?.current as any
      if (node && typeof node.focus === 'function') node.focus()
    }, 50)
  }

  const activeTab = React.useMemo(() => tabs.find((t) => t.key === activeTabKey), [tabs, activeTabKey])
  const options = activeTab?.options ?? []

  return (
    <YStack
      ref={dropdownRef as any}
      style={{ position: 'absolute', minWidth: maxWidth ? `${Math.min(220, maxWidth)}px` : '220px', maxWidth: maxWidth ? `${maxWidth}px` : '100%', width: 'max-content', zIndex: 10, top: position.top, left: position.left }}
      maxHeight={'200px'}
      overflowY="scroll"
      p="10px"
      br="$4"
      bg="$gray4"
      borderWidth="1px"
      borderColor={'$gray6'}
      gap="$2"
    >
      <XStack gap="$1">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTabKey
          const color = tab.color ?? 'gray'
          return (
            <XStack
              key={tab.key}
              onPress={() => {
                onTabChange(tab.key)
                onSelectedIndexChange(0)
              }}
              bc={isActive ? (`$${color}6` as any) : 'transparent'}
              px="$3"
              py="$1"
              br="$2"
            >
              <Text color={isActive ? (`$${color}11` as any) : '$gray9'} fontSize={'$5'} textAlign="center" alignSelf="center" cursor="pointer" style={{ transition: 'all ease-in-out 80ms' }}>
                {tab.label ?? tab.key}
              </Text>
            </XStack>
          )
        })}
      </XStack>
      {options.length ? (
        options.map((opt, i) => (
          <YStack
            key={opt.key}
            ref={(el) => (itemRefs.current[i] = el)}
            onMouseEnter={() => onSelectedIndexChange(i)}
            backgroundColor={i === selectedIndex ? 'var(--gray6)' : 'transparent'}
            hoverStyle={{ backgroundColor: 'var(--gray6' }}
            justifyContent="flex-start"
            cursor="pointer"
            p="$2"
            br="$2"
          >
            <ExpandableOptionRow
              option={opt}
              onSelect={(childKey) => {
                onSelect({ tabKey: activeTabKey, optionKey: opt.key, childKey })
                closeDropdown()
              }}
            />
          </YStack>
        ))
      ) : (
        <Text>no results</Text>
      )}
    </YStack>
  )
}

export default MentionDropdown

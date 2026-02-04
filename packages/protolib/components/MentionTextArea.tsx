import * as React from 'react'
import { useEffect, useMemo, useRef, useState, useCallback, useLayoutEffect } from 'react'
import { XStack, YStack } from '@my/ui'
import MentionDropdown, { MentionOption, MentionTab } from './MentionDropdown'

export type MentionTabsConfig = Array<
  MentionTab & {
    prefix: string
    onInsert: (selection: string | string[], ctx: { filter?: string }) => string
    buildSymbols?: (raw: string) => Record<string, string>
  }
>

export type MentionTextAreaProps = {
  value: string
  onChange: (value: string) => void
  onEnter?: (value: string) => void
  placeholder?: string
  readOnly?: boolean
  disabled?: boolean
  style?: React.CSSProperties
  containerStyle?: React.CSSProperties
  mentionTabs: MentionTabsConfig
  tokenSelectionPrefixes?: string[] // defaults to prefixes from mentionTabs
}

const buildTokenRegex = (prefixes: string[]) => {
  const escaped = prefixes.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('')
  return new RegExp(`^<[${escaped}][^>]+>$`)
}

const getTokenBoundsAt = (text: string, index: number, tokenRe: RegExp): { start: number; end: number } | null => {
  const start = text.lastIndexOf('<', index)
  if (start === -1) return null
  const end = text.indexOf('>', Math.max(index - 1, 0))
  if (end === -1) return null
  const candidate = text.slice(start, end + 1)
  if (!tokenRe.test(candidate)) return null
  return { start, end: end + 1 }
}

const CARET_STYLE_PROPERTIES = [
  'box-sizing',
  'width',
  'height',
  'overflow-x',
  'overflow-y',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-top-style',
  'border-right-style',
  'border-bottom-style',
  'border-left-style',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'font-style',
  'font-variant',
  'font-weight',
  'font-stretch',
  'font-size',
  'line-height',
  'font-family',
  'text-align',
  'text-transform',
  'text-indent',
  'text-decoration',
  'letter-spacing',
  'word-spacing',
  'tab-size',
  'direction',
]

const getCaretMetrics = (textarea: HTMLTextAreaElement, position: number) => {
  if (typeof window === 'undefined' || !textarea) return null

  const computed = window.getComputedStyle(textarea)
  const mirror = document.createElement('div')

  CARET_STYLE_PROPERTIES.forEach((prop) => {
    const value = computed.getPropertyValue(prop as any)
    if (value) {
      mirror.style.setProperty(prop, value)
    }
  })

  mirror.style.position = 'absolute'
  mirror.style.visibility = 'hidden'
  mirror.style.whiteSpace = 'pre-wrap'
  mirror.style.wordWrap = 'break-word'
  mirror.style.overflow = 'hidden'

  const value = textarea.value
  mirror.textContent = value.slice(0, position)

  const marker = document.createElement('span')
  marker.textContent = value.slice(position) || '.'
  mirror.appendChild(marker)

  document.body.appendChild(mirror)
  const top = (marker as any).offsetTop as number
  const left = (marker as any).offsetLeft as number
  const lineHeight = parseFloat((computed as any).lineHeight || '') || parseFloat((computed as any).fontSize || '') || 16
  const borderTop = parseFloat((computed as any).borderTopWidth || '') || 0
  const borderLeft = parseFloat((computed as any).borderLeftWidth || '') || 0
  document.body.removeChild(mirror)

  return {
    top,
    left,
    lineHeight,
    borderTop,
    borderLeft,
  }
}

export const MentionTextArea: React.FC<MentionTextAreaProps> = ({
  value,
  onChange,
  onEnter,
  placeholder,
  readOnly,
  disabled,
  style,
  containerStyle,
  mentionTabs,
  tokenSelectionPrefixes,
  ...props
}) => {
  // Tokenization helpers kept internal for generic usage
  const sortEntriesByKeyLengthDesc = (obj: Record<string, string>) =>
    Object.entries(obj).sort((a, b) => b[0].length - a[0].length)

  const dump = (text: string, symbols: Record<string, string> = {}) => {
    let dumped = text
    for (const [key, value] of sortEntriesByKeyLengthDesc(symbols)) {
      dumped = dumped.replaceAll(key, value)
    }
    return dumped
  }

  const dedump = (text: string, symbols: Record<string, string> = {}) => {
    let dedumped = text
    for (const [key, value] of sortEntriesByKeyLengthDesc(symbols)) {
      dedumped = dedumped.replaceAll(value, key)
    }
    return dedumped
  }

  const removeUnknownTags = (
    v: string,
    symbols: Record<string, string>,
    allowedPrefixes: string[]
  ) =>
    v.replace(/<([^&][\s\S]*?)>/g, (_m, inner) => {
      if (!Object.values(symbols).includes(_m)) {
        const p = allowedPrefixes.find((pr) => inner.startsWith(pr)) ?? allowedPrefixes[0] ?? '#'
        return '<' + p + 'unknown>'
      }
      return _m
    })

  const updateSymbols = (raw: string, set: (s: Record<string, string>) => void) => {
    let merged: Record<string, string> = {}
    for (const t of mentionTabs) {
      if (typeof t.buildSymbols === 'function') {
        try {
          const part = t.buildSymbols(raw) || {}
          merged = { ...merged, ...part }
        } catch { }
      }
    }
    set(merged)
  }

  const containerRef = useRef<HTMLElement | null>(null)
  const ref = useRef<HTMLTextAreaElement | null>(null)
  const overlayContentRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<Array<HTMLDivElement | null>>([])

  const [showDropdown, setShowDropdown] = useState<string | null>(null)
  const [inputInsertIndex, setInputInsertIndex] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 50, left: 0 })
  const [dropdownMaxWidth, setDropdownMaxWidth] = useState<number | undefined>(undefined)
  const [symbols, setSymbols] = useState<Record<string, string>>({})
  const [displayValue, setDisplayValue] = useState<string>(value)

  const prefixes = useMemo(() => tokenSelectionPrefixes ?? mentionTabs.map((t) => t.prefix), [mentionTabs, tokenSelectionPrefixes])
  const tokenRe = useMemo(() => buildTokenRegex(prefixes), [prefixes])

  const tabsData = useMemo(() => mentionTabs.map(({ key, label, color, options }) => ({ key, label, color, options })), [mentionTabs])

  const activeTabOptions = useMemo(() => {
    const active = tabsData.find((t) => t.key === showDropdown)
    return active?.options ?? []
  }, [tabsData, showDropdown])

  const updateDropdownPosition = useCallback(() => {
    if (!showDropdown) return
    const textarea = ref.current
    const container = containerRef.current
    if (!textarea || !container) return
    const selection = typeof textarea.selectionStart === 'number' ? textarea.selectionStart : inputInsertIndex
    const caret = getCaretMetrics(textarea, selection ?? 0)
    if (!caret) return

    const textareaRect = textarea.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()

    const caretTop = textareaRect.top - containerRect.top + caret.top - textarea.scrollTop + caret.lineHeight + caret.borderTop
    const caretLeft = textareaRect.left - containerRect.left + caret.left - textarea.scrollLeft + caret.borderLeft
    const containerWidth = (container as any)?.offsetWidth ?? containerRect.width
    const estimatedWidth = Math.min(320, containerWidth) // cap desired width
    const maxLeft = containerRect.width - estimatedWidth
    const safeLeft = Math.max(0, Math.min(caretLeft, Math.max(0, maxLeft)))
    const safeTop = Math.max(0, caretTop + 4)

    // compute max width so that right edge stays inside container
    const available = Math.max(140, containerRect.width - safeLeft - 8)
    setDropdownMaxWidth(Math.min(320, available))
    setDropdownPosition({ top: safeTop, left: Math.max(0, safeLeft) })
  }, [showDropdown, inputInsertIndex])

  const filteredTabs = useMemo(() => {
    if (!showDropdown) return tabsData
    const left = displayValue.slice(0, inputInsertIndex).replace(/<[^>]*>/g, '')
    const cls = prefixes.map((p) => p.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')).join('')
    const onlyPrefixRe = new RegExp(`[${cls}]\\s*$`)
    const captureRe = new RegExp(`[${cls}]([^\\s${cls}]+)`, 'g')
    const dropdownFilter = onlyPrefixRe.test(left)
      ? null
      : (() => {
        const all = [...left.matchAll(captureRe)]
        return all.length ? (all[all.length - 1][1] as string) : null
      })()

    const filterList = (list: MentionOption[]) => {
      if (!dropdownFilter) return list
      const lower = dropdownFilter.toLowerCase()
      return list.filter((opt) => opt.label.toLowerCase().startsWith(lower))
    }

    return tabsData.map((t) => ({ ...t, options: filterList(t.options) }))
  }, [tabsData, showDropdown, displayValue, inputInsertIndex])

  // Default highlighter based on mentionTabs (prefix/color)
  const RenderHighlight = useMemo(() => {
    const colorByPrefix: Record<string, string> = {}
    // from mentionTabs if provided
    for (const t of mentionTabs) {
      if (t.prefix) colorByPrefix[t.prefix] = t.color ?? 'gray'
    }

    const esc = (s: string) =>
      s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')

    return (text: string) => {
      const escaped = esc(text)
      const tagged = escaped.replace(/&lt;([^&][\s\S]*?)&gt;/g, (_m, inner) => {
        const prefix = inner?.[0]
        const color = (prefix && colorByPrefix[prefix]) || 'gray'
        return (
          `<span style="` +
          `background-color: var(--${color}6); ` +
          `color: var(--${color}11); ` +
          `width: fit-content; display: inline; padding-block: 3px; border-radius: 5px;">` +
          `<span style="color:transparent">&lt;</span>${inner ?? ''}<span style="color:transparent">&gt;</span>` +
          `</span>`
        )
      })
      return tagged
    }
  }, [mentionTabs])

  useEffect(() => {
    const el = itemRefs.current[selectedIndex]
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  useEffect(() => {
    if (showDropdown) {
      ref.current?.focus()
      updateDropdownPosition()
    }
  }, [showDropdown, selectedIndex, updateDropdownPosition])

  useLayoutEffect(() => {
    const ta = ref.current
    if (!ta || !overlayContentRef.current) return
    overlayContentRef.current.style.transform = `translate(${-ta.scrollLeft}px, ${-ta.scrollTop}px)`
  }, [displayValue])

  // Sync tokenized view when external value changes
  useEffect(() => {
    const cleaned = removeUnknownTags(value, symbols, prefixes)
    const dedumped = dedump(cleaned, symbols)
    const next: Record<string, string> = {}
    updateSymbols(dedumped, (s) => Object.assign(next, s))
    setSymbols(next)
    setDisplayValue(dump(dedumped, next))
  }, [value])

  const selectWholeTokenIfAny = useCallback(
    (ta: HTMLTextAreaElement | null) => {
      if (!ta) return false
      if (showDropdown) return false
      const idx = ta.selectionStart ?? 0
      const bounds = getTokenBoundsAt(displayValue, idx, tokenRe)
      if (!bounds) return false
      ta.setSelectionRange(bounds.start, bounds.end)
      return true
    },
    [displayValue, showDropdown, tokenRe]
  )

  const getActiveTab = () => mentionTabs.find((t) => t.key === showDropdown)

  const computeFilter = () => {
    const left = displayValue.slice(0, inputInsertIndex).replace(/<[^>]*>/g, '')
    const cls = prefixes.map((p) => p.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')).join('')
    const onlyPrefixRe = new RegExp(`[${cls}]\\s*$`)
    const captureRe = new RegExp(`[${cls}]([^\\s${cls}]+)`, 'g')
    const dropdownFilter = onlyPrefixRe.test(left)
      ? null
      : (() => {
        const all = [...left.matchAll(captureRe)]
        return all.length ? (all[all.length - 1][1] as string) : null
      })()
    return dropdownFilter ?? undefined
  }

  const selectDropdownOption = (selection: string | string[]) => {
    const tab = getActiveTab()
    if (!tab) return
    const insertion = tab.onInsert(selection, { filter: computeFilter() })

    const left = displayValue.slice(0, inputInsertIndex).replace(/<[^>]*>/g, '')
    const cls = prefixes.map((p) => p.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')).join('')
    const lastCapture = new RegExp(`[${cls}]([^\\s${cls}]+)(?!.*[${cls}][^\\s${cls}]+)`) // last capture
    const filter = left.match(lastCapture)?.[1]
    const base = displayValue
    const newValue = !filter
      ? base.slice(0, inputInsertIndex - 1) + (insertion + ' ') + base.slice(inputInsertIndex + 1)
      : base.slice(0, inputInsertIndex - filter.length - 1) + (insertion + ' ') + base.slice(inputInsertIndex + 1)
    emitChange(newValue)
  }

  const handleInputIndexChange = (index: number, v: string) => {
    setInputInsertIndex(index)
    const leftText = v.slice(0, index)
    const lastSegment = leftText.split(' ').pop() || ''
    const firstChar = lastSegment[0]
    const matched = mentionTabs.find((t) => t.prefix === firstChar)
    setShowDropdown(matched ? matched.key : null)
  }

  const emitChange = (nextDisplay: string) => {
    const cleaned = removeUnknownTags(nextDisplay, symbols, prefixes)
    const dedumped = dedump(cleaned, symbols)
    const next: Record<string, string> = {}
    updateSymbols(dedumped, (s) => Object.assign(next, s))
    setSymbols(next)
    const dumpedAgain = dump(dedumped, next)
    setDisplayValue(dumpedAgain)
    onChange(dedumped)
  }

  return (
    <XStack
      ref={containerRef as any}
      position="relative"
      flex={1}
      gap="$3"
      height="100%"
      opacity={disabled ? 0.7 : 1}
      backgroundColor="$bgPanel"
      padding="$2"
      flexDirection="column"
      style={containerStyle}
    >
      {showDropdown && (
        <MentionDropdown
          anchorRef={ref as any}
          itemRefs={itemRefs as any}
          selectedIndex={selectedIndex}
          onSelectedIndexChange={setSelectedIndex}
          position={dropdownPosition}
          maxWidth={dropdownMaxWidth}
          activeTabKey={showDropdown}
          onTabChange={setShowDropdown}
          tabs={filteredTabs as any}
          onSelect={({ optionKey, childKey }) => {
            let selection: any = optionKey
            const option = activeTabOptions.find((o) => o.key === optionKey)
            if (option?.children && childKey) selection = [optionKey, childKey]
            selectDropdownOption(selection)
            setShowDropdown(null)
            setTimeout(() => {
              const textarea = ref.current
              if (!textarea) return
              const length = typeof selection === 'string' ? selection.length : selection.join('').length
              textarea.setSelectionRange(inputInsertIndex + length + 3, inputInsertIndex + length + 3)
              textarea.focus()
            }, 1)
          }}
          onClose={() => setShowDropdown(null)}
        />
      )}

      <YStack pos="relative" f={1} w="100%">
        {RenderHighlight && (
          <YStack
            display="block"
            aria-hidden
            pointerEvents="none"
            pos="absolute"
            t={0}
            l={0}
            r={0}
            b={0}
            style={{
              boxSizing: 'border-box',
              overflow: 'hidden',
              lineHeight: '1.4',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              fontWeight: 'inherit',
              letterSpacing: 'inherit',
              whiteSpace: 'pre-wrap',
              overflowWrap: 'break-word',
              wordBreak: 'normal',
            }}
          >
            <div
              ref={overlayContentRef}
              style={{ willChange: 'transform', transform: 'translate(0,0)', padding: '12px' }}
              dangerouslySetInnerHTML={{ __html: RenderHighlight(displayValue) }}
            />
          </YStack>
        )}

        <textarea
          ref={ref}
          readOnly={readOnly}
          value={displayValue}
          placeholder={placeholder}
          disabled={disabled}
          onMouseDown={(e) => {
            // allow normal cursor placement; do not auto-select token
          }}
          onClick={(e) => {
            const input = e.currentTarget
            const idx = input.selectionStart ?? 0
            const bounds = getTokenBoundsAt(displayValue, idx, tokenRe)
            if (bounds && idx > bounds.start && idx < bounds.end) {
              input.setSelectionRange(bounds.start, bounds.end)
            }
          }}
          onDoubleClick={(e) => {
            if (selectWholeTokenIfAny(e.currentTarget)) {
              e.preventDefault()
              e.stopPropagation()
            }
          }}
          onSelect={(e) => {
            const index = e.currentTarget.selectionStart ?? 0
            handleInputIndexChange(index, e.currentTarget.value)
            // do not force-select the entire token on caret moves
            if (showDropdown) {
              if (typeof window !== 'undefined') window.requestAnimationFrame(() => updateDropdownPosition())
              else updateDropdownPosition()
            }
          }}
          onChange={(e) => {
            const index = e.currentTarget.selectionStart ?? 0
            handleInputIndexChange(index, e.currentTarget.value)
            emitChange(e.currentTarget.value)
          }}
          onKeyUp={(e) => {
            const index = e.currentTarget.selectionStart ?? 0
            setInputInsertIndex(index)
            if (showDropdown) {
              if (typeof window !== 'undefined') window.requestAnimationFrame(() => updateDropdownPosition())
              else updateDropdownPosition()
            }
          }}
          onKeyDown={(e) => {
            if (showDropdown === null) {
              const input = e.currentTarget
              switch (e.key) {
                case 'ArrowLeft': {
                  const start = input.selectionStart ?? 0
                  const end = input.selectionEnd ?? 0
                  if (start === end) {
                    const bounds = getTokenBoundsAt(displayValue, start, tokenRe)
                    if (bounds && start === bounds.end) {
                      e.preventDefault()
                      const pos = bounds.start
                      input.setSelectionRange(pos, pos)
                    }
                  }
                  break
                }
                case 'ArrowRight': {
                  const start = input.selectionStart ?? 0
                  const end = input.selectionEnd ?? 0
                  if (start === end) {
                    const bounds = getTokenBoundsAt(displayValue, start, tokenRe)
                    if (bounds && start === bounds.start) {
                      e.preventDefault()
                      const pos = bounds.end
                      input.setSelectionRange(pos, pos)
                    }
                  }
                  break
                }
                case 'Backspace':
                case 'Delete':
                  const start = input.selectionStart ?? 0
                  const end = input.selectionEnd ?? 0
                  if (start === end) {
                    const before = displayValue.slice(0, start)
                    const after = displayValue.slice(start)
                    const match = before.match(/<[^>]+>$/)
                    if (match) {
                      e.preventDefault()
                      const tokenStart = start - match[0].length
                      const newValue = displayValue.slice(0, tokenStart) + after
                      emitChange(newValue)
                      setTimeout(() => input?.setSelectionRange(tokenStart, tokenStart), 0)
                    }
                  }
                  break
                case 'Enter':
                  if (e.shiftKey) return
                  e.preventDefault()
                  if (typeof onEnter === 'function') {
                    const cleaned = removeUnknownTags(displayValue, symbols, prefixes)
                    const dedumped = dedump(cleaned, symbols)
                    onEnter(dedumped)
                  }
                  break
              }
            } else {
              if (e.key === 'Backspace') {
                const input = e.currentTarget
                const start = input.selectionStart ?? 0
                const end = input.selectionEnd ?? 0
                if (start === end) {
                  const prev = displayValue[start - 1]
                  if (prev && prefixes.includes(prev)) setShowDropdown(null)
                }
                return
              }
              const triggerKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Escape', 'Enter', 'Tab']
              if (!triggerKeys.includes(e.key)) return
              e.preventDefault()
              e.stopPropagation()
              const types = mentionTabs.map((t) => t.key)
              const currentTypeIndex = types.indexOf(showDropdown)
              switch (e.key) {
                case 'ArrowLeft':
                  setShowDropdown(types[(currentTypeIndex - 1 + types.length) % types.length])
                  setSelectedIndex(0)
                  break
                case 'ArrowRight':
                  setShowDropdown(types[(currentTypeIndex + 1) % types.length])
                  setSelectedIndex(0)
                  break
                case 'ArrowUp':
                  setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : activeTabOptions.length - 1))
                  break
                case 'ArrowDown':
                  setSelectedIndex((prev) => (prev + 1 < activeTabOptions.length ? prev + 1 : 0))
                  break
                case 'Escape':
                  setShowDropdown(null)
                  break
                case 'Tab':
                case 'Enter':
                  {
                    const active = filteredTabs.find((t) => t.key === showDropdown)
                    const list = active?.options ?? []
                    const opt = list[selectedIndex]
                    if (opt) {
                      let selection: any = opt.key
                      selectDropdownOption(selection)
                      setShowDropdown(null)
                      // move cursor after inserted token
                      setTimeout(() => {
                        const textarea = ref.current
                        if (!textarea) return
                        const length = typeof selection === 'string' ? selection.length : selection.join('').length
                        textarea.setSelectionRange(inputInsertIndex + length + 3, inputInsertIndex + length + 3)
                        textarea.focus()
                      }, 1)
                    }
                  }
                  break
              }
              return
            }
          }}
          onScroll={(e) => {
            const el = e.currentTarget
            const y = el.scrollTop
            const x = el.scrollLeft
            if (overlayContentRef.current) {
              overlayContentRef.current.style.transform = `translate(${-x}px, ${-y}px)`
            }
            if (showDropdown) updateDropdownPosition()
          }}
          spellCheck={false}
          style={{
            lineHeight: '1.4',
            width: '100%',
            resize: 'none',
            overflowY: 'auto',
            height: '100%',
            boxSizing: 'border-box',
            color: RenderHighlight ? 'transparent' : 'inherit',
            caretColor: 'var(--color)',
            fontSize: 'inherit',
            padding: '12px',
            ...style,
          }}
          {...props}
        />
      </YStack>
    </XStack>
  )
}

export default MentionTextArea

import * as React from 'react';
import { useRef, useState, useEffect, useMemo } from 'react';
import { Button, TooltipSimple, XStack } from '@my/ui'
import { Mic } from '@tamagui/lucide-icons'
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useBoardActions, useBoardStates } from '@extensions/boards/store/boardStore'
import { generateActionCode, generateStateCode, generateParamCode } from '@extensions/boards/utils/ActionsAndStates';
import { isElectron } from 'protolib/lib/isElectron';
import { MentionTextArea } from 'protolib/components/MentionTextArea';

// using plain props as in the original implementation
export const BoardTextArea = ({
  value = '',
  speechRecognition,
  onChange,
  onEnter,
  onKeyDown,
  readOnly,
  placeholder,
  style,
  enableShortcuts = false,
  disabled = false,
  footer = null,
  actionInsertMode = 'code',
  availableParams = [],
  allowParams = false,
  ...rest
}: any) => {
  const states = useBoardStates()
  const actions = useBoardActions()
  const dropDownActions = Object.keys(actions)
  const dropDownStates = Object.keys(states)

  const mentionTabs = useMemo(() => {
    const getSymbols = (
      text: string,
      pattern: RegExp,
      matchCb: (m: string) => string | undefined = () => undefined
    ) => {
      const matches = [...text.matchAll(pattern)]
      const symbols: Record<string, string> = {}
      matches.forEach((match) => {
        const key = match[0]
        symbols[key] = matchCb(key) ?? 'unknown'
      })
      return symbols
    }

    const actionsOptions = dropDownActions.map((name) => ({ key: name, label: name, description: (actions as any)?.[name]?.description ?? undefined }))
    const statesOptions = dropDownStates.map((name) => {
      const val = (states as any)?.[name]
      if (val && typeof val === 'object') {
        const children = Object.keys(val).map((k) => ({ key: k, label: k, rightText: typeof val[k] }))
        return { key: name, label: name, children }
      }
      if (typeof val === 'number') return { key: name, label: name, rightText: String(val) }
      if (typeof val === 'string') return { key: name, label: name, rightText: val as string }
      return { key: name, label: name }
    })
    const paramsOptions = (availableParams || []).map((p) => ({ key: p, label: p }))

    const tabs: any[] = [
      {
        key: 'actions',
        label: 'actions',
        color: 'blue',
        prefix: '@',
        options: actionsOptions,
        onInsert: (sel) => generateActionCode(sel),
        buildSymbols: (raw: string) =>
          getSymbols(
            raw,
            /await\s+(?:\w+\.)?execute[_A-Za-z]*\(\{\s*name\s*:\s*["'][^"']+["'](?:\s*,[\s\S]*?)?\}\)/gs,
            (m) => {
              const name = m.match(/name\s*:\s*["']([^"']+)["']/)
              return '<@' + (name?.[1] ?? 'unknown') + '>'
            }
          ),
      },
      {
        key: 'states',
        label: 'states',
        color: 'green',
        prefix: '#',
        options: statesOptions,
        onInsert: (sel) => generateStateCode(Array.isArray(sel) ? sel : [sel]),
        buildSymbols: (raw: string) =>
          getSymbols(raw, /\bboard(?:\?\.\[\s*"(?:[^"\\]|\\.)*"\s*\])+/g, (match) => {
            const props = [...match.matchAll(/\?\.\["([^"]+)"\]/g)].map((m) => m[1])
            return '<#' + props.join('.') + '>'
          }),
      },
    ]
    if (allowParams)
      tabs.push({
        key: 'params',
        label: 'params',
        color: 'purple',
        prefix: '$',
        options: paramsOptions,
        onInsert: (sel) => generateParamCode(Array.isArray(sel) ? sel : [sel]),
        buildSymbols: (raw: string) =>
          getSymbols(raw, /\bparams(?:\?\.\[\s*"(?:[^"\\]|\\.)*"\s*\])+/g, (match) => {
            const props = [...match.matchAll(/\?\.\["([^"]+)"\]/g)].map((m) => m[1])
            return '<$' + props.join('.') + '>'
          }),
      })
    return tabs
  }, [dropDownActions, dropDownStates, availableParams, allowParams, actions, states])

  const [speechRecognitionEnabled, setSpeechRecognitionEnabled] = useState(false)
  const { transcript, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition()

  useEffect(() => {
    if (speechRecognitionEnabled && transcript) {
      onChange({ target: { value: transcript } })
    }
  }, [transcript, speechRecognitionEnabled])

  return (
    <XStack position="relative" flex={1} gap="$3" height="100%" opacity={disabled ? 0.7 : 1} backgroundColor="$bgPanel" padding="$2" flexDirection="column">
      <MentionTextArea
        value={value}
        onChange={(rawValue) => onChange({ target: { value: rawValue } })}
        onEnter={(rawValue) => {
          if (typeof onEnter === 'function') onEnter(rawValue)
        }}
        placeholder={placeholder}
        readOnly={readOnly}
        disabled={disabled}
        mentionTabs={mentionTabs as any}
        style={style}
        {...rest}
      />
      <XStack>
        {footer}
        {!isElectron() && speechRecognition && browserSupportsSpeechRecognition && (
          <TooltipSimple
            label={"" + (speechRecognitionEnabled ? "Disable" : "Enable") + " Speech Recognition"}
            delay={{ open: 500, close: 0 }}
            restMs={0}
          >
            <Button
              ml="$2"
              size="$3"
              p="$0"
              onPress={() => {
                if (speechRecognitionEnabled) {
                  setSpeechRecognitionEnabled(false)
                  SpeechRecognition.stopListening()
                } else {
                  resetTranscript()
                  setSpeechRecognitionEnabled(true)
                  SpeechRecognition.startListening({ continuous: true })
                }
              }}
              circular
              backgroundColor={speechRecognitionEnabled ? '$red6' : 'transparent'}
              hoverStyle={{ backgroundColor: '$gray11' }}
              pressStyle={{ backgroundColor: '$gray10' }}
              scaleIcon={1.4}
              icon={Mic}
            />
          </TooltipSimple>
        )}
      </XStack>
    </XStack>
  )
}

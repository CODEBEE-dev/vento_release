import { Button, ButtonProps, Circle, Stack, TooltipSimple } from '@my/ui'
import React from 'react'
import { useTint } from '../lib/Tints'
import { sendToPageBus } from '../lib/PageBus'
import { API } from 'protobase'

export const ColorToggleButton = React.forwardRef((props: ButtonProps, ref: any) => {
  const { tint, tints, tintIndex, setNextTint } = useTint()

  const handlePress = () => {
    const nextIndex = (tintIndex + 1) % tints.length
    const nextTint = tints[nextIndex]
    setNextTint()
    API.post('/api/core/v1/settings/theme.accent', { name: 'theme.accent', value: nextTint })
    // Broadcast tint change to all iframes via PageBus
    sendToPageBus({ type: 'tint-changed', tint: nextTint })
  }

  return (
    <Stack ref={ref}>
      <TooltipSimple groupId="header-actions-color" label="Next theme">
        <Button size="$3" onPress={handlePress} {...props} aria-label="Next theme">
          <Circle
            //@ts-ignore
            bw={1} boc="var(--color9)" m={2}
            size={13}
            backgroundColor={tint as any}
          />
        </Button>
      </TooltipSimple>
    </Stack>
  )
})

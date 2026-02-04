import React, { memo, useState } from 'react'
import { YStack, Text, XStack, TooltipSimple, Button, Dialog, Label, Input } from '@my/ui'
import { Handle, Position } from '@xyflow/react'
import {
  Smartphone, Monitor, Cpu, Bot, Wifi, WifiOff,
  Layers, Tag, Sparkles, AlertTriangle, Clock, Check, X,
  Cog, LayoutTemplate, Workflow, LayoutDashboard, Presentation
} from '@tamagui/lucide-icons'
import { Tinted } from 'protolib/components/Tinted'
import { getIconUrl } from 'protolib/components/IconSelect'
import { shouldShowInArea } from 'protolib/helpers/Visibility'
import { ItemMenu } from 'protolib/components/ItemMenu'
import { InteractiveIcon } from 'protolib/components/InteractiveIcon'
import { BoardSettingsEditor } from '@extensions/boards/components/BoardSettingsEditor'
import { API } from 'protobase'
import { useRouter } from 'solito/navigation'
import { useHasPermission } from 'protolib/lib/usePermission'

// Get icon based on platform
export const getIconForPlatform = (platform: string) => {
  switch (platform?.toLowerCase()) {
    case 'android':
    case 'mobile':
      return Smartphone
    case 'ventoagent':
    case 'desktop':
    case 'computer':
      return Monitor
    case 'esphome':
    case 'arduino':
      return Cpu
    default:
      return Bot
  }
}

// Mini chip for tags
const MiniChip = memo(({ label, color }: { label: string; color?: string }) => (
  <XStack
    br="$10"
    px="$2"
    py="$0.5"
    bg={color || '$color4'}
    ai="center"
  >
    <Text fontSize={9} fontWeight="500" color="$color8" numberOfLines={1}>
      {label}
    </Text>
  </XStack>
))

// Card icon preview (mini versions of board cards)
const CardIconPreview = memo(({ cards }: { cards: any[] }) => {
  const displayCards = cards?.slice(0, 5) || []
  const remaining = (cards?.length || 0) - 5

  if (!displayCards.length) return null

  return (
    <XStack gap="$1" ai="center" flexWrap="wrap">
      {displayCards.map((card, i) => (
        <YStack
          key={i}
          w={18}
          h={18}
          br={card.type === 'action' ? '$10' : '$1'}
          bg={card.color || '$color6'}
          ai="center"
          jc="center"
          opacity={0.85}
        >
          {card.icon && (
            <img
              src={getIconUrl(card.icon)}
              width={10}
              height={10}
              style={{ filter: 'brightness(0) invert(1)', opacity: 0.9 }}
            />
          )}
        </YStack>
      ))}
      {remaining > 0 && (
        <Text fontSize={9} color="$color8" ml="$1">+{remaining}</Text>
      )}
    </XStack>
  )
})

export type NetworkCardProps = {
  board: any
  platform?: string
  isConnected?: boolean
  isHidden?: boolean
  isPending?: boolean
  isRunning?: boolean
  selected?: boolean
  showNavIcons?: boolean
  // Mode: 'node' for ReactFlow, 'card' for grid
  mode?: 'node' | 'card'
  // For node mode
  handlePosition?: Position
  // For card mode
  onPress?: () => void
  onDelete?: () => void
  onApprove?: (board: any) => void
  onReject?: (board: any) => void
  width?: number
}

// Network Card - unified rich design for all boards
export const NetworkCard = memo(({
  board,
  platform = 'virtual',
  isConnected: isConnectedProp,
  isHidden: isHiddenProp,
  isPending = false,
  isRunning = false,
  selected = false,
  showNavIcons = false,
  mode = 'card',
  handlePosition,
  onPress,
  onDelete,
  onApprove,
  onReject,
  width
}: NetworkCardProps) => {
  const router = useRouter()

  // Permission checks for menu actions
  const canUpdateBoard = useHasPermission('boards.update')
  const canCreateTemplate = useHasPermission('templates.execute')

  // Dialog states for Settings and Create Template
  const [editSettingsDialog, setEditSettingsDialog] = useState(false)
  const [createTemplateDialog, setCreateTemplateDialog] = useState(false)
  const [selectedBoard, setSelectedBoard] = useState<any>(null)
  const [description, setDescription] = useState('')
  const [templateName, setTemplateName] = useState('')

  // Navigation icons config
  const navIcons = [
    { key: 'graph' as const, label: 'Graph', Icon: Workflow },
    { key: 'board' as const, label: 'Dashboard', Icon: LayoutDashboard },
    { key: 'ui' as const, label: 'Presentation', Icon: Presentation },
  ]

  const goToView = (key: 'graph' | 'board' | 'ui', e: any) => {
    e.stopPropagation?.()
    e.preventDefault?.()
    router.push(`/boards/view?board=${board?.name}#${key}`)
  }

  // Show connection status only if explicitly provided
  // In grid view we don't have real-time connection info, so don't show badge
  const showConnectionStatus = isConnectedProp !== undefined
  const isConnected = isConnectedProp ?? false // Default to false when unknown
  const IconComponent = getIconForPlatform(platform)
  const cards = board?.cards || []
  const tags = board?.tags || []
  const displayName = board?.displayName || board?.name
  const hasAutopilot = board?.autopilot

  // Determine if hidden based on prop or visibility
  const isHidden = isHiddenProp ?? !shouldShowInArea(board, 'agents')

  // Border and styling only reflect connection status if we know it
  const borderColor = !showConnectionStatus ? '$color6' : (isConnected ? '$color8' : '$gray6')
  const bgColor = selected ? '$color2' : '$bgPanel'

  const cardWidth = mode === 'node' ? 260 : (width || '100%')
  const cardHeight = mode === 'node' ? 140 : 'auto'

  const content = (
    <>
      <style>{`
        @keyframes networkCardPulse {
          0%, 100% { box-shadow: 0 4px 12px rgba(0,0,0,0.1), 0 0 8px var(--color6); }
          50% { box-shadow: 0 4px 12px rgba(0,0,0,0.1), 0 0 14px var(--color7); }
        }
      `}</style>
      <div
        style={{
          width: cardWidth,
          height: cardHeight,
          minHeight: mode === 'card' ? 140 : undefined,
          maxWidth: mode === 'card' ? (width || 400) : undefined,
          borderRadius: 'var(--radius-4)',
          position: 'relative',
          animation: isRunning ? 'networkCardPulse 2s ease-in-out infinite' : undefined,
          boxShadow: !isRunning ? (
            selected
              ? '0 12px 32px rgba(0,0,0,0.25), 0 0 0 2px var(--color9)'
              : (showConnectionStatus && isConnected)
                ? '0 6px 20px rgba(0,0,0,0.12), 0 0 20px rgba(var(--color9-rgb), 0.15)'
                : '0 4px 12px rgba(0,0,0,0.1)'
          ) : undefined,
        }}
      >
        <YStack
          width="100%"
          height="100%"
          minHeight={mode === 'card' ? 140 : undefined}
          br="$4"
          bg={isRunning ? '$color2' : bgColor}
          borderWidth={isRunning ? 2 : (showConnectionStatus && isConnected ? 2 : 1)}
          borderColor={isRunning ? '$color7' : borderColor}
          cursor={'pointer'}
          hoverStyle={onPress ? {
            borderColor: !showConnectionStatus ? '$color8' : (isConnected ? '$color8' : '$gray7'),
            scale: 1.01
          } : {}}
          pressStyle={onPress ? { scale: 0.98 } : {}}
          onPress={onPress}
          position="relative"
        >
      {/* Hidden board badge */}
      {isHidden && (
        <Tinted>
          <TooltipSimple
            label="This board is hidden from default views. You can still see it when showing boards from all views."
            delay={{ open: 500, close: 0 }}
            restMs={0}
          >
            <XStack
              position="absolute"
              top={-10}
              right={10}
              bg="$yellow9"
              br="$2"
              px="$2"
              py="$1"
              ai="center"
              gap="$1"
              zIndex={10}
            >
              <AlertTriangle size={12} color="black" />
              <Text fontSize={10} fontWeight="600" color="black" numberOfLines={1}>
                Hidden board
              </Text>
            </XStack>
          </TooltipSimple>
        </Tinted>
      )}

      {/* Pending enrollment badge */}
      {isPending && (
        <Tinted>
          <TooltipSimple
            label="This device is waiting for enrollment approval"
            delay={{ open: 500, close: 0 }}
            restMs={0}
          >
            <XStack
              position="absolute"
              top={-10}
              right={10}
              bg="$orange9"
              br="$2"
              px="$2"
              py="$1"
              ai="center"
              gap="$1"
              zIndex={10}
            >
              <Clock size={12} color="white" />
              <Text fontSize={10} fontWeight="600" color="white">
                Pending Enrollment
              </Text>
            </XStack>
          </TooltipSimple>
        </Tinted>
      )}

      {/* Header section */}
      <YStack p="$3" pb="$2" zIndex={1}>
        <XStack ai="flex-start" jc="space-between">
          <XStack ai="center" gap="$2" f={1} onPress={onPress}>
            <Tinted>
              <YStack
                w={36}
                h={36}
                br="$3"
                ai="center"
                jc="center"
                bg={!showConnectionStatus ? '$color5' : (isConnected ? '$color5' : '$bgContent')}
              >
                <IconComponent
                  size={20}
                  color={!showConnectionStatus ? 'var(--color10)' : (isConnected ? 'var(--color10)' : 'var(--gray9)')}
                />
              </YStack>
            </Tinted>
            <YStack f={1}>
              <XStack ai="center" gap="$1">
                <Text
                  fontSize="$3"
                  fontWeight="700"
                  color="color9"
                  numberOfLines={1}
                  style={{ maxWidth: mode === 'card' ? 200 : 140 }}
                >
                  {displayName}
                </Text>
                {hasAutopilot && (
                  <Sparkles size={12} color="var(--color9)" />
                )}
              </XStack>
              <Text fontSize={10} color="$color8" numberOfLines={1}>
                {board?.name}
              </Text>
            </YStack>
          </XStack>

          {/* Right side: approve/reject OR connection status + menu */}
          <XStack ai="center" gap="$2">
            {isPending ? (
              <>
                <Button
                  size="$2"
                  theme="green"
                  onPress={(e) => {
                    e.stopPropagation();
                    onApprove?.(board);
                  }}
                  icon={Check}
                >
                  Approve
                </Button>
                <Button
                  size="$2"
                  chromeless
                  color="$red10"
                  onPress={(e) => {
                    e.stopPropagation();
                    onReject?.(board);
                  }}
                  icon={X}
                />
              </>
            ) : (
              <>
                {/* Connection status - only show if we have real connection info */}
                {showConnectionStatus && (
                  isConnected ? (
                    <XStack ai="center" gap="$1" bg="$color2" br="$10" px="$2" py="$1">
                      <Wifi size={10} color="var(--color10)" />
                      <Text fontSize={9} fontWeight="600" color="$color8">ON</Text>
                    </XStack>
                  ) : (
                    <XStack ai="center" gap="$1" bg="$gray3" br="$10" px="$2" py="$1">
                      <WifiOff size={10} color="var(--gray8)" />
                      <Text fontSize={9} fontWeight="500" color="$gray9">OFF</Text>
                    </XStack>
                  )
                )}

                {/* Menu (both card and node modes) */}
                {onDelete && (
                  <XStack
                    onClick={(e) => { e.stopPropagation?.(); e.preventDefault?.(); }}
                    onPointerDown={(e) => { e.stopPropagation?.(); }}
                  >
                    <ItemMenu
                      type="item"
                      sourceUrl={`/api/core/v1/boards/${board?.name}`}
                      element={{ data: board }}
                      deleteable={() => true}
                      onDelete={onDelete}
                      extraMenuActions={[
                        {
                          text: "Settings",
                          icon: Cog,
                          action: (element) => {
                            const data = element?.data ?? element
                            setEditSettingsDialog(true)
                            setSelectedBoard({ data })
                          },
                          isVisible: () => canUpdateBoard
                        },
                        {
                          text: "Create template",
                          icon: LayoutTemplate,
                          action: (element) => {
                            const data = element?.data ?? element
                            setCreateTemplateDialog(true)
                            setSelectedBoard({ data })
                            setTemplateName(data?.name || '')
                          },
                          isVisible: () => canCreateTemplate
                        }
                      ]}
                    />
                  </XStack>
                )}
              </>
            )}
          </XStack>
        </XStack>
      </YStack>

      {/* Navigation icons */}
      {showNavIcons && (
        <XStack
          gap="$3"
          ai="center"
          jc="flex-start"
          px="$3"
          mb="$3"
          mt="$2"
          zIndex={1}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Tinted>
            {navIcons.map(({ key, Icon, label }) => (
              <InteractiveIcon
                key={key}
                Icon={Icon}
                IconColor="var(--color10)"
                bc="$bgContent"
                hoverStyle={{ bc: "var(--color5)" }}
                pressStyle={{ o: 0.8 }}
                size={20}
                tooltip={label}
                onClick={(e) => goToView(key, e)}
              />
            ))}
          </Tinted>
        </XStack>
      )}

      {/* Content section */}
      <YStack px="$3" pb="$3" gap="$2" zIndex={1}>
        {/* Cards preview */}
        {cards.length > 0 && (
          <XStack ai="center" gap="$2">
            <Layers size={11} color="var(--color8)" />
            <CardIconPreview cards={cards} />
            {cards.length > 0 && (
              <Text fontSize={9} color="$color8">
                {cards.length} card{cards.length !== 1 ? 's' : ''}
              </Text>
            )}
          </XStack>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <XStack ai="center" gap="$1" flexWrap="wrap">
            <Tag size={10} color="var(--color8)" />
            {tags.slice(0, 3).map((tag: string, i: number) => (
              <Tinted key={i}>
                <MiniChip label={tag} />
              </Tinted>
            ))}
            {tags.length > 3 && (
              <Text fontSize={9} color="$color8">+{tags.length - 3}</Text>
            )}
          </XStack>
        )}

        {/* Platform badge */}
        <XStack ai="center" jc="space-between">
          <XStack
            br="$2"
            px="$2"
            py="$0.5"
            bg="$color2"
          >
            <Text fontSize={9} fontWeight="600" color="$color10" textTransform="uppercase">
              {platform}
            </Text>
          </XStack>
        </XStack>
      </YStack>
    </YStack>
    </div>
    </>
  )

  const dialogs = (
    <>
      {/* Settings Dialog */}
      <Dialog open={editSettingsDialog} onOpenChange={setEditSettingsDialog}>
        <Dialog.Portal className="DialogPopup">
          <Dialog.Overlay className="DialogPopup" />
          <Dialog.Content
            overflow="hidden"
            p={0}
            width={700}
            maxHeight="85vh"
            backgroundColor="$bgContent"
            className="DialogPopup"
            onClick={(e) => { e.stopPropagation(); }}
            onMouseDown={(e) => { e.stopPropagation(); }}
            onPointerDown={(e) => { e.stopPropagation(); }}
          >
            <Text pt="$4" px="$4" fos="$8" fow="600" className='DialogPopup'>Settings</Text>
            <BoardSettingsEditor
              board={selectedBoard?.data ?? selectedBoard}
              onSave={async (updatedBoard) => {
                await API.post(`/api/core/v1/boards/${updatedBoard.name}`, updatedBoard)
                setSelectedBoard(null)
                setEditSettingsDialog(false)
              }}
            />
            <Dialog.Close />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog key={selectedBoard?.data?.name} open={createTemplateDialog} onOpenChange={setCreateTemplateDialog}>
        <Dialog.Portal className='DialogPopup'>
          <Dialog.Overlay className='DialogPopup' />
          <Dialog.Content
            overflow="hidden"
            p="$8"
            height={'400px'}
            width={"400px"}
            backgroundColor="$bgContent"
            className='DialogPopup'
            onClick={(e) => { e.stopPropagation(); }}
            onMouseDown={(e) => { e.stopPropagation(); }}
            onPointerDown={(e) => { e.stopPropagation(); }}
          >
            <YStack height="100%" justifyContent="space-between">
              <Text fos="$8" fow="600" mb="$3" className='DialogPopup'>Agent Template</Text>
              <XStack ai={"center"} className='DialogPopup'>
                <Label ml={"$2"} h={"$3.5"} size={"$5"} className='DialogPopup'>Name</Label>
              </XStack>
              <Input
                br={"8px"}
                className='DialogPopup'
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
              <XStack ai={"center"} className='DialogPopup'>
                <Label ml={"$2"} h={"$3.5"} size={"$5"} className='DialogPopup'>Description</Label>
              </XStack>
              <Input
                br={"8px"}
                className='DialogPopup'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <YStack flex={1} className='DialogPopup' />
              <Button
                className='DialogPopup'
                onMouseDown={(e) => { e.stopPropagation(); }}
                onPointerDown={(e) => { e.stopPropagation(); }}
                onPress={async (e) => {
                  e.stopPropagation();
                  try {
                    await API.post(`/api/core/v2/templates/boards`, {
                      name: templateName,
                      description,
                      from: selectedBoard?.data?.name
                    })
                    setSelectedBoard(null)
                    setCreateTemplateDialog(false)
                  } catch (e) {
                    console.log('e: ', e)
                  }
                }}
              >
                Create
              </Button>
            </YStack>
            <Dialog.Close />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </>
  )

  if (mode === 'node') {
    return (
      <>
        <div style={{ position: 'relative' }}>
          {content}
          <Handle
            type="target"
            position={handlePosition || Position.Left}
            id="input"
            style={{ opacity: 0, pointerEvents: 'none' }}
          />
        </div>
        {dialogs}
      </>
    )
  }

  return <>{content}{dialogs}</>
})

export default NetworkCard

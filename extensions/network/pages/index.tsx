import React, { useMemo, useCallback } from 'react'
import { BoardModel } from '../../boards/boardsSchemas'
import { API } from 'protobase'
import { DataTable2 } from "protolib/components/DataTable2"
import { DataView, DataViewActionButton } from "protolib/components/DataView"
import { AdminPage } from "protolib/components/AdminPage"
import { useRouter } from 'solito/navigation';
import { createParam } from 'solito'
import { AsyncView } from 'protolib/components/AsyncView'
import { YStack, XStack, Spacer, ScrollView, Text, Paragraph, Button } from "@my/ui";
import { AlertDialog } from 'protolib/components/AlertDialog'
import { useState } from 'react'
import { Slides } from 'protolib/components/Slides';
import { TemplateCard } from '../../apis/TemplateCard';
import { Eye, EyeOff, Plus, Bot, Sparkles, Network, PlayCircle, Cpu, Box } from '@tamagui/lucide-icons'
import { usePageParams } from 'protolib/next'
import { Tinted } from 'protolib/components/Tinted'
import { BoardView } from '@extensions/boards/pages/view'
import { networkOptions, NetworkOption } from '../options'
import { shouldShowInArea } from 'protolib/helpers/Visibility'
import { NetworkTopologyView } from '../components/NetworkTopologyView'
import { NetworkCard } from '../components/NetworkCard'
import { TutorialVideoDialog } from 'protolib/components/TutorialVideoDialog'
import { sendToPageBus } from 'protolib/lib/PageBus'
import { useHasPermission } from 'protolib/lib/usePermission'

const { useParams } = createParam()

const sourceUrl = '/api/core/v1/boards'

const SelectGrid = ({ children }) => {
  return <XStack jc="flex-start" ai="flex-start" gap={25} flexWrap='wrap' width="100%" maxWidth={760} mx="auto">
    {children}
  </XStack>
}

// Filter tabs for network view
const filterTabs = [
  { id: undefined, label: 'All', icon: Bot },
  { id: 'devices', label: 'Devices', icon: Cpu },
  { id: 'storages', label: 'Storages', icon: Box },
] as const

// Empty state component when there are no agents
const EmptyAgentsState = ({ onCreateClick }: { onCreateClick: () => void }) => {
  return (
    <YStack f={1} ai="center" jc="center" py="$10" gap="$6" mt="$8">
      {/* Decorative icon with effect */}
      <YStack position="relative" ai="center" jc="center">
        <YStack
          position="absolute"
          width={120}
          height={120}
          br={60}
          opacity={0.2}
          bg="$color9"
          // @ts-ignore
          style={{ filter: 'blur(40px)' }}
        />
        <Tinted>
          <Bot size={72} color="$color9" strokeWidth={1.2} />
        </Tinted>
      </YStack>

      {/* Main text */}
      <YStack ai="center" gap="$2" maw={400}>
        <Text fontSize="$8" fontWeight="700" color="$color12" ta="center" fontFamily="$heading">
          No agents yet
        </Text>
        <Paragraph size="$4" color="$color10" ta="center" lh="$5">
          Create your first AI agent to automate tasks, connect devices, and build intelligent workflows.
        </Paragraph>
      </YStack>

      {/* Large create button */}
      <Tinted>
        <Button size="$5" icon={Plus} onPress={onCreateClick}>
          Create your first agent
        </Button>
      </Tinted>

      {/* Hint subtle */}
      <XStack ai="center" gap="$2" opacity={0.5}>
        <Sparkles size={14} color="$color9" />
        <Text fontSize="$2" color="$color9">
          Agents can control devices, process data, and respond to events
        </Text>
      </XStack>
    </YStack>
  )
}

// Filter tabs for popup
const popupFilterTabs = [
  { id: undefined, label: 'All', icon: Bot, category: undefined },
  { id: 'devices', label: 'Devices', icon: Cpu, category: 'device' },
  { id: 'storages', label: 'Storages', icon: Box, category: 'storage' },
] as const

type PopupCategoryFilter = 'device' | 'storage' | undefined

const CategorySlide = ({
  selected,
  setSelected,
  categoryFilter,
  setCategoryFilter
}: {
  selected: NetworkOption | null,
  setSelected: (option: NetworkOption) => void,
  categoryFilter: PopupCategoryFilter,
  setCategoryFilter: (filter: PopupCategoryFilter) => void
}) => {
  const filteredOptions = categoryFilter
    ? networkOptions.filter(opt => opt.category === categoryFilter)
    : networkOptions

  return <YStack>
    {/* Filter tabs */}
    <XStack gap="$1" mb="$4" jc="center">
      {popupFilterTabs.map((tab) => {
        const isActive = categoryFilter === tab.category
        const Icon = tab.icon
        return (
          <Tinted key={tab.id ?? 'all'}>
            <Button
              size="$2"
              chromeless={!isActive}
              backgroundColor={isActive ? '$color5' : 'transparent'}
              borderRadius="$2"
              paddingHorizontal="$3"
              icon={<Icon size={14} color={isActive ? '$color11' : '$gray9'} />}
              onPress={() => setCategoryFilter(tab.category)}
              pressStyle={{ opacity: 0.8 }}
            >
              <Text fontSize={12} fontWeight={isActive ? '600' : '400'} color={isActive ? '$color11' : '$gray10'}>
                {tab.label}
              </Text>
            </Button>
          </Tinted>
        )
      })}
    </XStack>
    <ScrollView mah={"500px"}>
      <SelectGrid>
        {filteredOptions.map((option) => (
          <TemplateCard
            key={option.id}
            template={option}
            isSelected={selected?.id === option.id}
            onPress={() => setSelected(option)}
          />
        ))}
      </SelectGrid>
    </ScrollView>
    <Spacer marginBottom="$8" />
  </YStack>
}


export default {
  boards: {
    component: ({ workspace, pageState, initialItems, itemData, pageSession, extraData }: any) => {
      const router = useRouter()
      const { push, query} = usePageParams({})
      const [addOpen, setAddOpen] = React.useState(false)
      const [tutorialOpen, setTutorialOpen] = useState(false)
      const [selectedOption, setSelectedOption] = useState<NetworkOption | null>(networkOptions[0] || null)
      const [step, setStep] = useState<'select' | 'configure'>('select')
      const [popupCategoryFilter, setPopupCategoryFilter] = useState<PopupCategoryFilter>(undefined)

      // Check if user can create boards
      const canCreate = useHasPermission('boards.create')
      // Check if user can delete boards
      const canDelete = useHasPermission('boards.delete')

      const handleCreated = useCallback((data?: any) => {
        setAddOpen(false)
        setStep('select')
        // Navigation is handled by each option's Component
      }, [])

      const handleDialogClose = useCallback((open: boolean) => {
        setAddOpen(open)
        if (!open) {
          setStep('select')
        }
      }, [])

      // Check if we're in an iframe
      const isInIframe = typeof window !== 'undefined' && window !== window.parent

      // Helper to navigate to a board (opens tab in iframe, otherwise router.push)
      const navigateToBoard = useCallback((name: string) => {
        if (isInIframe) {
          sendToPageBus({ type: 'open-tab', name, tabType: 'board' })
        } else {
          router.push(`/boards/view?board=${name}`)
        }
      }, [router, isInIframe])

      // Memoize the node click handler
      const handleNodeClick = useCallback((nodeData: any) => {
        if (nodeData?.originalData?.name) {
          navigateToBoard(nodeData.originalData.name)
        }
      }, [navigateToBoard])

      // Handler for Add node click - initialize popup filter from page filter
      const handleAddClick = useCallback(() => {
        // Map page filter (devices/storages) to popup category filter (device/storage)
        const initialFilter: PopupCategoryFilter = query.type === 'devices' ? 'device'
          : query.type === 'storages' ? 'storage'
          : undefined
        setPopupCategoryFilter(initialFilter)
        // Pre-select first option in the filtered category
        const filteredOptions = initialFilter
          ? networkOptions.filter(opt => opt.category === initialFilter)
          : networkOptions
        setSelectedOption(filteredOptions[0] || null)
        setAddOpen(true)
      }, [query.type])

      // Handler for deleting a node from topology view
      const handleDeleteNode = useCallback(async (nodeData: any) => {
        if (nodeData?.name) {
          await API.get(`/api/core/v1/boards/${nodeData.name}/delete`)
          if (isInIframe) {
            sendToPageBus({ type: 'close-tab', name: nodeData.name, tabType: 'board' })
          }
        }
      }, [isInIframe])

      // Memoize extraViews to prevent re-renders of NetworkTopologyView
      const extraViews = useMemo(() => [{
        name: 'topology',
        icon: Network,
        component: () => <NetworkTopologyView
          showAll={query.all === 'true'}
          filterType={query.type}
          onNodeClick={handleNodeClick}
          onAddClick={canCreate ? handleAddClick : undefined}
          onDeleteNode={canDelete ? handleDeleteNode : undefined}
        />,
      }], [query.all, query.type, handleNodeClick, handleAddClick, handleDeleteNode, canCreate, canDelete])

      // Filter tabs for toolbar left
      const filterTabsContent = useMemo(() => (
        <XStack gap="$1" mr="$4">
          {filterTabs.map((tab) => {
            const isActive = query.type === tab.id
            const Icon = tab.icon
            return (
              <Tinted key={tab.id ?? 'agents'}>
                <Button
                  size="$2"
                  chromeless={!isActive}
                  backgroundColor={isActive ? '$color5' : 'transparent'}
                  borderRadius="$2"
                  paddingHorizontal="$2"
                  icon={<Icon size={14} color={isActive ? '$color11' : '$gray9'} />}
                  onPress={() => push('type', tab.id ?? '')}
                  pressStyle={{ opacity: 0.8 }}
                >
                  <Text fontSize={12} fontWeight={isActive ? '600' : '400'} color={isActive ? '$color11' : '$gray10'}>
                    {tab.label}
                  </Text>
                </Button>
              </Tinted>
            )
          })}
        </XStack>
      ), [query.type, push])

      // Memoize extraActions
      const extraActions = useMemo(() => [
        // <Tinted key="watch-tutorial">
        //   <DataViewActionButton
        //     id="admin-dataview-tutorial-btn"
        //     icon={PlayCircle}
        //     description="Watch tutorial"
        //     onPress={() => setTutorialOpen(true)}
        //   />
        // </Tinted>,
        <Tinted key="toggle-visibility-scope">
          <DataViewActionButton
            id="admin-dataview-add-btn"
            icon={query.all === 'true' ? EyeOff : Eye}
            description={
              query.all === 'true'
                ? 'Show only boards visible in this view'
                : 'Show boards from all views'
            }
            onPress={() => {
              push('all', query.all === 'true' ? 'false' : 'true')
            }}
          />
        </Tinted>
      ], [query.all, push])

      // Platform filters
      const devicePlatforms = ['esphome', 'arduino', 'esp32', 'esp8266']

      // Memoize dataTableGridProps
      const dataTableGridProps = useMemo(() => ({
        emptyMessage: canCreate ? <EmptyAgentsState onCreateClick={() => setAddOpen(true)} /> : null,
        itemsTransform: (items: any[]) => {
          const list = Array.isArray(items) ? [...items] : [];
          // Filter by type if specified
          if (query.type === 'devices') {
            // For devices filter, show items that are actual devices (have device-related platform)
            // Note: The topology view shows devices from /api/core/v1/devices separately
            return list.filter((item) => item.platform && item.platform !== 'virtual');
          }
          if (query.type === 'storages') {
            // Storages are from /api/core/v1/objects, not boards
            // The topology view shows objects, grid view doesn't support them
            return [];
          }
          if (query.all !== 'true') {
            return list.filter((item) => shouldShowInArea(item, 'agents'));
          }
          return list;
        },
        getCard: (element: any, width: number) => (
          <NetworkCard
            showNavIcons={true}
            board={element}
            platform={element.platform || 'virtual'}
            mode="card"
            width={width}
            onPress={() => navigateToBoard(element.name)}
            onDelete={canDelete ? async () => {
              await API.get(`/api/core/v1/boards/${element.name}/delete`);
              if (isInIframe) {
                sendToPageBus({ type: 'close-tab', name: element.name, tabType: 'board' })
              }
            } : undefined}
          />
        ),
      }), [query.all, query.type, navigateToBoard, isInIframe, canDelete, canCreate])

      const pageTitle = query.type === 'devices'
        ? 'Network > Devices'
        : query.type === 'storages'
          ? 'Network > Storages'
          : 'Network'

      const sectionName = query.type === 'devices'
        ? 'Network Devices'
        : query.type === 'storages'
          ? 'Network Storages'
          : 'Network'

      return (<AdminPage title={pageTitle} workspace={workspace} pageSession={pageSession}>

        <TutorialVideoDialog
          open={tutorialOpen}
          onClose={() => setTutorialOpen(false)}
        />

        <AlertDialog
          p={"$2"}
          pt="$5"
          pl="$5"
          setOpen={handleDialogClose}
          open={addOpen}
          hideAccept={true}
          description={""}
        >
          <YStack f={1} jc="center" ai="center">
            <XStack mr="$5">
              {/* Keep both components mounted but hidden to avoid re-render of underlying graph */}
              <YStack display={step === 'select' ? 'flex' : 'none'}>
                <Slides
                  lastButtonCaption="Next"
                  id='network-categories'
                  onFinish={() => {
                    setStep('configure')
                  }}
                  slides={[
                    {
                      name: "Add Network Element",
                      title: "",
                      component: <CategorySlide
                        selected={selectedOption}
                        setSelected={setSelectedOption}
                        categoryFilter={popupCategoryFilter}
                        setCategoryFilter={setPopupCategoryFilter}
                      />
                    }
                  ]}
                />
              </YStack>
              <YStack display={step === 'configure' ? 'flex' : 'none'}>
                {selectedOption && <selectedOption.Component onCreated={handleCreated} onBack={() => setStep('select')} />}
              </YStack>
            </XStack>
          </YStack>
        </AlertDialog>
        <DataView
          entityName={sectionName}
          itemData={itemData}
          sourceUrl={sourceUrl}
          sourceUrlParams={query}
          hideDeleteAll={true}
          extraViews={extraViews}
          extraActions={extraActions}
          paginationLeft={filterTabsContent}
          extraFilters={[{ queryParam: "all" }, { queryParam: "type" }]}
          contentPadding="$1"

          initialItems={initialItems}
          numColumnsForm={1}
          disableItemSelection={true}
          onAdd={(data) => { navigateToBoard(data.name); return data }}
          name="Network Element"
          disableViews={['raw', 'list']}
          onEdit={data => { console.log("DATA (onEdit): ", data); return data }}
          columns={DataTable2.columns(
            DataTable2.column("name", row => row.name, "name")
          )}
          onAddButton={handleAddClick}
          model={BoardModel}
          pageState={pageState}
          dataTableGridProps={dataTableGridProps}
          defaultView={"topology"}
        />

      </AdminPage>)
    }
  },
  // Vista detallada del board (igual que en agents)
  view: {
    component: (props: any) => {
      const { params } = useParams()

      return <AsyncView ready={params.board ? true : false}>
        <BoardView key={params.board} {...props} board={undefined} />
      </AsyncView>
    }
  }
}

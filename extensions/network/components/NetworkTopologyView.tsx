import React, { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { API } from 'protobase'
import { Tinted } from 'protolib/components/Tinted'
import { useBoards } from '@extensions/boards/hooks/useBoards'
import { useThemeSetting } from '@tamagui/next-theme'
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  useInternalNode,
  getSmoothStepPath,
  Handle,
  Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { YStack, Text, XStack, Spinner, Image, useThemeName } from '@my/ui'
import { shouldShowInArea } from 'protolib/helpers/Visibility'
import { NetworkCard, getIconForPlatform } from './NetworkCard'
import { Plus } from '@tamagui/lucide-icons'

const CFG = {
  VENTO_NODE_SIZE: { width: 100, height: 100 },
  VENTO_NODE_BORDER: "$4",
  DEVICE_NODE_SIZE: { width: 260, height: 140 },
  MIN_RADIUS: 350,
  NODE_SPACING: 40, // Minimum space between nodes
} as const

// Calculate dynamic radius based on number of nodes
// Ensures nodes don't overlap by calculating minimum radius needed for the arc length
const calculateRadius = (nodeCount: number): number => {
  if (nodeCount <= 1) return CFG.MIN_RADIUS

  // Arc length between nodes should be at least node width + spacing
  const minArcLength = CFG.DEVICE_NODE_SIZE.width + CFG.NODE_SPACING

  // radius = (arc_length * n) / (2 * PI)
  const calculatedRadius = (minArcLength * nodeCount) / (2 * Math.PI)

  // Return the larger of minimum radius or calculated radius
  return Math.max(CFG.MIN_RADIUS, calculatedRadius)
}

// Get edge params for floating edges (similar to ReactFlow example)
function getEdgeParams(sourceNode: any, targetNode: any, sourceSize: { width: number; height: number }, targetSize: { width: number; height: number }, sourceIsCircle = false) {
  const sourcePos = sourceNode.internals.positionAbsolute
  const targetPos = targetNode.internals.positionAbsolute

  const sourceCenterX = sourcePos.x + sourceSize.width / 2
  const sourceCenterY = sourcePos.y + sourceSize.height / 2
  const targetCenterX = targetPos.x + targetSize.width / 2
  const targetCenterY = targetPos.y + targetSize.height / 2

  // Calculate angle between centers
  const dx = targetCenterX - sourceCenterX
  const dy = targetCenterY - sourceCenterY
  const angle = Math.atan2(dy, dx)

  let sx: number, sy: number, sourcePosition: Position
  let tx: number, ty: number, targetPosition: Position

  // Source point (Vento hub - circle)
  if (sourceIsCircle) {
    const radius = sourceSize.width / 2
    sx = sourceCenterX + Math.cos(angle) * radius
    sy = sourceCenterY + Math.sin(angle) * radius

    // Determine position for bezier curve direction
    const angleDeg = (angle * 180) / Math.PI
    if (angleDeg >= -45 && angleDeg < 45) sourcePosition = Position.Right
    else if (angleDeg >= 45 && angleDeg < 135) sourcePosition = Position.Bottom
    else if (angleDeg >= -135 && angleDeg < -45) sourcePosition = Position.Top
    else sourcePosition = Position.Left
  } else {
    // Rectangle intersection for source
    const result = getRectIntersectionPoint(sourcePos.x, sourcePos.y, sourceSize.width, sourceSize.height, targetCenterX, targetCenterY)
    sx = result.x
    sy = result.y
    sourcePosition = result.position
  }

  // Target point (device card - rectangle)
  const targetResult = getRectIntersectionPoint(targetPos.x, targetPos.y, targetSize.width, targetSize.height, sourceCenterX, sourceCenterY)
  tx = targetResult.x
  ty = targetResult.y
  targetPosition = targetResult.position

  return { sx, sy, tx, ty, sourcePos: sourcePosition, targetPos: targetPosition }
}

// Helper: get center point of the side closest to the origin (Vento at 0,0)
function getRectIntersectionPoint(
  rx: number, ry: number, rw: number, rh: number,
  px: number, py: number
): { x: number; y: number; position: Position } {
  const cx = rx + rw / 2
  const cy = ry + rh / 2

  // Calculate distance from each side's center to the origin (Vento)
  const leftCenter = { x: rx, y: cy }
  const rightCenter = { x: rx + rw, y: cy }
  const topCenter = { x: cx, y: ry }
  const bottomCenter = { x: cx, y: ry + rh }

  const distLeft = Math.sqrt(leftCenter.x ** 2 + leftCenter.y ** 2)
  const distRight = Math.sqrt(rightCenter.x ** 2 + rightCenter.y ** 2)
  const distTop = Math.sqrt(topCenter.x ** 2 + topCenter.y ** 2)
  const distBottom = Math.sqrt(bottomCenter.x ** 2 + bottomCenter.y ** 2)

  // Find the minimum distance
  const minDist = Math.min(distLeft, distRight, distTop, distBottom)

  // Return the center of the closest side
  if (minDist === distLeft) {
    return { x: rx, y: cy, position: Position.Left }
  } else if (minDist === distRight) {
    return { x: rx + rw, y: cy, position: Position.Right }
  } else if (minDist === distTop) {
    return { x: cx, y: ry, position: Position.Top }
  } else {
    return { x: cx, y: ry + rh, position: Position.Bottom }
  }
}

// Simple hash function to get a pseudo-random value from string
const hashString = (str: string) => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

// Floating edge using getBezierPath like ReactFlow example
const FloatingEdge = memo(({ id, source, target, data, style }: any) => {
  const sourceNode = useInternalNode(source)
  const targetNode = useInternalNode(target)

  const isConnected = data?.connected === true
  const isRunning = data?.running === true
  const isPending = data?.isPending === true

  // Pending devices have orange dashed edges
  const strokeColor = isPending ? 'var(--orange9)' : (isConnected ? 'var(--color9)' : 'var(--gray9)')

  // Using negative begin makes the animation start as if it's already been running
  const offset = useMemo(() => {
    const hash = hashString(id)
    const dur = 2.5 + (hash % 1500) / 1000 // 2.5-4s duration
    return  -((hash % 1000) / 1000) * dur // negative offset
  }, [id])

  if (!sourceNode || !targetNode) return null

  // Get edge params with floating positions
  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(
    sourceNode,
    targetNode,
    CFG.VENTO_NODE_SIZE,
    CFG.DEVICE_NODE_SIZE,
    true // source is circle (Vento hub)
  )

  // Use ReactFlow's getSmoothStepPath for angular edges with rounded corners
  const [edgePath] = getSmoothStepPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: sourcePos,
    targetX: tx,
    targetY: ty,
    targetPosition: targetPos,
    borderRadius: 20,
  })

  return (
    <>
      <path
        id={id}
        d={edgePath}
        stroke={strokeColor}
        strokeWidth={2}
        strokeDasharray={'6 4'}
        fill="none"
        style={{
          filter: isConnected ? 'drop-shadow(0 0 3px var(--color9))' : undefined,
          ...style
        }}
      />
      {isRunning && (
        <circle r="3" fill="var(--color9)">
          <animateMotion
            dur="3s"
            begin={`${offset}s`}
            repeatCount="indefinite"
            path={edgePath}
            keyPoints="0;1;0"
            keyTimes="0;0.5;1"
            calcMode="linear"
          />
        </circle>
      )}
    </>
  )
})

// Central Vento Hub node - premium design with logo
const VentoNode = memo(({ data }: { data: any }) => {
  const themeName = useThemeName()
  const isDark = themeName?.startsWith('dark')

  return (
    <YStack
      width={CFG.VENTO_NODE_SIZE.width}
      height={CFG.VENTO_NODE_SIZE.height}
      br={CFG.VENTO_NODE_BORDER}
      cursor="grab"
      ai="center"
      jc="center"
      style={{
        background: 'linear-gradient(145deg, var(--color3), var(--color2))',
        boxShadow: '0 0 40px rgba(var(--color9-rgb), 0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
        border: '3px solid var(--color8)',
      }}
    >
      <YStack
        position="absolute"
        top={-8}
        right={-8}
        bg="$color9"
        br="$10"
        px="$2"
        py="$1"
      >
        <Text fontSize={9} fontWeight="700" color="white">ONLINE</Text>
      </YStack>

      {/* Vento Logo */}
      <Image
        src="/public/vento-square.png"
        alt="Vento"
        width={"$5"}
        height={"$5"}
        style={{
          filter: isDark ? 'invert(70%) brightness(10)' : 'invert(5%)',
          objectFit: 'contain'
        }}
      />

      {/* Invisible handle for floating edges (required by ReactFlow) */}
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
    </YStack>
  )
})

// Device node wrapper - uses NetworkCard in node mode
const DeviceNode = memo(({ data, selected }: { data: any; selected?: boolean }) => {
  // Ensure connected is explicitly boolean to match edge state
  const isConnected = data.connected === true
  const isPending = data.isPending === true
  const isRunning = data.running === true

  return (
    <NetworkCard
      board={data.originalData}
      platform={data.type}
      isConnected={isConnected}
      isPending={isPending}
      isRunning={isRunning}
      isHidden={data.isHidden}
      selected={selected}
      mode="node"
      handlePosition={data.handlePosition}
      onDelete={data.onDelete}
      onApprove={data.onApprove}
      onReject={data.onReject}
    />
  )
})

// Add node - shown when network is empty or only has computer
const AddNode = memo(({ data }: { data: any }) => {
  const addLabel = data.filterType === 'devices'
    ? 'Add Device to Network'
    : data.filterType === 'storages'
      ? 'Add Storage to Network'
      : 'Add Element to Network'

  return (
    <YStack
      width={CFG.DEVICE_NODE_SIZE.width}
      padding="$3"
      height={CFG.DEVICE_NODE_SIZE.height}
      br="$4"
      cursor="pointer"
      ai="center"
      jc="center"
      gap="$2"
      // @ts-ignore
      style={{
        backgroundColor: 'var(--bgContent)',
        border: '2px dashed var(--gray9)',
      }}
      hoverStyle={{
        scale: 1.01,
        boxShadow: '0 0 20px var(--gray5)',
      }}
      pressStyle={{
        scale: 0.98,
      }}
    >
      <Plus size={30} color="$color11" strokeWidth={2} />
      <Text fontSize="$4" color="$color11">
        {addLabel}
      </Text>
      <Handle
        type="target"
        position={data.handlePosition || Position.Left}
        id="target"
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
    </YStack>
  )
})

const nodeTypes = { vento: VentoNode, device: DeviceNode, add: AddNode }
const edgeTypes = { floating: FloatingEdge }

// Get handle position based on angle (for device nodes - still needed for the card's handle)
const getHandlePosition = (angle: number): Position => {
  if (angle >= -45 && angle < 45) return Position.Left
  if (angle >= 45 && angle < 135) return Position.Top
  if (angle >= 135 || angle < -135) return Position.Right
  return Position.Bottom
}

type NetworkTopologyViewProps = {
  onNodeClick?: (node: any) => void
  onAddClick?: () => void
  onDeleteNode?: (node: any) => Promise<void>
  showAll?: boolean
  filterType?: string
}

export const NetworkTopologyView = memo(({ onNodeClick, onAddClick, onDeleteNode, showAll = false, filterType }: NetworkTopologyViewProps) => {
  // Use the boards hook for real-time running status
  const { boards, loading: boardsLoading } = useBoards()
  const [devices, setDevices] = useState<any[]>([])
  const [objects, setObjects] = useState<any[]>([])
  const [deviceStates, setDeviceStates] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const { resolvedTheme } = useThemeSetting()
  const darkMode = resolvedTheme === 'dark'

  // Fetch devices and objects (boards come from useBoards hook)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [devicesRes, objectsRes] = await Promise.all([
          API.get('/api/core/v1/devices?all=true'),
          API.get('/api/core/v1/objects?all=true'),
        ])

        if (!objectsRes.isError && objectsRes.data?.items) {
          setObjects(objectsRes.data.items)
        }

        if (!devicesRes.isError && devicesRes.data?.items) {
          setDevices(devicesRes.data.items)

          // Fetch connection states for each device
          const states: Record<string, any> = {}
          for (const device of devicesRes.data.items) {
            try {
              const stateRes = await API.get(`/api/core/v1/protomemdb/states/devices/${device.name}`)
              if (!stateRes.isError && stateRes.data) {
                states[device.name] = stateRes.data
              }
            } catch (e) {
              // Device might not have state yet
            }
          }
          setDeviceStates(states)
        }
      } catch (error) {
        console.error('Error fetching network data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Refresh every 10 seconds
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [])

  // Check if a device is connected based on recent state updates
  const isDeviceConnected = useCallback((deviceName: string) => {
    const state = deviceStates[deviceName]
    return state && Object.keys(state).length > 0
  }, [deviceStates])

  // Handle delete with optimistic update
  const handleDelete = useCallback(async (nodeData: any) => {
    if (!nodeData?.name) return

    // Optimistically remove devices from local state
    // Boards will be updated via the useBoards hook after API call
    setDevices(prev => prev.filter(d => d.name !== nodeData.name))

    // Call the actual delete handler
    if (onDeleteNode) {
      await onDeleteNode(nodeData)
    }
  }, [onDeleteNode])

  // Handle enrollment approval
  const handleApprove = useCallback(async (device: any) => {
    try {
      console.log('Approving enrollment for:', device.name)
      const result = await API.post(`/api/core/v1/devices/enrollments/${device.name}/approve`, {})
      console.log('Approval result:', result)

      if (result.isError) {
        console.error('Error approving enrollment:', result.error)
        alert(`Failed to approve enrollment: ${result.error?.message || 'Unknown error'}`)
        return
      }

      // Refresh devices data
      const devicesRes = await API.get('/api/core/v1/devices?all=true')
      if (!devicesRes.isError) {
        setDevices(devicesRes.data.items)
        console.log('Devices refreshed after approval')
      }
    } catch (error) {
      console.error('Error approving enrollment:', error)
      alert(`Failed to approve enrollment: ${error}`)
    }
  }, [])

  // Handle enrollment rejection
  const handleReject = useCallback(async (device: any) => {
    try {
      console.log('Rejecting enrollment for:', device.name)
      const result = await API.post(`/api/core/v1/devices/enrollments/${device.name}/reject`, {})
      console.log('Rejection result:', result)

      if (result.isError) {
        console.error('Error rejecting enrollment:', result.error)
        alert(`Failed to reject enrollment: ${result.error?.message || 'Unknown error'}`)
        return
      }

      // Refresh devices data
      const devicesRes = await API.get('/api/core/v1/devices?all=true')
      if (!devicesRes.isError) {
        setDevices(devicesRes.data.items)
        console.log('Devices refreshed after rejection')
      }
    } catch (error) {
      console.error('Error rejecting enrollment:', error)
      alert(`Failed to reject enrollment: ${error}`)
    }
  }, [])

  // Build nodes and edges
  const { nodes, edges } = useMemo(() => {
    const allNodes: any[] = []
    const allEdges: any[] = []

    // Central Vento node - center it at origin
    allNodes.push({
      id: 'vento-hub',
      type: 'vento',
      position: { x: -CFG.VENTO_NODE_SIZE.width / 2, y: -CFG.VENTO_NODE_SIZE.height / 2 },
      data: { label: 'Vento' },
      draggable: false,
    })

    // Device platforms for filtering
    const devicePlatforms = ['esphome', 'arduino', 'esp32', 'esp8266']

    // Separate boards into visible and hidden
    const visibleBoards: any[] = []
    const hiddenBoards: any[] = []

    boards.forEach(b => {
      // Skip device boards
      if (devices.some(d => d.name === b.name || `${d.name}_device` === b.name)) return

      // Filter by type if specified
      if (filterType === 'devices') {
        // When showing devices, don't include any boards - only devices from devices array
        return
      }

      if (filterType === 'storages') {
        // When showing storages, don't include boards - use objects array instead
        return
      }

      // Default: filter by agents visibility
      const isVisibleInAgents = shouldShowInArea(b, 'agents')

      if (isVisibleInAgents) {
        visibleBoards.push(b)
      } else if (showAll) {
        hiddenBoards.push(b)
      }
    })

    // Build network elements - all use the same design now
    const networkElements = [
      // Devices - only show if not filtering by storages
      ...(filterType === 'storages' ? [] : devices.map(d => {
        const isPending = d.data?.enrollment?.status === 'pending'
        const connected = isPending ? false : isDeviceConnected(d.name) === true
        return {
          id: `device-${d.name}`,
          name: d.name,
          type: 'device',
          platform: d.platform,
          connected, // Explicit boolean
          isPending, // Enrollment status
          isHidden: false,
          originalData: d,
        }
      })),
      // Objects/Storages - only show when filtering by storages
      ...(filterType === 'storages' ? objects.map(o => ({
        id: `object-${o.name}`,
        name: o.name,
        type: 'object',
        platform: 'storage',
        connected: true, // Objects are always "connected" (they're data stores)
        isPending: false,
        isHidden: false,
        originalData: o,
      })) : []),
      // Visible boards - virtual boards are always connected (they run on the server)
      ...visibleBoards.map(b => ({
        id: `board-${b.name}`,
        name: b.name,
        type: 'board',
        platform: 'virtual',
        connected: true,
        running: b.running || false,
        isPending: false,
        isHidden: false,
        originalData: b,
      })),
      // Hidden boards (only when showAll) - same design, just with badge
      ...hiddenBoards.map(b => ({
        id: `board-${b.name}`,
        name: b.name,
        type: 'board',
        platform: 'virtual',
        connected: true,
        running: b.running || false,
        isPending: false,
        isHidden: true,
        originalData: b,
      })),
    ]

    const isOnlyComputer = networkElements.length === 1 &&
      devices.length === 1 &&
      (devices[0].platform === 'desktop' || devices[0].name === 'computer')
    // Only show add node if user has permission (onAddClick is defined) and conditions are met
    const shouldShowAddNode = onAddClick && (networkElements.length === 0 || isOnlyComputer)

    if (shouldShowAddNode) {
      networkElements.unshift({
        id: 'add-node',
        name: 'add',
        type: 'add',
        platform: 'add',
        connected: false,
        isPending: false,
        isHidden: false,
        originalData: null,
      })
    }

    // Position elements in a circle around Vento
    const count = networkElements.length
    if (count === 0) return { nodes: allNodes, edges: allEdges }

    // Calculate dynamic radius based on node count to prevent overlap
    const radius = calculateRadius(count)

    const angleStep = (2 * Math.PI) / count
    const startAngle = -Math.PI / 2 // Start from top

    networkElements.forEach((element, index) => {
      const angle = startAngle + index * angleStep
      const angleDeg = (angle * 180) / Math.PI

      // Position using dynamic radius
      const x = Math.cos(angle) * radius - CFG.DEVICE_NODE_SIZE.width / 2
      const y = Math.sin(angle) * radius - CFG.DEVICE_NODE_SIZE.height / 2

      const handlePosition = getHandlePosition(angleDeg)

      // Use 'add' type for the add node, 'device' for everything else
      const nodeType = element.type === 'add' ? 'add' : 'device'

      allNodes.push({
        id: element.id,
        type: nodeType,
        position: { x, y },
        data: {
          label: element.name,
          type: element.platform,
          connected: element.connected,
          running: element.running || false,
          isPending: element.isPending,
          isHidden: element.isHidden,
          icon: getIconForPlatform(element.platform),
          handlePosition,
          originalData: element.originalData,
          onDelete: element.originalData ? () => handleDelete(element.originalData) : undefined,
          onApprove: element.isPending ? () => handleApprove(element.originalData) : undefined,
          onReject: element.isPending ? () => handleReject(element.originalData) : undefined,
          filterType,
        },
      })

      // Create floating edge from Vento to this element
      allEdges.push({
        id: `edge-${element.id}`,
        source: 'vento-hub',
        target: element.id,
        type: 'floating',
        data: {
          connected: element.connected,
          running: element.running || false,
          isPending: element.isPending
        },
      })
    })

    return { nodes: allNodes, edges: allEdges }
  }, [boards, devices, objects, isDeviceConnected, showAll, filterType, handleDelete, handleApprove, handleReject])

  const [nodesState, setNodesState, onNodesChange] = useNodesState([])
  const [edgesState, setEdgesState] = useEdgesState([])

  // Sync nodes and edges when data changes - using a stable reference check
  useEffect(() => {
    if (nodes.length > 0 || !loading) {
      setNodesState(nodes)
    }
  }, [nodes, loading, setNodesState])

  useEffect(() => {
    if (edges.length > 0 || !loading) {
      setEdgesState(edges)
    }
  }, [edges, loading, setEdgesState])

  const handleNodeClick = useCallback((_: any, node: any) => {
    if (node.id === 'add-node' && onAddClick) {
      onAddClick()
    } else if (node.id !== 'vento-hub' && onNodeClick) {
      onNodeClick(node.data)
    }
  }, [onNodeClick, onAddClick])

  // fitView will handle centering automatically

  // Generate a stable key based on the number of nodes to force re-mount when data changes significantly
  const flowKey = useMemo(() => {
    return `network-flow-${nodesState.length}-${edgesState.length}`
  }, [nodesState.length, edgesState.length])

  // Show loading spinner while fetching boards or devices/objects
  const isLoading = loading || boardsLoading

  if (isLoading) {
    return (
      <YStack f={1} ai="center" jc="center">
        <Tinted>
          <Spinner color="$color8" size={75} />
        </Tinted>
      </YStack>
    )
  }

  return (
    <Tinted>
      <div style={{ width: '100%', height: '100%', minHeight: '500px' }}>
        <ReactFlow
          key={flowKey}
          nodes={nodesState}
          edges={edgesState}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onNodeClick={handleNodeClick}
          minZoom={0.2}
          maxZoom={1.5}
          fitView
          fitViewOptions={{ padding: 0.2, minZoom: 0.5, maxZoom: 1 }}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
          zoomOnScroll
          zoomOnPinch
          panOnDrag
        >
          <Background gap={30} />
        </ReactFlow>
      </div>
    </Tinted>
  )
})

export default NetworkTopologyView

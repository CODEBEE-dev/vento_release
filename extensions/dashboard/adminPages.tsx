import { AdminPage } from 'protolib/components/AdminPage';
import { DashboardGrid } from 'protolib/components/DashboardGrid';
import { YStack, XStack, Input, Text, Button, Spinner, ScrollView, Image } from '@my/ui';
import { useThemeSetting } from '@tamagui/next-theme';
import { Protofy, API } from 'protobase'
import { useWorkspace } from 'protolib/lib/useWorkspace';
import { useSession } from 'protolib/lib/useSession'
import { useChatMessages } from 'protolib/lib/useChatMessages'
import { ArrowUp, LayoutGrid, Cpu, Box, Wifi, Circle, ChevronRight } from '@tamagui/lucide-icons'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { shouldShowInArea } from 'protolib/helpers/Visibility'

const isProtected = Protofy("protected", true)

// Example prompts for the home page - easy to modify
const examplePrompts = [
    "Detect when the camera sees a person and play an alarm...",
    "What is vento? i'm lost, explain it like i'm five",
    "What can you see right now? Describe the camera feed in detail",
    "Create a page that displays how many people are visible on the camera..."
]

const AuroraBackground = ({ children }: { children: React.ReactNode }) => {
    return (
        <YStack flex={1} width="100%" height="100%" position="relative" overflow="hidden">
            <YStack
                position="absolute"
                top={0}
                left={0}
                right={0}
                bottom={0}
                style={{
                    background: `
                        radial-gradient(ellipse 80% 50% at 50% 0%, rgba(99, 102, 241, 0.15), transparent),
                        radial-gradient(ellipse 50% 50% at 20% 50%, rgba(139, 92, 246, 0.1), transparent),
                        radial-gradient(ellipse 50% 50% at 80% 50%, rgba(59, 130, 246, 0.1), transparent)
                    `
                }}
                $theme-dark={{
                    style: {
                        background: `
                            radial-gradient(ellipse 80% 50% at 50% 0%, rgba(99, 102, 241, 0.2), transparent),
                            radial-gradient(ellipse 50% 50% at 20% 50%, rgba(139, 92, 246, 0.15), transparent),
                            radial-gradient(ellipse 50% 50% at 80% 50%, rgba(59, 130, 246, 0.15), transparent)
                        `
                    }
                }}
            />
            <YStack flex={1} position="relative" zIndex={1}>
                {children}
            </YStack>
        </YStack>
    )
}

const DashboardCard = ({ title, icon, color, href, children, loading }: { title: string, icon: React.ReactNode, color: string, href: string, children: React.ReactNode, loading?: boolean }) => {
    const router = useRouter()
    return (
        <YStack
            backgroundColor="$bgContent"
            borderRadius="$6"
            width={270}
            minHeight={200}
            borderWidth={1}
            borderColor="$borderColor"
            overflow="hidden"
        >
            <XStack
                padding="$3"
                alignItems="center"
                justifyContent="space-between"
                borderBottomWidth={1}
                borderBottomColor="$borderColor"
                cursor="pointer"
                hoverStyle={{ backgroundColor: '$backgroundHover' }}
                onPress={() => router.push(href)}
            >
                <XStack gap="$2" alignItems="center">
                    <YStack backgroundColor={color} borderRadius="$2" padding="$1.5">
                        {icon}
                    </YStack>
                    <Text fontSize={14} fontWeight="600" color="$gray12">{title}</Text>
                </XStack>
                <ChevronRight size={16} color="$gray8" />
            </XStack>
            <YStack flex={1} padding="$3">
                {loading ? (
                    <YStack flex={1} justifyContent="center" alignItems="center">
                        <Spinner />
                    </YStack>
                ) : children}
            </YStack>
        </YStack>
    )
}

const DeviceItem = ({ name, online }: { name: string, online?: boolean }) => {
    const router = useRouter()
    return (
        <XStack
            padding="$2"
            alignItems="center"
            gap="$2"
            borderRadius="$2"
            cursor="pointer"
            hoverStyle={{ backgroundColor: '$backgroundHover' }}
            onPress={() => router.push(`/project?tabs=board-${name}&active=board-${name}`)}
        >
            <Circle size={8} fill={online ? '#22c55e' : '$gray8'} color={online ? '#22c55e' : '$gray8'} />
            <Text fontSize={13} color="$gray11" flex={1}>{name}</Text>
            <Cpu size={14} color="$gray8" />
        </XStack>
    )
}

const BoardItem = ({ name, hasAgent }: { name: string, hasAgent?: boolean }) => {
    const router = useRouter()
    return (
        <XStack
            padding="$2"
            alignItems="center"
            gap="$2"
            borderRadius="$2"
            cursor="pointer"
            hoverStyle={{ backgroundColor: '$backgroundHover' }}
            onPress={() => router.push(`/project?tabs=board-${name}&active=board-${name}`)}
        >
            <LayoutGrid size={14} color="$blue10" />
            <Text fontSize={13} color="$gray11" flex={1}>{name}</Text>
            {hasAgent && <Text fontSize={10} color="$green10" backgroundColor="$green4" paddingHorizontal="$2" borderRadius="$1">agent</Text>}
        </XStack>
    )
}

const HomePage = ({ pageSession }: { pageSession: any }) => {
    const [session] = useSession()
    const [query, setQuery] = useState('')
    const [sending, setSending] = useState(false)
    const router = useRouter()
    const [data, setData] = useState({ devices: [] as any[], boards: [] as any[], objects: [] as any[] })
    const [loading, setLoading] = useState(true)
    const { resolvedTheme } = useThemeSetting()
    const themeMode = resolvedTheme === 'dark' ? 'dark' : 'light'

    const userName = (session as any)?.user?.id || 'there'
    const displayName = userName.charAt(0).toUpperCase() + userName.slice(1)

    // Use chat messages hook to send messages to Cinny
    const { sendToRoom } = useChatMessages({})

    useEffect(() => {
        const parseResponse = (res: any) => {
            const d = res?.data
            if (!d) return []
            if (Array.isArray(d)) return d
            if (d.items && Array.isArray(d.items)) return d.items
            return []
        }

        const fetchData = async () => {
            try {
                const [devicesRes, boardsRes, objectsRes] = await Promise.all([
                    API.get('/api/core/v1/devices?all=1'),
                    API.get('/api/core/v1/boards?all=1'),
                    API.get('/api/core/v1/objects?all=1')
                ])
                setData({
                    devices: parseResponse(devicesRes),
                    boards: parseResponse(boardsRes),
                    objects: parseResponse(objectsRes)
                })
            } catch (e) {
                console.error('Error fetching data:', e)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    const handleSubmit = () => {
        if (!query.trim() || sending) return

        setSending(true)

        // Add context prefix (invisible to user) to help the agent understand the source
        const contextPrefix = `[Context: You are integrated into Vento and the user has written a prompt from the welcome page. It could be a question or a request to create something.]\n\n`
        const fullMessage = contextPrefix + query

        // Send message to #vento room via the chat bridge
        sendToRoom('#vento:vento.local', fullMessage, true)
        setQuery('')

        // Navigate to workspace tabs
        router.push('/project')
    }

    return (
        <AdminPage title="Home" pageSession={pageSession}>
            <AuroraBackground>
                {/* Header with Vento logo */}
                <XStack
                    position="absolute"
                    top={0}
                    left={0}
                    right={0}
                    height={56}
                    paddingHorizontal="$4"
                    alignItems="center"
                    zIndex={10}
                >
                    <XStack
                        cursor="pointer"
                        onPress={() => router.push('/project')}
                        hoverStyle={{ opacity: 0.8 }}
                        pressStyle={{ opacity: 0.6 }}
                    >
                        <Image
                            key={themeMode}
                            style={{ filter: themeMode === 'dark' ? "invert(70%) brightness(10)" : "invert(5%)" }}
                            src="/public/vento-square.png"
                            alt="Vento"
                            width={22}
                            height={28}
                            resizeMode="contain"
                        />
                    </XStack>
                </XStack>

                <ScrollView flex={1}>
                    <YStack flex={1} padding="$4" minHeight="100%">
                        {/* Centered Hero */}
                        <YStack
                            paddingTop="15vh"
                            paddingBottom="$12"
                            alignItems="center"
                            gap="$4"
                        >
                            <Text fontSize={28} fontWeight="600" color="$gray12" textAlign="center">
                                What should we build, {displayName}?
                            </Text>

                            <XStack
                                backgroundColor="$bgContent"
                                borderRadius="$8"
                                padding="$3"
                                width="100%"
                                maxWidth={600}
                                alignItems="center"
                                gap="$2"
                                shadowColor="$shadowColor"
                                shadowOffset={{ width: 0, height: 4 }}
                                shadowOpacity={0.1}
                                shadowRadius={20}
                                elevation={4}
                            >
                                <Input
                                    flex={1}
                                    placeholder="Ask Vento to create something..."
                                    value={query}
                                    onChangeText={setQuery}
                                    borderWidth={0}
                                    outlineColor={"transparent"}
                                    backgroundColor="transparent"
                                    fontSize={15}
                                    onSubmitEditing={handleSubmit}
                                />
                                <Button
                                    size="$3"
                                    circular
                                    backgroundColor="$gray6"
                                    icon={sending ? <Spinner size="small" color="$color12" /> : <ArrowUp size={16} color="$color12" />}
                                    onPress={handleSubmit}
                                    disabled={sending}
                                />
                            </XStack>

                            {/* Example prompts */}
                            <YStack gap="$1" alignItems="center" paddingTop="$4">
                                {examplePrompts.slice(0, 4).map((prompt, index) => (
                                    <Text
                                        key={index}
                                        fontSize={12}
                                        color="$gray9"
                                        cursor="pointer"
                                        paddingHorizontal="$2"
                                        paddingVertical="$1"
                                        hoverStyle={{ color: '$gray11' }}
                                        pressStyle={{ color: '$gray12' }}
                                        onPress={() => setQuery(prompt)}
                                    >
                                        {prompt}
                                    </Text>
                                ))}
                            </YStack>
                        </YStack>

                        {/* Dashboard Cards */}
                        <XStack gap="$4" flexWrap="wrap" justifyContent="center" maxWidth={1200} alignSelf="center" width="100%">
                            {/* Agents Card */}
                            {(() => {
                                const agents = data.boards.filter((b: any) => shouldShowInArea(b, 'agents'))
                                return (
                                    <DashboardCard
                                        title={`Agents (${agents.length})`}
                                        icon={<LayoutGrid size={16} color="white" />}
                                        color="$blue9"
                                        href="/project"
                                        loading={loading}
                                    >
                                        <YStack gap="$1">
                                            {agents.length === 0 ? (
                                                <Text fontSize={13} color="$gray9" textAlign="center" paddingVertical="$4">No agents yet</Text>
                                            ) : (
                                                agents.slice(0, 5).map((board: any, i: number) => (
                                                    <BoardItem key={i} name={board.name} hasAgent={board.agent_input} />
                                                ))
                                            )}
                                            {agents.length > 5 && (
                                                <Text fontSize={12} color="$gray9" textAlign="center" marginTop="$2">+{agents.length - 5} more</Text>
                                            )}
                                        </YStack>
                                    </DashboardCard>
                                )
                            })()}

                            {/* Devices Card */}
                            <DashboardCard
                                title={`Devices (${data.devices.length})`}
                                icon={<Wifi size={16} color="white" />}
                                color="$green9"
                                href="/project"
                                loading={loading}
                            >
                                <YStack gap="$1">
                                    {data.devices.length === 0 ? (
                                        <Text fontSize={13} color="$gray9" textAlign="center" paddingVertical="$4">No devices yet</Text>
                                    ) : (
                                        data.devices.slice(0, 5).map((device: any, i: number) => (
                                            <DeviceItem key={i} name={device.name} online={device.online} />
                                        ))
                                    )}
                                    {data.devices.length > 5 && (
                                        <Text fontSize={12} color="$gray9" textAlign="center" marginTop="$2">+{data.devices.length - 5} more</Text>
                                    )}
                                </YStack>
                            </DashboardCard>

                            {/* Objects/Storages Card */}
                            <DashboardCard
                                title={`Storages (${data.objects.length})`}
                                icon={<Box size={16} color="white" />}
                                color="$purple9"
                                href="/project"
                                loading={loading}
                            >
                                <YStack gap="$1">
                                    {data.objects.length === 0 ? (
                                        <Text fontSize={13} color="$gray9" textAlign="center" paddingVertical="$4">No storages yet</Text>
                                    ) : (
                                        data.objects.slice(0, 5).map((obj: any, i: number) => (
                                            <XStack
                                                key={i}
                                                padding="$2"
                                                alignItems="center"
                                                gap="$2"
                                                borderRadius="$2"
                                                cursor="pointer"
                                                hoverStyle={{ backgroundColor: '$backgroundHover' }}
                                                onPress={() => router.push(`/project?tabs=board-${obj.name}&active=board-${obj.name}`)}
                                            >
                                                <Box size={14} color="$purple10" />
                                                <Text fontSize={13} color="$gray11">{obj.name}</Text>
                                            </XStack>
                                        ))
                                    )}
                                    {data.objects.length > 5 && (
                                        <Text fontSize={12} color="$gray9" textAlign="center" marginTop="$2">+{data.objects.length - 5} more</Text>
                                    )}
                                </YStack>
                            </DashboardCard>
                        </XStack>
                    </YStack>
                </ScrollView>
            </AuroraBackground>
        </AdminPage>
    )
}

export default {
    'dashboard': {
        component: ({ pageState, initialItems, pageSession, extraData }: any) => {
            const workspace = useWorkspace()
            const layouts = workspace?.dashboards?.length ? workspace?.dashboards[0]?.layout : []
            const itemsContent = workspace?.dashboards?.length ? workspace?.dashboards[0]?.content : []

            return (<AdminPage title="Dashboard" pageSession={pageSession}>
                <YStack flex={1} padding={20}>
                    <DashboardGrid items={itemsContent} layouts={layouts} borderRadius={10} padding={10} backgroundColor="white" />
                </YStack>
            </AdminPage>)
        }
    },
    'home': {
        component: ({ pageSession }: any) => {
            return <HomePage pageSession={pageSession} />
        }
    }
}

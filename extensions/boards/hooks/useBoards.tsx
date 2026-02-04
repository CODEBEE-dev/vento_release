import { useState, useEffect, useCallback, useRef } from 'react'
import { API } from 'protobase'
import { useEventEffect } from '@extensions/events/hooks'
import { useSubscription } from 'protolib/lib/mqtt'

export type Board = {
    name: string
    running: boolean
    [key: string]: any
}

type UseBoardsResult = {
    boards: Board[]
    loading: boolean
    error: string | null
    reload: () => void
}

export const useBoards = (): UseBoardsResult => {
    const [boards, setBoards] = useState<Board[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)
    // Track running executions per board: boardName -> Set of executionIds
    const runningExecutions = useRef<Map<string, Set<string>>>(new Map())
    // Debounce timers for turning off running state: boardName -> timeoutId
    const offTimers = useRef<Map<string, NodeJS.Timeout>>(new Map())

    // Subscribe to execution events for all boards
    const { onMessage } = useSubscription([
        'notifications/event/create/actions/boards/+/+/run',
        'notifications/event/create/actions/boards/+/+/done',
        'notifications/event/create/actions/boards/+/+/error',
        'notifications/event/create/actions/boards/+/+/cancelled',
    ])

    // Fetch boards from API
    const fetchBoards = useCallback(async () => {
        try {
            setError(null)
            const response = await API.get('/api/core/v1/boards?all=true')

            if (response.isError) {
                setError(response.error || 'Error loading boards')
                return
            }

            const items = Array.isArray(response.data?.items)
                ? response.data.items
                : []

            // Merge API data with MQTT running status
            setBoards(items.map((b: any) => {
                const executions = runningExecutions.current.get(b.name)
                const hasRunning = executions && executions.size > 0
                return {
                    ...b,
                    running: b.running || hasRunning
                }
            }))
        } catch (e: any) {
            console.error('Error fetching boards:', e)
            setError('Error loading boards')
        } finally {
            setLoading(false)
        }
    }, [])

    // Handle MQTT execution events
    useEffect(() => {
        const unsubscribe = onMessage?.((msg) => {
            try {
                // Extract board name from topic: notifications/event/create/actions/boards/{boardName}/{cardName}/{status}
                const parts = msg.topic.split('/')
                const boardIndex = parts.indexOf('boards')
                if (boardIndex === -1 || boardIndex + 1 >= parts.length) return
                const boardName = parts[boardIndex + 1]

                const eventData = JSON.parse(msg.message)
                const payload = eventData?.payload || eventData
                const status = payload?.status
                const executionId = payload?.executionId

                if (msg.topic.endsWith('/run') && status === 'running' && executionId) {
                    // Cancel any pending "off" timer for this board
                    const existingTimer = offTimers.current.get(boardName)
                    if (existingTimer) {
                        clearTimeout(existingTimer)
                        offTimers.current.delete(boardName)
                    }

                    // Add execution to board's running set
                    if (!runningExecutions.current.has(boardName)) {
                        runningExecutions.current.set(boardName, new Set())
                    }
                    runningExecutions.current.get(boardName)!.add(executionId)

                    // Immediately show running state
                    setBoards(prev => prev.map(b =>
                        b.name === boardName ? { ...b, running: true } : b
                    ))
                } else if (msg.topic.endsWith('/done') || msg.topic.endsWith('/error') || msg.topic.endsWith('/cancelled')) {
                    // Remove execution from board's running set
                    if (executionId && runningExecutions.current.has(boardName)) {
                        runningExecutions.current.get(boardName)!.delete(executionId)
                    }

                    // Only consider turning off if no more executions
                    const remainingExecutions = runningExecutions.current.get(boardName)
                    const stillRunning = remainingExecutions && remainingExecutions.size > 0

                    if (!stillRunning) {
                        // Debounce the "off" state - wait 1 second before turning off
                        // Cancel any existing timer first
                        const existingTimer = offTimers.current.get(boardName)
                        if (existingTimer) {
                            clearTimeout(existingTimer)
                        }

                        const timer = setTimeout(() => {
                            // Check again if still no executions (in case one started during the delay)
                            const currentExecutions = runningExecutions.current.get(boardName)
                            const currentlyRunning = currentExecutions && currentExecutions.size > 0

                            if (!currentlyRunning) {
                                setBoards(prev => prev.map(b =>
                                    b.name === boardName ? { ...b, running: false } : b
                                ))
                            }
                            offTimers.current.delete(boardName)
                        }, 1000)

                        offTimers.current.set(boardName, timer)
                    }
                }
            } catch (e) {
                // Ignore parse errors
            }
        })
        return () => unsubscribe?.()
    }, [onMessage])

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            offTimers.current.forEach(timer => clearTimeout(timer))
            offTimers.current.clear()
        }
    }, [])

    // Initial fetch and event listeners for board changes
    useEffect(() => { fetchBoards() }, [fetchBoards])
    useEventEffect(() => { fetchBoards() }, { path: 'boards/create/#' })
    useEventEffect(() => { fetchBoards() }, { path: 'boards/delete/#' })

    return { boards, loading, error, reload: fetchBoards }
}

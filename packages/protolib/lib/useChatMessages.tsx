/**
 * useChatMessages - Hook for communicating with the Cinny chat iframe
 *
 * This hook provides:
 * - Listening for chat messages (sent and received)
 * - Sending DMs to specific users via postMessage to Cinny
 * - Callbacks for message events
 */

import { useState, useEffect, useCallback, useRef } from 'react'

// Message types from Cinny
export interface ChatMessageEvent {
  type: 'cinny-message-sent' | 'cinny-message-received'
  roomId: string
  eventId: string
  sender: string
  content: string
  timestamp: number
}

export interface DMSentSuccessEvent {
  type: 'cinny-dm-sent-success'
  roomId: string
  eventId: string
  userId: string
}

export interface DMSentErrorEvent {
  type: 'cinny-dm-sent-error'
  userId: string
  error: string
}

export interface RoomMessageSuccessEvent {
  type: 'cinny-room-message-success'
  roomId: string
  eventId: string
  roomName: string
}

export interface RoomMessageErrorEvent {
  type: 'cinny-room-message-error'
  roomName: string
  error: string
}

export interface AgentDoneEvent {
  type: 'cinny-agent-done'
  roomId: string
  sender: string
  timestamp: number
}

type CinnyEvent = ChatMessageEvent | DMSentSuccessEvent | DMSentErrorEvent | AgentDoneEvent | RoomMessageSuccessEvent | RoomMessageErrorEvent

interface UseChatMessagesOptions {
  /** Called when any message is sent or received */
  onMessage?: (event: ChatMessageEvent) => void
  /** Called when a DM is successfully sent (in response to sendDM) */
  onDMSuccess?: (event: DMSentSuccessEvent) => void
  /** Called when a DM fails to send */
  onDMError?: (event: DMSentErrorEvent) => void
  /** Called when the agent signals it has finished processing */
  onAgentDone?: (event: AgentDoneEvent) => void
  /** Called when a room message is successfully sent (in response to sendToRoom) */
  onRoomMessageSuccess?: (event: RoomMessageSuccessEvent) => void
  /** Called when a room message fails to send */
  onRoomMessageError?: (event: RoomMessageErrorEvent) => void
  /** Filter messages by sender (e.g., only listen to messages from a specific bot) */
  filterSender?: string
}

interface UseChatMessagesReturn {
  /** All messages received since the hook was mounted */
  messages: ChatMessageEvent[]
  /** The last message received */
  lastMessage: ChatMessageEvent | null
  /** Send a DM to a user (will create room if needed) */
  sendDM: (userId: string, message: string, navigate?: boolean) => void
  /** Send a message to a room by name */
  sendToRoom: (roomName: string, message: string, navigate?: boolean) => void
  /** Clear all stored messages */
  clearMessages: () => void
  /** Whether a DM is currently being sent */
  isSending: boolean
}

/**
 * Hook for receiving and sending chat messages via the Cinny iframe
 *
 * @example
 * ```tsx
 * const { messages, lastMessage, sendDM, isSending } = useChatMessages({
 *   onMessage: (msg) => console.log('New message:', msg),
 *   filterSender: '@_vento_vento_agent:vento.local'
 * })
 *
 * // Send a DM to vento_agent (use bridged user ID with @_vento_ prefix)
 * sendDM('@_vento_vento_agent:vento.local', 'Hello!')
 * ```
 */
export function useChatMessages(options: UseChatMessagesOptions = {}): UseChatMessagesReturn {
  const { onMessage, onDMSuccess, onDMError, onAgentDone, onRoomMessageSuccess, onRoomMessageError, filterSender } = options

  const [messages, setMessages] = useState<ChatMessageEvent[]>([])
  const [lastMessage, setLastMessage] = useState<ChatMessageEvent | null>(null)
  const [isSending, setIsSending] = useState(false)

  // Use refs for callbacks to avoid re-registering event listener
  const onMessageRef = useRef(onMessage)
  const onDMSuccessRef = useRef(onDMSuccess)
  const onDMErrorRef = useRef(onDMError)
  const onAgentDoneRef = useRef(onAgentDone)
  const onRoomMessageSuccessRef = useRef(onRoomMessageSuccess)
  const onRoomMessageErrorRef = useRef(onRoomMessageError)

  useEffect(() => {
    onMessageRef.current = onMessage
    onDMSuccessRef.current = onDMSuccess
    onDMErrorRef.current = onDMError
    onAgentDoneRef.current = onAgentDone
    onRoomMessageSuccessRef.current = onRoomMessageSuccess
    onRoomMessageErrorRef.current = onRoomMessageError
  }, [onMessage, onDMSuccess, onDMError, onAgentDone, onRoomMessageSuccess, onRoomMessageError])

  // Listen for postMessages from Cinny
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as CinnyEvent

      if (!data?.type) return

      // Log all cinny events for debugging
      if (data.type?.startsWith('cinny-')) {
        console.log('[useChatMessages] Received postMessage:', data.type, 'sender:', (data as any).sender)
      }

      // Handle message events
      if (data.type === 'cinny-message-sent' || data.type === 'cinny-message-received') {
        const msgEvent = data as ChatMessageEvent

        // Apply sender filter if specified
        if (filterSender && msgEvent.sender !== filterSender) {
          console.log('[useChatMessages] Filtered out message from:', msgEvent.sender, '(filter:', filterSender, ')')
          return
        }

        console.log('[useChatMessages] Passing message to callback:', msgEvent.type, msgEvent.sender)
        setMessages(prev => [...prev, msgEvent])
        setLastMessage(msgEvent)
        onMessageRef.current?.(msgEvent)
      }

      // Handle DM success
      if (data.type === 'cinny-dm-sent-success') {
        setIsSending(false)
        onDMSuccessRef.current?.(data as DMSentSuccessEvent)
      }

      // Handle DM error
      if (data.type === 'cinny-dm-sent-error') {
        setIsSending(false)
        onDMErrorRef.current?.(data as DMSentErrorEvent)
      }

      // Handle agent done signal
      if (data.type === 'cinny-agent-done') {
        console.log('[useChatMessages] Agent done signal received')
        onAgentDoneRef.current?.(data as AgentDoneEvent)
      }

      // Handle room message success
      if (data.type === 'cinny-room-message-success') {
        setIsSending(false)
        onRoomMessageSuccessRef.current?.(data as RoomMessageSuccessEvent)
      }

      // Handle room message error
      if (data.type === 'cinny-room-message-error') {
        setIsSending(false)
        onRoomMessageErrorRef.current?.(data as RoomMessageErrorEvent)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [filterSender])

  // Send a DM to a user via postMessage to Cinny iframe
  const sendDM = useCallback((userId: string, message: string, navigate: boolean = true) => {
    setIsSending(true)

    // Find the Cinny iframe and send postMessage
    const iframe = document.querySelector('iframe[title="Vento Chat"]') as HTMLIFrameElement
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'vento-send-dm',
        userId,
        message,
        navigate
      }, '*')
    } else {
      console.warn('[useChatMessages] Cinny iframe not found')
      setIsSending(false)
      onDMErrorRef.current?.({
        type: 'cinny-dm-sent-error',
        userId,
        error: 'Chat iframe not found'
      })
    }
  }, [])

  // Send a message to a room by name via postMessage to Cinny iframe
  const sendToRoom = useCallback((roomName: string, message: string, navigate: boolean = true) => {
    setIsSending(true)

    // Find the Cinny iframe and send postMessage
    const iframe = document.querySelector('iframe[title="Vento Chat"]') as HTMLIFrameElement
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'vento-send-to-room',
        roomName,
        message,
        navigate
      }, '*')
    } else {
      console.warn('[useChatMessages] Cinny iframe not found')
      setIsSending(false)
      onRoomMessageErrorRef.current?.({
        type: 'cinny-room-message-error',
        roomName,
        error: 'Chat iframe not found'
      })
    }
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setLastMessage(null)
  }, [])

  return {
    messages,
    lastMessage,
    sendDM,
    sendToRoom,
    clearMessages,
    isSending
  }
}

export default useChatMessages

import React, { useEffect, useRef, useCallback, createContext, useContext, useSyncExternalStore, ReactNode, useState } from 'react'

// ============================================================================
// PageBus: A bidirectional message bus between parent window and iframes
// ============================================================================
//
// Usage:
//   Parent (e.g., /project page):
//     <PageBusParent>
//       <iframe ref={registerIframe} ... />
//     </PageBusParent>
//
//   Child (iframes):
//     <PageBusChild>
//       <YourApp />
//     </PageBusChild>
//
//   Anywhere (parent or child):
//     usePageBus((message) => {
//       if (message.type === 'tint-changed') { ... }
//     })
//
//     sendToPageBus({ type: 'tint-changed', tint: 'blue' })
//
// ============================================================================

export type PageBusMessage = {
  type: string
  [key: string]: any
}

// Internal message wrapper to distinguish PageBus messages
type PageBusEnvelope = {
  __pageBus: true
  message: PageBusMessage
  origin: 'parent' | 'child'
}

// ============================================================================
// Global state for message subscriptions (works in both parent and child)
// ============================================================================

type MessageHandler = (message: PageBusMessage) => void
const listeners = new Set<MessageHandler>()

// Last message for useSyncExternalStore (to trigger re-renders if needed)
let lastMessage: PageBusMessage | null = null
let messageVersion = 0

const notifyListeners = (message: PageBusMessage) => {
  lastMessage = message
  messageVersion++
  listeners.forEach(handler => {
    try {
      handler(message)
    } catch (e) {
      console.error('[PageBus] Error in message handler:', e)
    }
  })
}

export const onPageBusMessage = (handler: MessageHandler): (() => void) => {
  listeners.add(handler)
  return () => {
    listeners.delete(handler)
  }
}

// ============================================================================
// Detection: Are we the parent or a child?
// ============================================================================

const isInIframe = (): boolean => {
  try {
    return window.self !== window.top
  } catch (e) {
    return true // If we can't access top, we're in a cross-origin iframe
  }
}

// ============================================================================
// Parent-side: iframe registry and broadcast
// ============================================================================

type IframeRef = HTMLIFrameElement
const registeredIframes = new Set<IframeRef>()

const registerIframe = (iframe: IframeRef | null) => {
  if (iframe) {
    registeredIframes.add(iframe)
  }
}

const unregisterIframe = (iframe: IframeRef) => {
  registeredIframes.delete(iframe)
}

const broadcastToIframes = (message: PageBusMessage, excludeIframe?: IframeRef) => {
  const envelope: PageBusEnvelope = {
    __pageBus: true,
    message,
    origin: 'parent'
  }
  registeredIframes.forEach(iframe => {
    if (iframe !== excludeIframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.postMessage(envelope, '*')
      } catch (e) {
        console.error('[PageBus] Failed to post to iframe:', e)
      }
    }
  })
}

// ============================================================================
// sendToPageBus: Universal send function (works in parent and child)
// ============================================================================

export const sendToPageBus = (message: PageBusMessage) => {
  if (isInIframe()) {
    // Child: send to parent
    const envelope: PageBusEnvelope = {
      __pageBus: true,
      message,
      origin: 'child'
    }
    try {
      window.parent.postMessage(envelope, '*')
    } catch (e) {
      console.error('[PageBus] Failed to post to parent:', e)
    }
  } else {
    // Parent: broadcast to all iframes and notify local listeners
    notifyListeners(message)
    broadcastToIframes(message)
  }
}

// ============================================================================
// usePageBus: Hook to subscribe to messages
// ============================================================================

export const usePageBus = (handler: MessageHandler) => {
  useEffect(() => {
    return onPageBusMessage(handler)
  }, [handler])
}

// Alternative: usePageBusMessage - returns the last message (reactive)
export const usePageBusMessage = () => {
  return useSyncExternalStore(
    onPageBusMessage as any,
    () => ({ message: lastMessage, version: messageVersion }),
    () => ({ message: null, version: 0 })
  )
}

// ============================================================================
// PageBusParent: Provider component for the parent window
// ============================================================================

type PageBusParentContextType = {
  registerIframe: (iframe: IframeRef | null) => void
  unregisterIframe: (iframe: IframeRef) => void
}

const PageBusParentContext = createContext<PageBusParentContextType | null>(null)

export const usePageBusParent = () => useContext(PageBusParentContext)

type PageBusParentProps = {
  children: ReactNode
}

export const PageBusParent = ({ children }: PageBusParentProps) => {
  // Handle incoming messages from children
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as PageBusEnvelope
      if (data?.__pageBus && data.origin === 'child') {
        // Notify local (parent) listeners
        notifyListeners(data.message)

        // Find which iframe sent this and broadcast to others
        let sourceIframe: IframeRef | undefined
        registeredIframes.forEach(iframe => {
          if (iframe.contentWindow === event.source) {
            sourceIframe = iframe
          }
        })

        // Broadcast to all other iframes
        broadcastToIframes(data.message, sourceIframe)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const contextValue: PageBusParentContextType = {
    registerIframe,
    unregisterIframe
  }

  return (
    <PageBusParentContext.Provider value={contextValue}>
      {children}
    </PageBusParentContext.Provider>
  )
}

// ============================================================================
// PageBusChild: Provider component for child iframes
// ============================================================================

type PageBusChildProps = {
  children: ReactNode
}

export const PageBusChild = ({ children }: PageBusChildProps) => {
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as PageBusEnvelope
      if (data?.__pageBus && data.origin === 'parent') {
        notifyListeners(data.message)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return <>{children}</>
}

// ============================================================================
// usePageBusIframe: Hook to register an iframe ref with the parent
// ============================================================================

export const usePageBusIframe = () => {
  const context = usePageBusParent()
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const iframe = iframeRef.current
    if (iframe && context) {
      context.registerIframe(iframe)
      return () => context.unregisterIframe(iframe)
    }
  }, [context])

  // Return a callback ref for direct usage
  const callbackRef = useCallback((iframe: HTMLIFrameElement | null) => {
    if (context) {
      if (iframe) {
        context.registerIframe(iframe)
      }
    }
  }, [context])

  return callbackRef
}

// ============================================================================
// PageBusIframe: A convenience wrapper component for iframes
// ============================================================================

// ============================================================================
// PageBusAuto: Auto-detecting component for _app.tsx
// - If we're in an iframe: acts as PageBusChild
// - If we're NOT in an iframe: does nothing (PageBusParent should be explicit)
// ============================================================================

type PageBusAutoProps = {
  children: ReactNode
}

export const PageBusAuto = ({ children }: PageBusAutoProps) => {
  const [inIframe, setInIframe] = useState(false)

  useEffect(() => {
    setInIframe(isInIframe())
  }, [])

  // Only wrap with PageBusChild if we're inside an iframe
  if (inIframe) {
    return <PageBusChild>{children}</PageBusChild>
  }

  return <>{children}</>
}

// ============================================================================
// PageBusIframe: A convenience wrapper component for iframes
// ============================================================================

type PageBusIframeProps = React.IframeHTMLAttributes<HTMLIFrameElement> & {
  innerRef?: React.Ref<HTMLIFrameElement>
}

export const PageBusIframe = React.forwardRef<HTMLIFrameElement, PageBusIframeProps>(
  ({ innerRef, ...props }, forwardedRef) => {
    const context = usePageBusParent()
    const localRef = useRef<HTMLIFrameElement>(null)

    // Combine refs
    const setRefs = useCallback((el: HTMLIFrameElement | null) => {
      // Set local ref
      (localRef as React.MutableRefObject<HTMLIFrameElement | null>).current = el

      // Set forwarded ref
      if (typeof forwardedRef === 'function') {
        forwardedRef(el)
      } else if (forwardedRef) {
        (forwardedRef as React.MutableRefObject<HTMLIFrameElement | null>).current = el
      }

      // Set inner ref
      if (typeof innerRef === 'function') {
        innerRef(el)
      } else if (innerRef) {
        (innerRef as React.MutableRefObject<HTMLIFrameElement | null>).current = el
      }
    }, [forwardedRef, innerRef])

    useEffect(() => {
      const iframe = localRef.current
      if (iframe && context) {
        context.registerIframe(iframe)
        return () => context.unregisterIframe(iframe)
      }
    }, [context])

    return <iframe ref={setRefs} {...props} />
  }
)

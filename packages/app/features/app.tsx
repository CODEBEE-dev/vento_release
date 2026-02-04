
import '@tamagui/core/reset.css'
import '@tamagui/font-inter/css/400.css'
import '@tamagui/font-inter/css/700.css'
import "mapbox-gl/dist/mapbox-gl.css"
import 'raf/polyfill'
import '@xyflow/react/dist/style.css'
import 'protoflow/src/styles.css'
import 'protoflow/src/diagram/menu.module.css'
import 'react-sliding-side-panel/lib/index.css'
import 'protolib/styles/datatable.css';
import 'protolib/styles/styles.css';
import 'protolib/styles/chat.css';
import 'protolib/styles/chonky.css';
import 'protolib/styles/blueprint.css';
import 'protolib/styles/dashboard.css';
import 'protolib/styles/dashboardcard.css';
import 'protolib/styles/markdown.css';
import 'protolib/styles/map.css';
import 'react-vertical-timeline-component/style.min.css';
import 'app/styles/app.css';
import "@blueprintjs/table/lib/css/table.css";
import 'react-dropzone-uploader/dist/styles.css'
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import 'github-markdown-css/github-markdown-light.css';

import { NextThemeProvider, useRootTheme } from '@tamagui/next-theme'
import { Provider } from 'app/provider'
import Head from 'next/head'
import React from 'react'
import type { SolitoAppProps } from 'solito'
import { Provider as JotaiProvider } from 'jotai'
import { useSession } from 'protolib/lib/useSession'
import { AppConfContext } from 'protolib/providers/AppConf'
import { getBrokerUrl } from 'protolib/lib/Broker'
import { Connector } from 'protolib/lib/mqtt'
import { MqttWrapper } from 'protolib/components/MqttWrapper'
import { AISetupProvider } from 'protolib/components/AISetupProvider'
import { Toast, YStack } from '@my/ui'
import { SiteConfig } from 'app/conf'
import Workspaces from 'app/bundles/workspaces'
import { PanelLayout } from 'app/layout/PanelLayout'
import { useRouter } from 'next/router';
import { PageBusAuto, usePageBus, sendToPageBus } from 'protolib/lib/PageBus'
import { setTintByName } from 'protolib/lib/Tints'
import { useCallback, useEffect, useRef } from 'react'
import { useSubscription } from 'protolib/lib/mqtt'
import { API } from 'protobase'

// Syncs tint changes from PageBus
const TintSync = () => {
  usePageBus(useCallback((message) => {
    if (message.type === 'tint-changed' && message.tint) {
      setTintByName(message.tint)
    }
  }, []))
  return null
}

// Syncs agent running state between workspace and Cinny via PageBus
const AgentStateSync = () => {
  const currentExecutionId = useRef<string | null>(null)

  // Subscribe to ai_agent execution events only
  const { onMessage } = useSubscription([
    'notifications/event/create/actions/boards/vento_agent/ai_agent/run',
    'notifications/event/create/actions/boards/vento_agent/ai_agent/done',
    'notifications/event/create/actions/boards/vento_agent/ai_agent/error',
    'notifications/event/create/actions/boards/vento_agent/ai_agent/cancelled',
  ])

  useEffect(() => {
    const unsubscribe = onMessage?.((msg) => {
      try {
        const eventData = JSON.parse(msg.message)
        const innerPayload = eventData?.payload || eventData
        const executionId = innerPayload?.executionId
        const status = innerPayload?.status

        if (msg.topic.endsWith('/run') && status === 'running' && executionId) {
          currentExecutionId.current = executionId
          sendToPageBus({ type: 'agent-running' })
        } else if (msg.topic.endsWith('/done') || msg.topic.endsWith('/error') || msg.topic.endsWith('/cancelled')) {
          if (executionId && executionId === currentExecutionId.current) {
            currentExecutionId.current = null
            sendToPageBus({ type: 'agent-stopped' })
          }
        }
      } catch (e) {
        console.error('[AgentStateSync] Parse error:', e)
      }
    })
    return () => unsubscribe?.()
  }, [onMessage])

  // Listen for stop-agent request from Cinny
  usePageBus(useCallback((message) => {
    if (message.type === 'stop-agent' && currentExecutionId.current) {
      const executionId = currentExecutionId.current
      API.post(`/api/core/v1/boards/vento_agent/actions/ai_agent/executions/${executionId}/cancel`, {})
        .then((result) => {
          console.log('[AgentStateSync] Cancelled:', executionId, result)
        })
        .catch((e) => {
          console.error('[AgentStateSync] Failed to cancel:', executionId, e)
        })
      currentExecutionId.current = null
      sendToPageBus({ type: 'agent-stopped' })
    }
  }, []))

  return null
}

const getApp = (AppConfig, options = { disablePreviewMode: false }) => {
  return function MyApp({ Component, pageProps }: SolitoAppProps) {
    const projectName = SiteConfig.projectName
    return (
      <>
        <Head>
          <title>{projectName + " - AI Driven Machine Automation Platform"}</title>
          <meta name="description" content="Natural Language Autopilot system for smart and industrial devices" />
          {/* <link rel="icon" href="/favicon.ico" /> */}
        </Head>
        <JotaiProvider>
          <MqttWrapper>
            <ThemeProvider {...options}>
              <AppConfContext.Provider value={{
                ...AppConfig,
                bundles: {
                  workspaces: Workspaces,
                },
                layout: {
                  PanelLayout
                }
              }}>
                <PageBusAuto>
                  <TintSync />
                  <AgentStateSync />
                  <AISetupProvider>
                    <Component {...pageProps} />
                  </AISetupProvider>
                </PageBusAuto>
              </AppConfContext.Provider>
            </ThemeProvider>
          </MqttWrapper>
        </JotaiProvider>
      </>
    )
  }
}

function ThemeProvider({ children, disablePreviewMode }: { children: React.ReactNode }) {
  const router = useRouter();
  const [theme, setTheme] = useRootTheme()

  if (typeof window !== 'undefined') {
    window.TamaguiTheme = theme
  }

  const forcedTheme = SiteConfig.ui.forcedTheme
  const currentUrl = router.asPath;
  const containsChatbot = currentUrl.includes('/chatbot');
  const isDev = process.env.NODE_ENV === 'development'

  return (
    <NextThemeProvider
      forcedTheme={forcedTheme}
      onChangeTheme={(next) => {
        setTheme(next as any)
        // Notify Electron about theme change (for splash/log window)
        if (typeof window !== 'undefined' && (window as any).electronAPI?.setTheme) {
          (window as any).electronAPI.setTheme(next)
        }
      }}
    >
      <Provider disableRootThemeClass defaultTheme={theme}>
        {children}

        {(isDev && !containsChatbot && !disablePreviewMode) && <Toast
          viewportName="warnings"
          enterStyle={{ opacity: 0, scale: 0.5, y: -25 }}
          exitStyle={{ opacity: 0, scale: 1, y: -20 }}
          y={0}
          opacity={1}
          scale={1}
          duration={9999999999}
          animation="100ms"
        >
          <YStack>
            <Toast.Title>Preview Mode</Toast.Title>
            <Toast.Description>This page is in preview/development mode. This may affect your user experience and negatively impact the performance.</Toast.Description>
          </YStack>
        </Toast>}
      </Provider>
    </NextThemeProvider>
  )
}

export default getApp

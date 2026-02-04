import { getBrokerUrl } from "../lib/Broker"
import Connector from "../lib/mqtt/Connector"
import { useSession } from "../lib/useSession"

export const MqttWrapper = ({ children }: { children: React.ReactNode }) => {
  const [session] = useSession()
  const brokerUrl = getBrokerUrl()

  // Don't connect to MQTT until user is authenticated (has a valid token)
  // This prevents anonymous connection attempts when auth is enabled
  if (!session?.token) {
    return <>{children}</>
  }

  return (
    <Connector brokerUrl={brokerUrl} options={{ username: session?.user?.id, password: session?.token }}>
      {children}
    </Connector>
  )
}
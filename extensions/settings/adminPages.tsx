import { SettingModel } from '.'
import { DataView } from 'protolib/components/DataView'
import { AdminPage } from 'protolib/components/AdminPage'
import { usePrompt } from 'protolib/context/PromptAtom'
import { DataTable2 } from 'protolib/components/DataTable2'
import { useState, useEffect, useMemo } from 'react'
import {
  XStack,
  YStack,
  Text,
  ScrollView,
  Spinner,
  Button,
  Popover,
  Label,
  Input
} from '@my/ui'
import { Icon } from 'protolib/components/board/ActionCard'
import { Tinted } from 'protolib/components/Tinted'
import { API } from 'protobase'
import { useSession } from 'protolib/lib/useSession'
import { useToastController } from '@my/ui'
import { Check, Bot, Palette, Code, Shield, Sparkles, Globe, Cpu, Wifi, Plus, Pencil, Trash2, MoreVertical, X, ChevronRight, Key } from '@tamagui/lucide-icons'
import { useSettings } from './hooks'
import { FormInput } from 'protolib/components/FormInput'
import { Setting, SettingsGroup } from 'protolib/components/SettingsComponents'
import { sendToPageBus } from 'protolib/lib/PageBus'
import { useHasPermission } from 'protolib/lib/usePermission'

const sourceUrl = '/api/core/v1/settings'

// ============================================================================
// SETTINGS DEFINITIONS
// ============================================================================

type SettingType = 'boolean' | 'select' | 'text' | 'secret'

interface SettingDefinition {
  key: string
  label: string
  description: string
  type: SettingType
  category: 'ai' | 'appearance' | 'developer' | 'privacy'
  options?: { value: string; label: string }[]
  defaultValue?: string
  icon?: any
  dependsOn?: { key: string; value: string | string[] }
  isKey?: boolean // If true, stored in /api/core/v1/keys instead of settings
}

const SETTINGS_DEFINITIONS: SettingDefinition[] = [
  {
    key: 'ai.enabled',
    label: 'Enable AI Features',
    description: 'Show AI chat panel and enable AI-powered features throughout the interface',
    type: 'boolean',
    category: 'ai',
    defaultValue: 'true',
    icon: Sparkles
  },
  {
    key: 'ai.provider',
    label: 'AI Provider',
    description: 'Select which AI service to use for chat and AI features',
    type: 'select',
    category: 'ai',
    options: [
      { value: 'chatgpt', label: 'ChatGPT (OpenAI)' },
      { value: 'llama', label: 'Local AI (LLaMA)' },
      { value: 'lmstudio', label: 'LM Studio' },
      { value: 'skip', label: 'Disabled' }
    ],
    defaultValue: 'chatgpt',
    icon: Bot
  },
  {
    key: 'OPENAI_API_KEY',
    label: 'OpenAI API Key',
    description: 'Your OpenAI API key for ChatGPT access',
    type: 'secret',
    category: 'ai',
    defaultValue: '',
    icon: Key,
    dependsOn: { key: 'ai.provider', value: 'chatgpt' },
    isKey: true
  },
  {
    key: 'ai.lmstudiohost',
    label: 'LM Studio Host',
    description: 'LM Studio server address (e.g., http://localhost:1234)',
    type: 'text',
    category: 'ai',
    defaultValue: 'http://localhost:1234',
    icon: Cpu,
    dependsOn: { key: 'ai.provider', value: 'lmstudio' }
  },
  {
    key: 'theme.accent',
    label: 'Accent Color',
    description: 'Primary accent color used throughout the interface',
    type: 'select',
    category: 'appearance',
    options: [
      { value: 'green', label: 'Green' },
      { value: 'blue', label: 'Blue' },
      { value: 'purple', label: 'Purple' },
      { value: 'pink', label: 'Pink' },
      { value: 'red', label: 'Red' },
      { value: 'orange', label: 'Orange' },
      { value: 'yellow', label: 'Yellow' }
    ],
    defaultValue: 'green',
    icon: Palette
  },
  {
    key: 'code.visible',
    label: 'Show Code Editor',
    description: 'Display code editing panels in the interface',
    type: 'boolean',
    category: 'developer',
    defaultValue: 'true',
    icon: Code
  },
  {
    key: 'cloud.telemetry',
    label: 'Anonymous Telemetry',
    description: 'Send anonymous usage data to help improve Vento',
    type: 'boolean',
    category: 'privacy',
    defaultValue: 'true',
    icon: Globe
  }
]

const CATEGORIES = {
  ai: { label: 'AI & Chat', icon: Bot, description: 'Configure AI providers and chat' },
  appearance: { label: 'Appearance', icon: Palette, description: 'Customize look and feel' },
  developer: { label: 'Developer', icon: Code, description: 'Power user settings' },
  privacy: { label: 'Privacy', icon: Shield, description: 'Data and privacy preferences' }
}

// ============================================================================
// SETTING COMPONENTS
// ============================================================================

const SettingSecret = ({ value, onChange, placeholder }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) => {
  const [editing, setEditing] = useState(false)
  const [tempValue, setTempValue] = useState(value || '')
  const hasValue = value && value.length > 0

  useEffect(() => {
    if (!editing) {
      setTempValue(value || '')
    }
  }, [value, editing])

  if (editing) {
    return (
      <XStack gap="$2" alignItems="center">
        <FormInput
          minWidth={280}
          size="$3"
          placeholder={placeholder || "Enter key..."}
          secureTextEntry
          value={tempValue}
          onChangeText={setTempValue}
          backgroundColor="$bgContent"
          borderColor="$gray6"
        />
        <Button size="$2" chromeless onPress={() => { setEditing(false); setTempValue(value || '') }}>
          <X size={14} />
        </Button>
        <Tinted>
          <Button size="$2" backgroundColor="$color7" color="white" onPress={() => { onChange(tempValue); setEditing(false) }}>
            <Check size={14} />
          </Button>
        </Tinted>
      </XStack>
    )
  }

  return (
    <XStack gap="$2" alignItems="center" minWidth={280} justifyContent="flex-end">
      <Text fontSize="$3" color={hasValue ? '$color11' : '$color9'} fontFamily="$mono">
        {hasValue ? '••••••••••••' : '(not set)'}
      </Text>
      <Button size="$2" chromeless onPress={() => { setTempValue(value || ''); setEditing(true) }}>
        <Pencil size={14} color="$color10" />
      </Button>
    </XStack>
  )
}

const SettingText = ({ value, onChange, placeholder }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) => {
  const [editing, setEditing] = useState(false)
  const [tempValue, setTempValue] = useState(value || '')
  const hasValue = value && value.length > 0

  useEffect(() => {
    if (!editing) {
      setTempValue(value || '')
    }
  }, [value, editing])

  if (editing) {
    return (
      <XStack gap="$2" alignItems="center">
        <Input
          minWidth={280}
          backgroundColor="$bgContent"
          borderColor="$gray6"
          borderWidth={1}
          placeholderTextColor="$gray9"
          borderRadius={8}
          placeholder={placeholder || "Enter value..."}
          value={tempValue}
          onChangeText={setTempValue}
        />
        <Button size="$2" chromeless onPress={() => { setEditing(false); setTempValue(value || '') }}>
          <X size={14} />
        </Button>
        <Tinted>
          <Button size="$2" backgroundColor="$color7" color="white" onPress={() => { onChange(tempValue); setEditing(false) }}>
            <Check size={14} />
          </Button>
        </Tinted>
      </XStack>
    )
  }

  return (
    <XStack gap="$2" alignItems="center" minWidth={280} justifyContent="flex-end">
      <Text fontSize="$3" color={hasValue ? '$color11' : '$color9'} fontFamily="$mono">
        {hasValue ? value : (placeholder || '(not set)')}
      </Text>
      <Button size="$2" chromeless onPress={() => { setTempValue(value || ''); setEditing(true) }}>
        <Pencil size={14} color="$color10" />
      </Button>
    </XStack>
  )
}

// Setting item component that renders the appropriate control based on type
const SettingItem = ({ setting, value, onChange, loading, isLast = false }: {
  setting: SettingDefinition
  value: any
  onChange: (key: string, value: any, isKey?: boolean) => void
  loading?: boolean
  isLast?: boolean
}) => {
  const parsedValue = useMemo(() => {
    if (setting.type === 'boolean') return value === true || value === 'true'
    return value ?? setting.defaultValue ?? ''
  }, [value, setting])

  const handleChange = (newValue: any) => {
    if (setting.type === 'boolean') {
      onChange(setting.key, newValue ? 'true' : 'false', setting.isKey)
    } else {
      onChange(setting.key, newValue, setting.isKey)
    }
  }

  if (loading) {
    return (
      <Setting
        label={setting.label}
        description={setting.description}
        noDivider={isLast}
        control={<Spinner size="small" color="$color7" />}
      />
    )
  }

  // Use Setting component for boolean and select
  if (setting.type === 'boolean') {
    return (
      <Setting
        type="toggle"
        label={setting.label}
        description={setting.description}
        value={parsedValue}
        onChange={handleChange}
        noDivider={isLast}
      />
    )
  }

  if (setting.type === 'select') {
    return (
      <Setting
        type="select"
        label={setting.label}
        description={setting.description}
        value={parsedValue}
        onChange={handleChange}
        options={setting.options?.map(opt => ({ value: opt.value, label: opt.label })) || []}
        noDivider={isLast}
      />
    )
  }

  // Text and secret use custom inline editing components
  if (setting.type === 'text') {
    return (
      <Setting
        label={setting.label}
        description={setting.description}
        noDivider={isLast}
        control={<SettingText value={parsedValue} onChange={handleChange} placeholder={setting.defaultValue} />}
      />
    )
  }

  if (setting.type === 'secret') {
    return (
      <Setting
        label={setting.label}
        description={setting.description}
        noDivider={isLast}
        control={<SettingSecret value={parsedValue} onChange={handleChange} placeholder="sk-..." />}
      />
    )
  }

  return null
}

// Category section that groups settings
const SettingsCategorySection = ({ category, settings, allValues, onChange, loadingKeys }: {
  category: keyof typeof CATEGORIES
  settings: SettingDefinition[]
  allValues: Record<string, any>
  onChange: (key: string, value: any, isKey?: boolean) => void
  loadingKeys: Set<string>
}) => {
  const cat = CATEGORIES[category]

  const visibleSettings = settings.filter(setting => {
    if (!setting.dependsOn) return true
    const depValue = allValues[setting.dependsOn.key]
    if (Array.isArray(setting.dependsOn.value)) return setting.dependsOn.value.includes(depValue)
    return depValue === setting.dependsOn.value
  })

  if (visibleSettings.length === 0) return null

  return (
    <Tinted>
      <SettingsGroup title={cat.label}>
        {visibleSettings.map((setting, index) => (
          <SettingItem
            key={setting.key}
            setting={setting}
            value={allValues[setting.key]}
            onChange={onChange}
            loading={loadingKeys.has(setting.key)}
            isLast={index === visibleSettings.length - 1}
          />
        ))}
      </SettingsGroup>
    </Tinted>
  )
}

// ============================================================================
// WIFI NETWORKS SECTION
// ============================================================================

const WIFI_PREFIX = 'wifi.'

type WifiNetwork = { key: string; ssid: string; password: string }

const parseWifiSetting = (key: string, value: any): WifiNetwork | null => {
  if (!key.startsWith(WIFI_PREFIX)) return null
  let ssid = key.slice(WIFI_PREFIX.length)
  let password = ''
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      ssid = parsed?.ssid ?? ssid
      password = parsed?.password ?? ''
    } catch { password = value }
  } else if (value && typeof value === 'object') {
    ssid = value?.ssid ?? ssid
    password = value?.password ?? ''
  }
  return { key, ssid, password }
}

const slugify = (text: string) => text.toLowerCase().trim().replace(/[^a-z0-9_-]+/g, '-')

const WifiNetworksSection = ({ allSettings, token, onSettingsChange }: {
  allSettings: Record<string, any>
  token: string
  onSettingsChange: () => void
}) => {
  const toast = useToastController()
  const canUpdateSettings = useHasPermission('settings.update')
  const [networks, setNetworks] = useState<WifiNetwork[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [form, setForm] = useState({ ssid: '', password: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  useEffect(() => {
    const wifiNetworks: WifiNetwork[] = []
    for (const [key, value] of Object.entries(allSettings)) {
      const network = parseWifiSetting(key, value)
      if (network) wifiNetworks.push(network)
    }
    setNetworks(wifiNetworks.sort((a, b) => a.ssid.localeCompare(b.ssid)))
  }, [allSettings])

  const handleSave = async () => {
    setError('')
    if (!form.ssid.trim() || !form.password.trim()) {
      setError('SSID and password are required')
      return
    }
    setSaving(true)
    const keyName = editingKey || `${WIFI_PREFIX}${slugify(form.ssid)}`
    try {
      let res = await API.post(`/api/core/v1/settings/${keyName}?token=${token}`, {
        name: keyName, value: { ssid: form.ssid.trim(), password: form.password }
      })
      if (res.isError && !res.data) {
        res = await API.post(`/api/core/v1/settings?token=${token}`, {
          name: keyName, value: { ssid: form.ssid.trim(), password: form.password }
        })
      }
      if (!res.isError) {
        toast.show('Wi-Fi saved', { duration: 1500 })
        setShowForm(false)
        setEditingKey(null)
        setForm({ ssid: '', password: '' })
        onSettingsChange()
      }
    } catch { toast.show('Error saving', { native: true }) }
    finally { setSaving(false) }
  }

  const handleDelete = async (key: string) => {
    setSaving(true)
    try {
      await API.get(`/api/core/v1/settings/${encodeURIComponent(key)}/delete?token=${token}`)
      toast.show('Deleted', { duration: 1500 })
      setOpenMenu(null)
      onSettingsChange()
    } catch { toast.show('Error', { native: true }) }
    finally { setSaving(false) }
  }

  return (
    <Tinted>
      <YStack>
        <XStack ai="center" justifyContent="space-between" ml="$3" mr="$1" h="$3.5">
          <Label color="$text" size="$6" fontWeight={500}>
            Wi-Fi Networks
          </Label>
          {canUpdateSettings && (
            <Button bc="$bgPanel" size="$2" icon={Plus} onPress={() => { setEditingKey(null); setForm({ ssid: '', password: '' }); setShowForm(true); setError('') }}>
              Add
            </Button>
          )}
        </XStack>
        <YStack borderRadius="$3" p="$4" backgroundColor="$bgPanel" gap="$3">
          {networks.length === 0 && !showForm && (
            <XStack ai="center" gap="$3">
              <Wifi size={20} color="$gray9" />
              <Label color="$gray10" fontSize="$4">
                No networks saved. Add one to speed up device provisioning.
              </Label>
            </XStack>
          )}

          {networks.map((network, index) => (
            <>
              <XStack key={network.key} ai="center" justifyContent="space-between" gap="$5">
                <YStack gap="0px" flex={1}>
                  <Label color="$text" fontSize="$5" lineHeight="fit-content">
                    {network.ssid}
                  </Label>
                  <Label fontSize="$4" color="$gray10" lineHeight="fit-content">
                    {'•'.repeat(Math.min(network.password.length, 12))}
                  </Label>
                </YStack>
                {canUpdateSettings && (
                  <Popover allowFlip placement="bottom-end" open={openMenu === network.key} onOpenChange={(open) => setOpenMenu(open ? network.key : null)}>
                    <Popover.Trigger>
                      <Button size="$3" circular chromeless icon={<MoreVertical size={18} />} />
                    </Popover.Trigger>
                    <Popover.Content padding="$2" borderRadius="$4" borderWidth={1} borderColor="$gray2" backgroundColor="$bgContent" elevate>
                      <YStack gap="$1">
                        <Button size="$3" chromeless icon={<Pencil size={14} />} justifyContent="flex-start"
                          onPress={() => { setEditingKey(network.key); setForm({ ssid: network.ssid, password: network.password }); setShowForm(true); setOpenMenu(null); setError('') }}>
                          Edit
                        </Button>
                        <Button theme='red' size="$3" chromeless icon={<Trash2 size={14} color="$red10" />} justifyContent="flex-start"
                          onPress={() => handleDelete(network.key)} disabled={saving}>
                          Delete
                        </Button>
                      </YStack>
                    </Popover.Content>
                  </Popover>
                )}
              </XStack>
              {index < networks.length - 1 && !showForm && (
                <YStack width="100%" height={2} backgroundColor="$bgContent" opacity={0.7} />
              )}
            </>
          ))}

          {showForm && (
            <>
              {networks.length > 0 && <YStack width="100%" height={2} backgroundColor="$bgContent" opacity={0.7} />}
              <YStack gap="$1">
                <XStack alignItems="center" justifyContent="space-between">
                  <Label color="$text" fontSize="$5" fontWeight="600">
                    {editingKey ? 'Edit Network' : 'Add Network'}
                  </Label>
                  <Button size="$2" circular chromeless icon={<X size={16} />} onPress={() => setShowForm(false)} />
                </XStack>
                <YStack>
                  <Label fontSize="$4" color="$gray10">SSID</Label>
                  <Input
                    minWidth={280}
                    backgroundColor="$bgContent"
                    borderColor="$gray6"
                    borderWidth={1}
                    placeholderTextColor="$gray9"
                    borderRadius={8}
                    placeholder="Network name"
                    value={form.ssid}
                    onChangeText={(t) => setForm({ ...form, ssid: t })}
                  />
                </YStack>
                <YStack>
                  <Label fontSize="$4" color="$gray10">Password</Label>
                  <FormInput
                    minWidth={280}
                    placeholder="Password"
                    secureTextEntry
                    value={form.password}
                    onChangeText={(t) => setForm({ ...form, password: t })}
                    backgroundColor="$bgContent"
                    borderColor="$gray6"
                    borderWidth={1}
                    borderRadius={8}
                  />
                </YStack>
                {error && <Text fontSize="$2" color="$red10">{error}</Text>}
                <XStack gap="$3" justifyContent="flex-end" mt="$4">
                  <Button theme="red" chromeless onPress={() => setShowForm(false)}>Cancel</Button>
                  <Button backgroundColor="$color7" color="white" onPress={handleSave} disabled={saving}>
                    {saving ? <Spinner size="small" color="white" /> : (editingKey ? 'Update' : 'Save')}
                  </Button>
                </XStack>
              </YStack>
            </>
          )}
        </YStack>
      </YStack>
    </Tinted>
  )
}

// ============================================================================
// MAIN SETTINGS PAGE
// ============================================================================

const SettingsPage = ({ pageSession }: any) => {
  const [session] = useSession()
  const [settings, setSettingsState] = useSettings()
  const [keys, setKeys] = useState<Record<string, string>>({})
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const toast = useToastController()

  useEffect(() => {
    const load = async () => {
      const token = (session as any)?.token
      if (!token) return
      try {
        // Load settings
        const settingsResult = await API.get(`/api/core/v1/settings/all?token=${token}`)
        if (!settingsResult.isError && settingsResult.data) setSettingsState(settingsResult.data)

        // Load keys (for API keys)
        const keysResult = await API.get(`/api/core/v1/keys?all=1&token=${token}`)
        if (!keysResult.isError && keysResult.data?.items) {
          const keysMap: Record<string, string> = {}
          for (const item of keysResult.data.items) {
            keysMap[item.name] = item.value || ''
          }
          setKeys(keysMap)
        }
      } catch (err) { console.error(err) }
      finally { setIsLoading(false) }
    }
    load()
  }, [session])

  const handleSettingChange = async (key: string, value: any, isKey?: boolean) => {
    const token = (session as any)?.token
    if (!token) return

    if (isKey) {
      // Handle API key storage
      setKeys(prev => ({ ...prev, [key]: value }))
      setLoadingKeys(prev => new Set(Array.from(prev).concat(key)))
      try {
        let result = await API.post(`/api/core/v1/keys/${key}?token=${token}`, { name: key, value })
        if (result.isError) await API.post(`/api/core/v1/keys?token=${token}`, { name: key, value })
        toast.show('Key saved', { duration: 1000 })
      } catch (err) {
        toast.show('Error saving key', { native: true })
      } finally {
        setLoadingKeys(prev => { const next = new Set(prev); next.delete(key); return next })
      }
    } else {
      // Handle regular settings
      setSettingsState(prev => ({ ...prev, [key]: value }))
      setLoadingKeys(prev => new Set(Array.from(prev).concat(key)))
      try {
        let result = await API.post(`/api/core/v1/settings/${key}?token=${token}`, { name: key, value })
        if (result.isError) await API.post(`/api/core/v1/settings?token=${token}`, { name: key, value })
        toast.show('Saved', { duration: 1000 })
      } catch (err) {
        toast.show('Error', { native: true })
        const result = await API.get(`/api/core/v1/settings/all?token=${token}`)
        if (!result.isError && result.data) setSettingsState(result.data)
      } finally {
        setLoadingKeys(prev => { const next = new Set(prev); next.delete(key); return next })
      }
    }
  }

  // Merge settings and keys for display
  const allValues = useMemo(() => ({ ...settings, ...keys }), [settings, keys])

  const settingsByCategory = useMemo(() => {
    const grouped: Record<string, SettingDefinition[]> = {}
    for (const s of SETTINGS_DEFINITIONS) {
      if (!grouped[s.category]) grouped[s.category] = []
      grouped[s.category].push(s)
    }
    return grouped
  }, [])

  return (
    <AdminPage title="Settings" pageSession={pageSession}>
      <ScrollView flex={1}>
        <YStack flex={1} padding="$5" paddingTop="$4" maxWidth={1000} width="100%" alignSelf="center">

          {isLoading ? (
            <YStack flex={1} alignItems="center" justifyContent="center" padding="$8">
              <Spinner size="large" color="$color7" />
            </YStack>
          ) : (
            <YStack gap="$4">
              {Object.keys(CATEGORIES).map(category => (
                <SettingsCategorySection
                  key={category}
                  category={category as keyof typeof CATEGORIES}
                  settings={settingsByCategory[category] || []}
                  allValues={allValues}
                  onChange={handleSettingChange}
                  loadingKeys={loadingKeys}
                />
              ))}

              <WifiNetworksSection
                allSettings={settings}
                token={(session as any)?.token || ''}
                onSettingsChange={async () => {
                  const result = await API.get(`/api/core/v1/settings/all?token=${(session as any)?.token}`)
                  if (!result.isError && result.data) setSettingsState(result.data)
                }}
              />

              <Tinted>
                <SettingsGroup title="Advanced">
                  <Setting
                    label="Raw Settings"
                    description="View and edit all settings in raw format"
                    control={<ChevronRight size={20} color="$gray9" />}
                    onPress={() => window.location.href = '/workspace/settings/raw'}
                  />
                </SettingsGroup>
              </Tinted>
            </YStack>
          )}
        </YStack>
      </ScrollView>
    </AdminPage>
  )
}

// ============================================================================
// RAW SETTINGS PAGE
// ============================================================================

const RawSettingsPage = ({ initialItems, pageSession }: any) => {
  usePrompt(() => initialItems?.isLoaded ? 'Settings: ' + JSON.stringify(initialItems.data) : '')
  return (
    <AdminPage title="Raw Settings" pageSession={pageSession}>
      <DataView
        enableAddToInitialData
        disableViews={["grid"]}
        defaultView={'list'}
        sourceUrl={sourceUrl}
        initialItems={initialItems}
        numColumnsForm={1}
        name="settings"
        model={SettingModel}
        columns={DataTable2.columns(
          DataTable2.column("name", row => row.name, "name", undefined, true, '400px'),
          DataTable2.column("value", row => typeof row.value === "string" ? row.value : JSON.stringify(row.value), "value", undefined, true),
        )}
      />
    </AdminPage>
  )
}

// ============================================================================
// CONFIG PANELS PAGE
// ============================================================================

const configPanels = [
  { name: 'Assets', href: '/workspace/assets', icon: "blocks", description: "Manage system assets", permission: 'assets.read' },
  { name: 'Tasks', href: '/workspace/tasks', icon: "zap", description: "Manage automated tasks", permission: 'automations.read' },
  { name: 'Devices', href: '/workspace/devices', icon: "router", description: "Manage connected devices", permission: 'devices.read' },
  { name: 'Storages', href: '/workspace/objects', icon: "boxes", description: "Manage data storages", permission: 'objects.read' },
  { name: 'Files', href: '/workspace/files?path=/', icon: "folder", description: "Manage system files", permission: 'files.read' },
  { name: 'Users', href: '/workspace/users', icon: "users", description: "Manage system users", permission: 'users.read' },
  { name: 'Keys', href: '/workspace/keys', icon: "key", description: "Manage system keys", permission: 'keys.read' },
  { name: 'Events', href: '/workspace/events', icon: "activity", description: "View system events", permission: 'events.read' },
  { name: 'Databases', href: '/workspace/databases', icon: "database", description: "Manage databases", permission: 'databases.read' },
  { name: 'Settings', href: '/workspace/settings', icon: "cog", description: "Configure system settings", permission: 'settings.read' },
  { name: 'Themes', href: '/workspace/themes', icon: "palette", description: "Change or customize themes", permission: 'themes.read' }
]

const openAsTab = (name: string, url: string) => {
  if (window.parent !== window) {
    sendToPageBus({ type: 'open-tab', name, url, tabType: 'settings' })
  } else {
    window.location.href = url
  }
}

// ============================================================================
// CONFIG PAGE WITH PERMISSION FILTERING
// ============================================================================

const ConfigPanelItem = ({ panel }: { panel: typeof configPanels[0] }) => {
  const hasPermission = useHasPermission(panel.permission)

  if (!hasPermission) return null

  return (
    <XStack
      ai="center"
      br="$6"
      width={500}
      padding="$4"
      backgroundColor="var(--bgPanel)"
      gap="$4"
      cursor="pointer"
      hoverStyle={{ opacity: 0.9 }}
      onPress={() => openAsTab(panel.name, panel.href)}
    >
      <Icon color="var(--color)" name={panel.icon} size={34} style={{ opacity: 0.8 }} />
      <YStack>
        <Text fontSize="$6" fontWeight="500">{panel.name}</Text>
        <Text fontSize="$6" color="$color9">{panel.description}</Text>
      </YStack>
    </XStack>
  )
}

const ConfigPage = ({ pageSession }: any) => (
  <AdminPage title="Config" pageSession={pageSession}>
    <XStack f={1} m="$6" marginTop="$8" flexWrap="wrap" gap="$4" rowGap="$4" justifyContent="flex-start" alignItems="flex-start" alignContent="flex-start">
      <Text paddingLeft="$4" width="100%" fontSize="$9" fontWeight="600" color="$color11">Config Panels</Text>
      {configPanels.map((panel, index) => (
        <ConfigPanelItem key={index} panel={panel} />
      ))}
    </XStack>
  </AdminPage>
)

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  'settings': { component: SettingsPage },
  'settings/raw': { component: RawSettingsPage },
  'config': { component: ConfigPage }
}

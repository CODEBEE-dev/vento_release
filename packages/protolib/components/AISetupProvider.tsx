import { useState, useEffect, ReactNode, useMemo } from 'react'
import { AISetupWizard } from './AISetupWizard'
import { useSettings, settingsAtom } from '@extensions/settings/hooks'
import { API, matchesPermission } from 'protobase'
import { atom, useAtom } from 'jotai'
import { useSession } from '../lib/useSession'
import { OnboardingProvider, OnboardingTrigger } from '@extensions/onboarding'

// Global atom to control AI setup wizard visibility
export const showAISetupWizardAtom = atom(false)

// Hook to open the AI setup wizard from anywhere
export const useOpenAISetupWizard = () => {
    const [, setShowWizard] = useAtom(showAISetupWizardAtom)
    return () => setShowWizard(true)
}

type AISetupProviderProps = {
    children: ReactNode
}

export const AISetupProvider = ({ children }: AISetupProviderProps) => {
    const [settings, setSettings] = useAtom(settingsAtom)
    const [showWizardGlobal, setShowWizardGlobal] = useAtom(showAISetupWizardAtom)
    const [showWizardLocal, setShowWizardLocal] = useState(false)
    const [checked, setChecked] = useState(false)
    const [session] = useSession()

    // Check if user has permission to update settings (required to configure AI)
    const canConfigureAI = useMemo(() => {
        if (!session?.loggedIn) return false
        const permissions = (session as any)?.user?.permissions || []
        // Admin flag grants all permissions
        if ((session as any)?.user?.admin === true) return true
        // Check for settings.update permission
        return permissions.some((perm: string) =>
            matchesPermission(perm, 'settings.update')
        )
    }, [session])

    // Combine local and global wizard state
    const showWizard = showWizardLocal || showWizardGlobal
    const setShowWizard = (value: boolean) => {
        setShowWizardLocal(value)
        setShowWizardGlobal(value)
    }

    useEffect(() => {
        // Esperar a tener sesión antes de cargar settings
        const token = (session as any)?.token
        if (!token) {
            console.log('AISetupProvider: No token yet, waiting...')
            return
        }

        // If user doesn't have permission to configure AI, skip the check entirely
        if (!canConfigureAI) {
            console.log('AISetupProvider: User lacks settings.update permission, skipping wizard')
            setChecked(true)
            return
        }

        // Cargar settings al montar
        const loadSettings = async () => {
            console.log('AISetupProvider: Loading settings with token')
            try {
                const result = await API.get(`/api/core/v1/settings/all?token=${token}`)
                console.log('AISetupProvider: Settings API result:', result)

                if (result.isError) {
                    console.error('AISetupProvider: Error loading settings:', result.error)
                    // Don't show wizard on error - user might not have permission
                } else {
                    const data = result.data || {}
                    console.log('AISetupProvider: Settings data:', data)
                    setSettings(data)

                    // Verificar si existe la configuración de IA
                    const aiProvider = data['ai.provider']
                    console.log('AISetupProvider: ai.provider value:', aiProvider, 'type:', typeof aiProvider)

                    if (!aiProvider) {
                        console.log('AISetupProvider: No ai.provider found, showing wizard')
                        setShowWizard(true)
                    } else {
                        console.log('AISetupProvider: ai.provider found, NOT showing wizard')
                    }
                }
            } catch (error) {
                console.error('AISetupProvider: Exception loading settings:', error)
                // Don't show wizard on error
            }
            setChecked(true)
        }

        loadSettings()
    }, [(session as any)?.token, canConfigureAI])

    const handleComplete = (provider: string) => {
        // Update the settings atom with the new provider
        setSettings((prev) => ({
            ...prev,
            'ai.provider': provider
        }))
        setShowWizard(false)
    }

    const handleSkip = async () => {
        // Skip - save 'skip' as provider so the wizard doesn't show again
        // but the action knows that no AI is configured
        const token = (session as any)?.token
        if (token) {
            try {
                await API.post(`/api/core/v1/settings?token=${token}`, {
                    name: 'ai.provider',
                    value: 'skip'
                })
                console.log('AISetupProvider: User skipped wizard, saved ai.provider=skip')
            } catch (e) {
                console.error('AISetupProvider: Error saving skip:', e)
            }
        }
        setSettings((prev) => ({
            ...prev,
            'ai.provider': 'skip'
        }))
        setShowWizard(false)
    }

    // Don't render anything until we have verified
    if (!checked) {
        return <>{children}</>
    }

    return (
        <>
            {children}
            <AISetupWizard
                open={showWizard}
                onComplete={handleComplete}
                onSkip={handleSkip}
            />
        </>
    )
}

export default AISetupProvider

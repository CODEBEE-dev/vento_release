import { useEffect } from 'react'
import {useSession} from './useSession'

/**
 * Hook that requires user to be logged in (any authenticated user).
 * Redirects to login if not authenticated.
 *
 * Note: This was previously named useIsAdmin but now checks for any logged-in user.
 * For actual admin checks, use useIsAdminPermission from usePermission.tsx
 */
export function useIsAdmin(getFallbackUrl=() =>{}) {
    const [session] = useSession()

    useEffect(() => {
        if (typeof document === 'undefined') return

        // Check if session cookie exists
        const hasCookie = document.cookie.split(';').some(c => c.trim().startsWith('session='))

        // If cookie exists but session not hydrated yet, wait for next render
        if (hasCookie && !session?.loggedIn) {
            return
        }

        // Require any logged-in user (not just admin)
        if(!session?.loggedIn) {
            const fallbackUrl = getFallbackUrl()
            //@ts-ignore
            window.location.href = fallbackUrl ?? '/workspace'
        }
    }, [session])
}
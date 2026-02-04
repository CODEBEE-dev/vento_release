import { useEffect, useMemo } from 'react'
import { useSession } from './useSession'
import { checkPermission, checkPermissions, checkAnyPermission, isAdmin as checkIsAdmin, matchesPermission } from 'protobase'

/**
 * Hook to check if the current user has a specific permission.
 * @param permission - The permission to check (e.g., 'boards.read', 'users.*')
 * @returns boolean indicating if user has the permission
 */
export function useHasPermission(permission: string): boolean {
    const [session] = useSession()

    return useMemo(() => {
        if (!session?.loggedIn || !session?.user?.permissions) return false
        return session.user.permissions.some((p: string) => matchesPermission(p, permission))
    }, [session?.user?.permissions, permission])
}

/**
 * Hook to check if the current user has ALL of the specified permissions.
 * @param permissions - Array of permissions to check
 * @returns boolean indicating if user has all permissions
 */
export function useHasPermissions(permissions: string[]): boolean {
    const [session] = useSession()

    return useMemo(() => {
        if (!session?.loggedIn || !session?.user?.permissions) return false
        return permissions.every(perm =>
            session.user.permissions.some((p: string) => matchesPermission(p, perm))
        )
    }, [session?.user?.permissions, permissions])
}

/**
 * Hook to check if the current user has ANY of the specified permissions.
 * @param permissions - Array of permissions to check
 * @returns boolean indicating if user has any of the permissions
 */
export function useHasAnyPermission(permissions: string[]): boolean {
    const [session] = useSession()

    return useMemo(() => {
        if (!session?.loggedIn || !session?.user?.permissions) return false
        return permissions.some(perm =>
            session.user.permissions.some((p: string) => matchesPermission(p, perm))
        )
    }, [session?.user?.permissions, permissions])
}

/**
 * Hook to check if the current user is an admin (has '*' permission or admin flag).
 * @returns boolean indicating if user is admin
 */
export function useIsAdminPermission(): boolean {
    const [session] = useSession()

    return useMemo(() => {
        if (!session?.loggedIn) return false
        return session.user?.admin === true ||
            (session.user?.permissions?.includes('*') ?? false)
    }, [session?.user?.admin, session?.user?.permissions])
}

/**
 * Hook that redirects if user doesn't have the required permission.
 * @param permission - The required permission
 * @param getFallbackUrl - Function returning the URL to redirect to
 */
export function useRequirePermission(permission: string, getFallbackUrl = () => '/workspace') {
    const [session] = useSession()
    const hasPermission = useHasPermission(permission)

    useEffect(() => {
        if (typeof document === 'undefined') return

        // Check if session cookie exists
        const hasCookie = document.cookie.split(';').some(c => c.trim().startsWith('session='))

        // If cookie exists but session not hydrated yet, wait for next render
        if (hasCookie && !session?.loggedIn) {
            return
        }

        // Now safe to check - either no cookie or session is hydrated
        if (!hasPermission) {
            const fallbackUrl = getFallbackUrl()
            //@ts-ignore
            window.location.href = fallbackUrl ?? '/workspace'
        }
    }, [session, hasPermission])
}

/**
 * Hook that redirects if user doesn't have ANY of the required permissions.
 * @param permissions - Array of permissions (user needs at least one)
 * @param getFallbackUrl - Function returning the URL to redirect to
 */
export function useRequireAnyPermission(permissions: string[], getFallbackUrl = () => '/workspace') {
    const [session] = useSession()
    const hasAnyPermission = useHasAnyPermission(permissions)

    useEffect(() => {
        if (typeof document === 'undefined') return

        const hasCookie = document.cookie.split(';').some(c => c.trim().startsWith('session='))

        if (hasCookie && !session?.loggedIn) {
            return
        }

        if (!hasAnyPermission) {
            const fallbackUrl = getFallbackUrl()
            //@ts-ignore
            window.location.href = fallbackUrl ?? '/workspace'
        }
    }, [session, hasAnyPermission])
}

/**
 * Get all permissions for the current user.
 * @returns Array of permission strings
 */
export function usePermissions(): string[] {
    const [session] = useSession()
    return session?.user?.permissions ?? []
}

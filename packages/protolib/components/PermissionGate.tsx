import React from 'react'
import { useHasPermission, useHasAnyPermission, useHasPermissions } from '../lib/usePermission'

type PermissionGateProps = {
    /** Single permission required */
    permission?: string
    /** Multiple permissions - user must have ALL */
    permissions?: string[]
    /** Multiple permissions - user needs ANY ONE */
    anyOf?: string[]
    /** Content to render if user has permission */
    children: React.ReactNode
    /** Optional fallback content if user lacks permission */
    fallback?: React.ReactNode
}

/**
 * Conditionally render content based on user permissions.
 *
 * @example
 * // Single permission
 * <PermissionGate permission="boards.create">
 *   <CreateBoardButton />
 * </PermissionGate>
 *
 * @example
 * // All permissions required
 * <PermissionGate permissions={['users.read', 'users.update']}>
 *   <UserEditor />
 * </PermissionGate>
 *
 * @example
 * // Any of the permissions
 * <PermissionGate anyOf={['boards.*', 'cards.*']}>
 *   <EditorPanel />
 * </PermissionGate>
 *
 * @example
 * // With fallback
 * <PermissionGate permission="admin" fallback={<AccessDenied />}>
 *   <AdminPanel />
 * </PermissionGate>
 */
export function PermissionGate({
    permission,
    permissions,
    anyOf,
    children,
    fallback = null
}: PermissionGateProps) {
    // Single permission check
    const hasSinglePermission = useHasPermission(permission ?? '')
    // All permissions check
    const hasAllPermissions = useHasPermissions(permissions ?? [])
    // Any permission check
    const hasAnyPermission = useHasAnyPermission(anyOf ?? [])

    let hasAccess = false

    if (permission) {
        hasAccess = hasSinglePermission
    } else if (permissions && permissions.length > 0) {
        hasAccess = hasAllPermissions
    } else if (anyOf && anyOf.length > 0) {
        hasAccess = hasAnyPermission
    } else {
        // No permission specified, allow access
        hasAccess = true
    }

    if (hasAccess) {
        return <>{children}</>
    }

    return <>{fallback}</>
}

export default PermissionGate

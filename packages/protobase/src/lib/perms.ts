// ============================================
// Permission System for Vento
// ============================================

// Permission format: {resource}.{operation}
// Examples: boards.read, users.create, devices.*

// ============================================
// Type Definitions
// ============================================

export type userData = {
    id?: string,
    type?: string
    admin?: boolean,
    permissions?: string[],
    environments?: string[],
    network?: string
}

export type validatedUserData = userData & {
     iat: number,
     exp: number
}

export type SessionDataType = {
    user: userData,
    loggedIn: boolean,
    token?: string
}

// ============================================
// Permission Constants
// ============================================

export const PERMISSION_OPERATIONS = ['read', 'create', 'update', 'delete', 'execute', '*'] as const;
export type PermissionOperation = typeof PERMISSION_OPERATIONS[number];

export const PERMISSION_RESOURCES = {
    // Core
    boards: ['read', 'create', 'update', 'delete', 'execute'],
    cards: ['read', 'create', 'update', 'delete', 'execute'],

    // Devices
    devices: ['read', 'create', 'update', 'delete'],
    deviceDefinitions: ['read', 'create', 'update', 'delete'],
    deviceBoards: ['read', 'create', 'update', 'delete'],
    deviceCores: ['read', 'create', 'update', 'delete'],
    deviceSdks: ['read', 'create', 'update', 'delete'],
    enrollments: ['read', 'approve', 'reject'],

    // Data
    objects: ['read', 'create', 'update', 'delete'],
    databases: ['read', 'create', 'update', 'delete', 'backup'],

    // User Management
    users: ['read', 'create', 'update', 'delete'],
    groups: ['read', 'create', 'update', 'delete'],

    // Automation
    apis: ['read', 'create', 'update', 'delete'],
    chatbots: ['read', 'create', 'update', 'delete'],
    stateMachines: ['read', 'create', 'update', 'delete', 'execute'],
    automations: ['read', 'create', 'update', 'delete'],

    // AI
    llama: ['read', 'execute'],
    chatgpt: ['execute'],
    vision: ['execute'],
    autopilot: ['read', 'execute'],

    // Config
    settings: ['read', 'update'],
    keys: ['read', 'create', 'update', 'delete'],
    themes: ['read', 'create', 'update', 'delete'],

    // Files
    files: ['read', 'create', 'update', 'delete'],
    assets: ['read', 'install'],

    // Monitoring
    events: ['read'],
    messages: ['read'],
    services: ['read'],

    // System
    system: ['reload', 'backup', 'endpoints'],

    // Additional resources
    tokens: ['read', 'create', 'update', 'delete'],
    packages: ['read', 'create', 'update', 'delete'],
    workspaces: ['read'],

    // Missing resources (added for granular permissions)
    logs: ['read'],
    protomemdb: ['read', 'update'],
    flow: ['read', 'create', 'update', 'delete'],
    templates: ['read', 'execute'],
    esphome: ['read', 'update', 'execute'],
    resources: ['read', 'create', 'update', 'delete'],

    // Hardware integrations
    wled: ['read', 'execute'],
    arduino: ['read', 'create', 'update', 'delete', 'execute'],
    mobile: ['read', 'update'],

    // UI/System
    visualui: ['read', 'update'],
    sequences: ['read', 'create', 'update', 'delete'],
    icons: ['read'],
    network: ['read'],
    php: ['execute'],
} as const;

export type PermissionResource = keyof typeof PERMISSION_RESOURCES;

// ============================================
// Predefined Group Permissions
// ============================================

export const GROUP_PERMISSIONS = {
    // Full system access - use sparingly
    admin: ['*'],

    // Standard users - can create/edit boards, automations, use AI
    user: [
        // Core creation/editing
        'boards.*',
        'cards.*',
        'objects.*',
        'apis.*',
        'chatbots.*',
        'stateMachines.*',
        'automations.*',
        'themes.*',

        // Files - read, create, update (no delete for safety)
        'files.read',
        'files.create',
        'files.update',

        // Devices - read and update only
        'devices.read',
        'devices.update',

        // AI capabilities
        'llama.*',
        'chatgpt.*',
        'vision.*',
        'autopilot.*',

        // Hardware integrations
        'wled.*',
        'arduino.*',
        'esphome.*',
        'mobile.*',

        // UI/System tools
        'visualui.*',
        'sequences.*',
        'flow.*',
        'icons.read',
        'network.read',

        // Read-only on system resources
        'deviceDefinitions.read',
        'deviceBoards.read',
        'deviceCores.read',
        'deviceSdks.read',
        'databases.read',
        'users.read',
        'groups.read',
        'settings.read',
        'settings.update',  // Allow configuring AI and other settings
        'keys.read',
        'events.read',
        'messages.read',
        'services.read',
        'tokens.read',
        'packages.read',
        'workspaces.read',
        'logs.read',
        'assets.read',
        'protomemdb.read',
    ],

    // Read-only viewers - can view and execute boards/cards
    viewer: [
        'boards.read',
        'boards.execute',
        'cards.read',
        'cards.execute',
        'devices.read',
        'objects.read',
        'events.read',
        'messages.read',
        // Required for viewing boards (read-only access to states/actions)
        'protomemdb.read',
        'icons.read',
        'settings.read',
        'groups.read',  // Required for session context (reading own group info)
    ],
} as const;

export type GroupPreset = keyof typeof GROUP_PERMISSIONS;

// ============================================
// Auth Utilities
// ============================================

export const requireAuth = (session: SessionDataType) => {
    if (!session || !session.loggedIn) {
        throw "E_AUTH"
    }
}

// ============================================
// Permission Checking
// ============================================

/**
 * Check if a permission string matches a required permission.
 * Supports wildcards: 'boards.*' matches 'boards.read', 'boards.create', etc.
 * Global wildcard '*' matches everything.
 */
export function matchesPermission(userPermission: string, required: string): boolean {
    // Global wildcard matches everything
    if (userPermission === '*') return true;

    // Exact match
    if (userPermission === required) return true;

    // Resource wildcard (e.g., 'boards.*' matches 'boards.read')
    if (userPermission.endsWith('.*')) {
        const resource = userPermission.slice(0, -2);
        const [requiredResource] = required.split('.');
        if (resource === requiredResource) return true;
    }

    return false;
}

/**
 * Check if user has a specific permission.
 * Returns true/false without throwing.
 */
export function checkPermission(session: SessionDataType | null | undefined, permission: string): boolean {
    if (!session?.user) return false;

    // Admin flag grants all permissions (backward compatibility with legacy tokens)
    if (session.user.admin === true) return true;

    // No permissions array means no permissions
    if (!session.user.permissions) return false;

    // Check if any user permission matches the required permission
    return session.user.permissions.some(userPerm => matchesPermission(userPerm, permission));
}

/**
 * Check if user has ALL of the specified permissions.
 */
export function checkPermissions(session: SessionDataType | null | undefined, permissions: string[]): boolean {
    return permissions.every(perm => checkPermission(session, perm));
}

/**
 * Check if user has ANY of the specified permissions.
 */
export function checkAnyPermission(session: SessionDataType | null | undefined, permissions: string[]): boolean {
    return permissions.some(perm => checkPermission(session, perm));
}

/**
 * Legacy function - throws if permission not present.
 * Use checkPermission() for non-throwing version.
 */
export const hasPermission = (session: SessionDataType, permission: string) => {
    requireAuth(session)
    if (!checkPermission(session, permission)) {
        throw "E_PERM"
    }
}

/**
 * Check if user is admin (has '*' permission or admin flag).
 */
export function isAdmin(session: SessionDataType | null | undefined): boolean {
    if (!session?.user) return false;
    return session.user.admin === true || checkPermission(session, '*');
}

// ============================================
// Permission Expansion
// ============================================

/**
 * Expand permission wildcards to individual permissions.
 * E.g., 'boards.*' -> ['boards.read', 'boards.create', ...]
 */
export function expandPermissions(permissions: string[]): string[] {
    const expanded: Set<string> = new Set();

    for (const perm of permissions) {
        if (perm === '*') {
            // Global wildcard - add all permissions
            for (const [resource, operations] of Object.entries(PERMISSION_RESOURCES)) {
                for (const op of operations) {
                    expanded.add(`${resource}.${op}`);
                }
            }
        } else if (perm.endsWith('.*')) {
            // Resource wildcard - expand to all operations for that resource
            const resource = perm.slice(0, -2) as PermissionResource;
            const operations = PERMISSION_RESOURCES[resource];
            if (operations) {
                for (const op of operations) {
                    expanded.add(`${resource}.${op}`);
                }
            }
        } else {
            expanded.add(perm);
        }
    }

    return Array.from(expanded);
}

/**
 * Get all valid permission strings.
 */
export function getAllPermissions(): string[] {
    const all: string[] = ['*'];

    for (const [resource, operations] of Object.entries(PERMISSION_RESOURCES)) {
        all.push(`${resource}.*`);
        for (const op of operations) {
            all.push(`${resource}.${op}`);
        }
    }

    return all;
}

/**
 * Validate a permission string.
 */
export function isValidPermission(permission: string): boolean {
    if (permission === '*') return true;

    const [resource, operation] = permission.split('.');
    if (!resource || !operation) return false;

    if (operation === '*') {
        return resource in PERMISSION_RESOURCES;
    }

    const validOps = PERMISSION_RESOURCES[resource as PermissionResource];
    if (!validOps) return false;

    return (validOps as readonly string[]).includes(operation);
}

// ============================================
// AutoAPI Permission Mapping
// ============================================

/**
 * Map AutoAPI operation names to permission operations.
 */
export const AUTOAPI_OPERATION_MAP: Record<string, string> = {
    'list': 'read',
    'read': 'read',
    'create': 'create',
    'update': 'update',
    'delete': 'delete',
};

/**
 * Get the permission required for an AutoAPI operation.
 * @param resource - The resource name (e.g., 'boards', 'users')
 * @param operation - The AutoAPI operation (e.g., 'list', 'create')
 */
export function getAutoAPIPermission(resource: string, operation: string): string {
    const permOp = AUTOAPI_OPERATION_MAP[operation] || operation;
    return `${resource}.${permOp}`;
}

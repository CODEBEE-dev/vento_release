import { GroupModel } from "./";
import { AutoAPI } from 'protonode'
import { GROUP_PERMISSIONS } from 'protobase'

// Initial groups with predefined permissions
// These map to GROUP_PERMISSIONS presets in protobase/src/lib/perms.ts
// Simplified to 3 groups: admin, user, viewer
const initialData = {
    // Full system access - administrators
    admin: {
        "name": "admin",
        "admin": true,
        "permissions": GROUP_PERMISSIONS.admin
    },

    // Standard users - can create/edit boards, automations, use AI
    user: {
        "name": "user",
        "admin": false,
        "permissions": GROUP_PERMISSIONS.user
    },

    // Read-only viewers - can view and execute boards/cards
    viewer: {
        "name": "viewer",
        "admin": false,
        "permissions": GROUP_PERMISSIONS.viewer
    }
}

const GroupsAutoAPI = AutoAPI({
    modelName: 'groups',
    modelType: GroupModel,
    initialData: initialData,
    prefix: '/api/core/v1/',
    dbName: 'auth_groups',
    // Use granular permissions for group management
    permissions: {
        list: 'groups.read',
        read: 'groups.read',
        create: 'groups.create',
        update: 'groups.update',
        delete: 'groups.delete'
    }
})

export default (app, context) => {
    GroupsAutoAPI(app, context)
}
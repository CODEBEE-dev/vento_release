import { ResourceModel } from "./";
import { AutoAPI } from 'protonode'

export default AutoAPI({
    modelName: 'resources',
    modelType: ResourceModel,
    prefix: '/api/v1/',
    dbName: 'resources',
    permissions: {
        list: 'resources.read',
        read: 'resources.read',
        create: 'resources.create',
        update: 'resources.update',
        delete: 'resources.delete'
    }
})
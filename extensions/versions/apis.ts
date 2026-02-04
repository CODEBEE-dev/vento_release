import { VersionModel } from "./";
import { AutoActions } from 'protonode'
import { getServiceToken } from '@extensions/apis/coreContext';

const prefix = '/api/v1/'

const versionsActions = AutoActions({
    modelName: 'version',
    pluralName: 'versions',
    modelType: VersionModel,
    prefix, //where the API for the actions will be created
    object: 'versions', //what to display to the user in the list view
    apiUrl: '/api/core/v1/versions' //the URL to the API that will be used
})

export default async (app, context) => {
    versionsActions(app, context);
}
import { TokenModel } from "./tokensSchemas";
import { handler, AutoAPI, getServiceToken,getDeviceToken } from 'protonode'
import { hasPermission } from 'protobase'

export const tokensAutoAPI = AutoAPI({
    modelName: 'tokens',
    modelType: TokenModel,
    prefix: '/api/core/v1/',
    dbName: 'tokens',
    permissions: {
        list: 'tokens.read',
        read: 'tokens.read',
        create: 'tokens.create',
        update: 'tokens.update',
        delete: 'tokens.delete'
    }
})

export default (app, context) => {
    tokensAutoAPI(app, context)

    app.get('/api/core/v1/tokens/:type/create', handler(async (req, res, session) => {
        hasPermission(session, 'tokens.create')
        if(!req.params.type) {
            res.status(400).send({ error: "Type is required" });
            return;
        }
        //generate a device token if type is device
        if(req.params.type == 'device') {
            const token = getDeviceToken(req.query.deviceId, false)
            // console.log('token',token)
            // //const tokenObj = new TokenModel(data,session)
            // //await API.post('/api/core/v1/events?token='+getServiceToken(), , undefined, true)
            res.send({token})
            return
        }
        //generate a service token if type is service
        if(req.params.type == 'service') {
            const token = getServiceToken()
            res.send({token})
            return
        }
        res.status(400).send({ error: "Invalid type" });
    }))
}

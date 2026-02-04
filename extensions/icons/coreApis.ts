import fs from 'fs';
import { handler } from 'protonode';
import { hasPermission } from 'protobase';

export default (app, context) => {
    app.get('/api/core/v1/icons', handler(async (req, res, session) => {
        hasPermission(session, 'icons.read')
        const icons = fs.readdirSync('../../data/public/icons').filter((icon) => icon.endsWith('.svg')).map((icon) => icon.replace('.svg', ''))
        res.send({ icons })
    }))
}
import { getLogger, ProtoMemDB, generateEvent } from 'protobase';
import { getServiceToken } from 'protonode';
const logger = getLogger();

export const removeActions = async (options: {
    chunk?: string,
    group: string,
    tag: string
}) => {
    const chunk = options.chunk || 'actions'
    const group = options.group
    const tag = options.tag

    if(!group) {
        logger.error({}, "Action group is required");
        return
    }

    if(!tag) {
        logger.error({}, "Action tag is required");
        return
    }

    const db = ProtoMemDB(chunk)
    const existing = db.getByTag(group, tag)

    db.clear(group, tag)

    if (!existing || typeof existing !== 'object') {
        return
    }

    const serviceToken = getServiceToken()
    for (const name of Object.keys(existing)) {
        generateEvent({
            path: `${chunk}/${group}/${tag}/${name}/delete`,
            from: 'states',
            user: 'system',
            payload: {},
            ephemeral: true
        }, serviceToken)
    }
}

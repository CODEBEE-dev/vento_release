import { API, getLogger, ProtoMemDB } from 'protobase';
import {getServiceToken} from 'protonode'
const logger = getLogger();

export const delContext = async (options: {
    chunk?: string
    group: string,
    tag: string,
    name: string,
    defaultValue: any
}) => {
    const name = options.name
    const group = options.group
    const tag = options.tag
    const chunk = options.chunk || 'states'

    if(!group) {
        logger.error({}, "State group is required");
        return
    }


    if(tag === undefined) {
        return ProtoMemDB(chunk).clearGroup(group)
    }

    if(name === undefined) {
        return ProtoMemDB(chunk).clear(group, tag)
    }
    return ProtoMemDB(chunk).remove(group, tag, name)
}
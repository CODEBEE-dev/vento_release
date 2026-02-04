import { setContext } from './setContext'
import { getContext } from './getContext'
import { getStateTree } from './getStateTree'
import { appendContext } from './appendContext'
import { delContext } from './delContext'

export default {
    del: delContext,
    set: setContext,
    get: getContext,
    getStateTree: getStateTree,
    append: appendContext
}
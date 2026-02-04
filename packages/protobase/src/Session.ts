import { SessionDataType } from "./lib/perms"

export const createSession = (data?, token?:string):SessionDataType => {
    return {
        user: {
            admin: data?.admin ? data?.admin : false,
            id: data?.id ? data.id : 'guest',
            type: data?.id ? (data?.type ? data.type : 'user') : 'guest',
            permissions: data?.permissions ? data?.permissions : [],
            network: data?.network ? data.network : 'vento'
        },
        token: token ? token : '',
        loggedIn: data?.id ? true : false
    }
}
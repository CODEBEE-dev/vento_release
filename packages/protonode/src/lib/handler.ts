
import type { Request, RequestHandler, Response } from 'express';
import { ZodError, createSession, getLogger, checkPermission } from "protobase";
import { SessionDataType } from './session';
import {verifyToken} from './crypt';

const logger = getLogger()

type Handler = (
    fn: (req: Request, res: Response, session: SessionDataType, next: any) => Promise<void> | void
) => RequestHandler;

export const getAuth = (req) => {
    //try to recover identify from token
    let decoded;
    let session;
    try {
        session = JSON.parse(req.cookies.session)
    } catch(e) {
        session = null
    }

    var token = '';

    // Check Authorization header for Bearer token
    const authHeader = req.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7); // Remove 'Bearer ' prefix
    } else if(req.query.token || (session && session.token)) {
        token = req.query.token ? req.query.token : session.token
        if(Array.isArray(token)) {
            token = token[0]
        }
    }

    if (token) {
        try {
            decoded = createSession(verifyToken(token))
        } catch(error) {
            logger.error({ error }, "Error reading token")
            decoded = createSession()
        }
    } else {
        decoded = createSession()
    }
    return {session: decoded, token}
}

export const handler: Handler = fn => async (req:any, res:any, next:any) => {
    try {
        const params = getAuth(req)
        await fn(req, res, {...params.session, token: params.token}, next);
    } catch (e:any) {
        // logger.error({error: e}, "Error processing api call")
        if (e instanceof ZodError) {
            const err = e.flatten()
            res.status(400).send(err)
        } else if(e.toString() == 'E_PERM') {
            res.status(403).send({error: e.toString()})
        } else if(e.toString() == 'E_AUTH') {
            res.status(401).send({error: e.toString()})
        } else if(e.toString() == 'File already exists') {
            res.status(409).send({error: e.toString()})
        } else {
            res.status(500).send({error: e.toString()})
        }
    }
};

export const requireAuth = () => handler(async (req, res, session, next) => {
    if(!session || !session.loggedIn) {
        res.status(401).send({error: "Unauthorized"})
        return
    }
    next()
})

/**
 * @deprecated Use requirePermission() instead for granular permission checks.
 * This function only checks for admin flag and doesn't support granular permissions.
 */
export const requireAdmin = () => handler(async (req, res, session, next) => {
    if(!session || !session.user.admin) {
        res.status(401).send({error: "Unauthorized"})
        return
    }
    next()
})

/**
 * Middleware that requires a specific permission.
 * Returns 401 if not authenticated, 403 if authenticated but lacks permission.
 *
 * @param permission - The permission string to check (e.g., 'boards.read', 'files.*')
 * @example
 * app.get('/api/v1/files', requirePermission('files.read'), handler(...))
 */
export const requirePermission = (permission: string) => handler(async (req, res, session, next) => {
    if (!session || !session.loggedIn) {
        res.status(401).send({ error: "Unauthorized" })
        return
    }
    if (!checkPermission(session, permission)) {
        res.status(403).send({ error: "Forbidden", requiredPermission: permission })
        return
    }
    next()
})
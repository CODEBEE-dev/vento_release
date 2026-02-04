import pino from 'pino';
import { getConfig } from './Config';

const mkCaller = (logger: any, audience: string) => (fn) => (data: any, msg?: string) => {
  if (typeof data === 'string') {
    // string as msg
    return fn.call(logger, { audience }, data)
  }
  if (data instanceof Error) {
    // errors well serialized
    return fn.call(logger, { audience, err: data }, msg ?? data.message)
  }
  // object + optional msg
  return fn.call(logger, { audience, data }, msg)
}

const mkAudience = (logger: any, audience: string) => {
  const call = mkCaller(logger, audience)
  return {
    fatal: call(logger.fatal),
    error: call(logger.error),
    warn: call(logger.warn),
    info: call(logger.info),
    debug: call(logger.debug),
    trace: call(logger.trace),
  }
}

export const getLogger = (meta?: Object, userConfig?) => {
  const config = userConfig ?? getConfig()
  const baseLogger = pino(config.logger)

  let logger = baseLogger
  if (meta && typeof meta !== 'string') {
    logger = baseLogger.child({
      _meta: {...meta}
    })
  }

  return {
    error: (data, msg?, id?) => logger.error(data, msg),
    fatal: (data, msg?, id?) => logger.fatal(data, msg),
    warn: (data, msg?, id?) => logger.warn(data, msg),
    info: (data, msg?, id?) => logger.info(data, msg),
    debug: (data, msg?, id?) => logger.debug(data, msg),
    trace: (data, msg?, id?) => logger.trace(data, msg),
    ui: mkAudience(logger, 'ui'),
  }
}
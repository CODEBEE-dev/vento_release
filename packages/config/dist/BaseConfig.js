"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBaseConfig = exports.getConfigWithoutSecrets = void 0;
exports.deepMerge = deepMerge;
function deepMerge(target, source) {
    Object.keys(source).forEach(key => {
        const sourceValue = source[key];
        if (typeof sourceValue === 'object' && sourceValue !== null) {
            if (!target[key] || typeof target[key] !== 'object') {
                target[key] = {};
            }
            deepMerge(target[key], sourceValue);
        }
        else {
            target[key] = sourceValue;
        }
    });
    return target;
}
const getConfigWithoutSecrets = (config) => {
    const forbiddenKeys = ['secret', 'token', 'password'];
    const filterConfig = (obj) => {
        if (Array.isArray(obj)) {
            return obj.map(item => {
                if (typeof item === 'object' && item !== null) {
                    return filterConfig(item);
                }
                return item;
            });
        }
        else if (typeof obj === 'object' && obj !== null) {
            return Object.keys(obj).reduce((acc, key) => {
                if (!forbiddenKeys.includes(key)) {
                    acc[key] = filterConfig(obj[key]);
                }
                return acc;
            }, {});
        }
        return obj;
    };
    return filterConfig(config);
};
exports.getConfigWithoutSecrets = getConfigWithoutSecrets;
const getBaseConfig = (name, process, token, config) => {
    const isBundled = typeof __BUNDLED__ !== 'undefined' && __BUNDLED__;
    // In bundled mode, RemoteTransport.js is compiled alongside index.js
    // In dev mode, use the original .ts file (tsx can handle it)
    const remoteTransportPath = isBundled
        ? __dirname + '/RemoteTransport.js' // apps/core/RemoteTransport.js
        : __dirname + '/../../protobase/lib/RemoteTransport.ts';
    const BaseConfig = {
        mqtt: {
            auth: process.env.DISABLE_MQTT_AUTH === "true" ? false : true
        },
        logger: {
            transport: {
                targets: [
                    // Pretty print to console (server-side only)
                    ...(process && typeof window === "undefined" ? [{
                            target: 'pino-pretty',
                            level: 'debug',
                            options: {
                                colorize: true,
                                ignore: 'pid,hostname,time'
                            }
                        }] : []),
                    // Write to log file (server-side only)
                    ...(process && typeof window === "undefined" ? [{
                            target: 'pino/file',
                            level: 'trace',
                            options: {
                                destination: "../../logs/" + name + '.log'
                            }
                        }] : []),
                    // MQTT remote logging (server-side with token only)
                    ...(process && typeof window === "undefined" && token ? [{
                            target: remoteTransportPath,
                            level: 'debug',
                            options: {
                                username: name,
                                password: token
                            }
                        }] : []),
                ]
            },
            name: name !== null && name !== void 0 ? name : 'default',
            level: 'trace'
        }
    };
    return config ? deepMerge(BaseConfig, config) : BaseConfig;
};
exports.getBaseConfig = getBaseConfig;

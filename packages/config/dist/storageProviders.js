"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = exports.getDB = exports.dbProvider = void 0;
const protonode_1 = require("protonode");
var protonode_2 = require("protonode");
Object.defineProperty(exports, "dbProvider", { enumerable: true, get: function () { return protonode_2.dbProvider; } });
// DEFAULTS
exports.getDB = protonode_1.dbProvider.getDB;
exports.connectDB = protonode_1.dbProvider.connectDB;

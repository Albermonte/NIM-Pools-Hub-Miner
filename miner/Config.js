const fs = require('fs');
const JSON5 = require('json5');
const merge = require('lodash.merge');

const Log = require('@nimiq/core').Log;
const TAG = 'Config';

/**
 * @typedef {object} Config
 * @property {string} network
 * @property {{enabled: boolean, threads: string|number, throttleAfter: number, throttleWait: number, extraData: string}} miner
 * @property {{enabled: boolean, host: string, port: number}} poolMining
 * @property {{seed: string, address: string}} wallet
 * @property {int} threads
 * @property {string} address
 * @property {boolean} debug
 */

const DEFAULT_CONFIG = /** @type {Config} */ {
    network: 'main',
    miner: {
        enabled: false,
        threads: 'auto'
    },
    poolMining: {
        enabled: false,
        host: null,
        port: -1
    }
};

const CONFIG_TYPES = {
    network: 'string',
    miner: {
        type: 'object', sub: {
            enabled: 'boolean',
            threads: {type: 'mixed', types: ['number', {type: 'string', values: ['auto']}]}
        }
    },
    poolMining: {
        type: 'object', sub: {
            enabled: 'boolean',
            host: 'string',
            port: 'number'
        }
    }
};

function validateItemType(config, key, type, error = true) {
    let valid = true;
    if (typeof type === 'string') {
        if (type === 'boolean') {
            if (config[key] === 'yes' || config[key] === 1) config[key] = true;
            if (config[key] === 'no' || config[key] === 0) config[key] = false;
        }
        if (type === 'number' && typeof config[key] === 'string') {
            if (!isNaN(parseInt(config[key]))) {
                Log.i(TAG, `Configuration option '${key}' should be of type 'number', but is of type 'string', will parse it.`);
                config[key] = parseInt(config[key]);
            }
        }
        if (type === 'string' && typeof config[key] === 'number') {
            Log.i(TAG, `Configuration option '${key}' should be of type 'string', but is of type 'number', will convert it.`);
            config[key] = config[key].toString();
        }
        if (typeof config[key] !== type) {
            if (error) Log.w(TAG, `Configuration option '${key}' is of type '${typeof config[key]}', but '${type}' is required`);
            valid = false;
        }
    } else if (typeof type === 'object') {
        if (['string', 'number', 'object'].includes(type.type)) {
            if (!validateItemType(config, key, type.type)) {
                valid = false;
            }
        }
        if (type.type === 'array') {
            if (!Array.isArray(config[key])) {
                if (error) Log.w(TAG, `Configuration option '${key}' should be an array.`);
                valid = false;
            } else if (type.inner) {
                for (let i = 0; i < config[key].length; i++) {
                    if (!validateItemType(config[key], i, type.inner, false)) {
                        if (error) Log.w(TAG, `Element ${i} of configuration option '${key}' is invalid.`);
                        valid = false;
                    }
                }
            }
        }
        if (Array.isArray(type.values)) {
            if (!type.values.includes(config[key])) {
                if (error) Log.w(TAG, `Configuration option '${key}' is '${config[key]}', but must be one of '${type.values.slice(0, type.values.length - 1).join('\', \'')}' or '${type.values[type.values.length - 1]}'.`);
                valid = false;
            }
        }
        if (typeof config[key] === 'object' && type.type === 'object' && typeof type.sub === 'object') {
            if (!validateObjectType(config[key], type.sub, error)) {
                valid = false;
            }
        }
        if (type.type === 'mixed' && Array.isArray(type.types)) {
            let subvalid = false;
            for (const subtype of type.types) {
                if (validateItemType(config, key, subtype, false)) {
                    subvalid = true;
                    break;
                }
            }
            if (!subvalid) {
                if (error) Log.w(TAG, `Configuration option '${key}' is invalid`);
                valid = false;
            }
        }
    }
    return valid;
}

function validateObjectType(config, types = CONFIG_TYPES, error = true) {
    let valid = true;
    for (const key in types) {
        if (!(key in config) || config[key] === undefined || config[key] === null) {
            if (typeof types[key] === 'object' && types[key].required) {
                if (error) Log.w(TAG, `Required configuration option '${key}' is missing`);
                valid = false;
            }
            continue;
        }
        if (!validateItemType(config, key, types[key], error)) {
            valid = false;
        }
    }
    return valid;
}

if (!validateObjectType(DEFAULT_CONFIG)) {
    throw new Error('Default config is invalid according to type specification.');
}

/**
 * @param {string} file
 * @param {object} oldConfig
 * @returns {Config|boolean}
 */
function readFromFile(file, oldConfig = merge({}, DEFAULT_CONFIG)) {
    if (typeof file === 'undefined') {
        Log.w(TAG, 'No configuration file given');
        return false;
    }
    try {
        const config = JSON5.parse(fs.readFileSync(file));
        if (!validateObjectType(config)) {
            Log.e(TAG, `Configuration file ${file} is invalid.`);
            return false;
        } else {
            return merge(oldConfig, config);
        }
    } catch (e) {
        // Log.e(TAG, `Failed to read file ${file}: ${e.message}`);
        return false;
    }
}

module.exports = readFromFile;
module.exports.DEFAULT_CONFIG = DEFAULT_CONFIG;

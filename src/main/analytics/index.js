import { machineIdSync } from 'node-machine-id';
import os from 'os';
import axios from 'axios';
import https from 'https';

const agent = new https.Agent({
    rejectUnauthorized: false // Necessary for current Electron version
});

export class Analytics {
    static _gpuInfo = []
    static _machineId = machineIdSync()
    static _osPlatform = os.platform()
    static _maxHashrate = []

    /**
     * @param {number} idx
     * @param {string} type
     * @param {object} device
     */
    static setGPUConfig({ idx, type, device }) {
        Analytics._gpuInfo[idx] = {
            type,
            ...device
        }
        Analytics._maxHashrate[idx] = 0
    }

    /**
     * @param {number} hashrate
    */
    static updateHashrate({ idx, hashrate }) {
        if (hashrate > Analytics._maxHashrate[idx]) {
            Analytics._maxHashrate[idx] = hashrate
            Analytics._gpuInfo[idx].maxHashrate = hashrate
            Analytics.submit()
        }
    }

    static submit() {
        const data = {
            machineId: this._machineId,
            osPlatform: this._osPlatform,
            gpuInfo: this._gpuInfo,
            maxHashrate: this._maxHashrate,
            date: Date.now()
        }
        console.log("Sending analytics data: ", data);
        axios.post('https://nph-miner-api.shortnim.me/', data, {
            httpsAgent: agent
        }).then(res => {
            console.log(res.data)
        }).catch(err => {
            console.log(err)
        })
    }
}
const Nimiq = require('@nimiq/core');

class NativeMiner extends Nimiq.Observable {

    /**
     * @param {string} type 
     * @param {object} deviceOptions 
     */
    constructor(type, deviceOptions) {
        super();

        const NimiqMiner = require('bindings')(`nimiq_miner_${type}.node`);
        this._nativeMiner = new NimiqMiner.Miner();

        this._devices = this._nativeMiner.getDevices();
        this._devices.forEach((device, idx) => {
            const options = deviceOptions.forDevice(idx);
            if (!options.enabled) {
                device.enabled = false;
                Nimiq.Log.i(`GPU #${idx}: ${device.name}. Disabled by user.`);
                return;
            }
            if (options.memory !== undefined) {
                device.memory = options.memory;
            }
            if (options.threads !== undefined) {
                device.threads = options.threads;
            }
            if (options.cache !== undefined) {
                device.cache = options.cache;
            }
            if (type === 'cuda') {
                if (options.memoryTradeoff !== undefined) {
                    device.memoryTradeoff = options.memoryTradeoff;
                }
                Nimiq.Log.i(`GPU #${idx}: ${device.name}, ${device.multiProcessorCount} SM @ ${device.clockRate} MHz. (memory: ${device.memory == 0 ? 'auto' : device.memory}, threads: ${device.threads}, cache: ${device.cache}, mem.tradeoff: ${device.memoryTradeoff})`);
            } else {
                if (options.jobs !== undefined) {
                    device.jobs = options.jobs;
                }
                Nimiq.Log.i(`GPU #${idx}: ${device.name}, ${device.maxComputeUnits} CU @ ${device.maxClockFrequency} MHz. (memory: ${device.memory == 0 ? 'auto' : device.memory}, threads: ${device.threads}, cache: ${device.cache}, jobs: ${device.jobs})`);
            }
        });

        const threads = this._devices.reduce((threads, device) => threads + (device.enabled ? device.threads : 0), 4); // 4 initial threads + more for GPU workers
        process.env.UV_THREADPOOL_SIZE = threads;
        Nimiq.Log.d(NativeMiner, `Set UV_THREADPOOL_SIZE=${threads}`);

        this._nativeMiner.initializeDevices();

        this._hashes = [];
        this._lastHashRates = [];
    }

    _reportHashRate() {
        const averageHashRates = [];
        this._hashes.forEach((hashes, idx) => {
            const hashRate = hashes / NativeMiner.HASHRATE_REPORT_INTERVAL;
            this._lastHashRates[idx] = this._lastHashRates[idx] || [];
            this._lastHashRates[idx].push(hashRate);
            if (this._lastHashRates[idx].length > NativeMiner.HASHRATE_MOVING_AVERAGE) {
                this._lastHashRates[idx].shift();
                averageHashRates[idx] = this._lastHashRates[idx].reduce((sum, val) => sum + val, 0) / this._lastHashRates[idx].length;
            } else if (this._lastHashRates[idx].length > 1) {
                averageHashRates[idx] = this._lastHashRates[idx].slice(1).reduce((sum, val) => sum + val, 0) / (this._lastHashRates[idx].length - 1);
            }
        });
        this._hashes = [];
        if (averageHashRates.length > 0) {
            this.fire('hashrate-changed', averageHashRates);
        }
    }

    /**
     * 
     * @param {number} shareCompact 
     */
    setShareCompact(shareCompact) {
        this._nativeMiner.setShareCompact(shareCompact);
    }

    /**
     * 
     * @param {Nimiq.BlockHeader} blockHeader 
     * @param {Function} callback 
     */
    startMiningOnBlock(blockHeader, callback) {
        if (!this._hashRateTimer) {
            this._hashRateTimer = setInterval(() => this._reportHashRate(), 1000 * NativeMiner.HASHRATE_REPORT_INTERVAL);
        }
        this._nativeMiner.startMiningOnBlock(blockHeader.serialize(), (error, obj) => {
            if (error) {
                throw error;
            }
            if (obj.done === true) {
                return;
            }
            this._hashes[obj.device] = (this._hashes[obj.device] || 0) + obj.noncesPerRun;
            callback(obj);
        });
    }

    stop() {
        this._nativeMiner.stop();
        if (this._hashRateTimer) {
            this._hashes = [];
            this._lastHashRates = [];
            clearInterval(this._hashRateTimer);
            delete this._hashRateTimer;
        }
    }

    get devices() {
        return this._devices;
    }
}

NativeMiner.HASHRATE_MOVING_AVERAGE = 6; // measurements
NativeMiner.HASHRATE_REPORT_INTERVAL = 10; // seconds

module.exports = NativeMiner;

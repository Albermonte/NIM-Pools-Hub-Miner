const os = require('os')
const crypto = require('crypto')
const Nimiq = require('@nimiq/core')
const MinerWorkerPool = Nimiq.MinerWorkerPool
const WebSocket = require('ws')
const Utils = require('./Utils')

const GENESIS_HASH_MAINNET = 'Jkqvik+YKKdsVQY12geOtGYwahifzANxC+6fZJyGnRI='
const HASHRATE_REPORT_INTERVAL = 5 // seconds
const HASHRATE_MOVING_AVERAGE = 5 // seconds

class SushiPoolCpuMiner extends Nimiq.Observable {
    constructor (address, deviceData, threads) {
        super()

        this._address = address
        this._deviceId = this._getDeviceId()
        this._deviceData = deviceData

        this._miner = new MinerWorkerPool(threads)
        this._hashes = 0
        this._lastHashRates = []
        this._miner.on('share', obj => {
            this._miner._onWorkerShare(obj)
        })
        this._miner.on('no-share', obj => {
            this._miner._onWorkerShare(obj)
        })
        this._miner._onWorkerShare = (obj) => {
            if (obj.block && obj.hash) {
                this._submitShare(obj.nonce)
            }
            this._hashes += this._miner.noncesPerRun
        }
        this._miner._reportHashRate = () => {
            const lastHashRate = this._hashes / HASHRATE_REPORT_INTERVAL
            this._lastHashRates.push(lastHashRate)
            if (this._lastHashRates.length > HASHRATE_MOVING_AVERAGE) {
                this._lastHashRates.shift()
            }
            this._hashes = 0
            const averageHashRate = this._lastHashRates.reduce((sum, val) => sum + val, 0) / this._lastHashRates.length
            this.fire('hashrate-changed', [averageHashRate])
        }
        this._miner.setShareCompact = (shareCompact) => {
            if (this._miner._miningEnabled) {
                Nimiq.Log.i(SushiPoolCpuMiner, `Still working on block #${this._block}`)
                this._miner._shareCompact = shareCompact
            }
        }
    }

    _getDeviceId () {
        const hostInfo = os.hostname() + '/' + Object.values(os.networkInterfaces()).map(i => i.map(a => a.address + '/' + a.mac).join('/')).join('/')
        const hash = crypto.createHash('sha256')
        hash.update(hostInfo)
        return hash.digest().readUInt32LE(0)
    }

    connect (host, port) {
        Nimiq.Log.i(SushiPoolCpuMiner, `Connecting to ${host}:${port}`)
        this._host = host
        this._closed = false
        this._ws = new WebSocket(`wss://${host}:${port}`)

        this._ws.on('open', () => {
            this._register()
        })

        this._ws.on('close', (code, reason) => {
            this._stopMining()
            if (!this._closed) {
                let timeout = Math.floor(Math.random() * 25) + 5
                this._host = Utils.getNewHost(this._host)
                Nimiq.Log.w(SushiPoolCpuMiner, `Connection lost. Reconnecting in ${timeout} seconds to ${this._host}`)
                setTimeout(() => {
                    this.connect(this._host, port)
                }, timeout * 1000)
            }
        })

        this._ws.on('message', (msg) => this._onMessage(JSON.parse(msg)))

        this._ws.on('error', (e) => Nimiq.Log.e(SushiPoolCpuMiner, `WS error - ${e.message}`, e))
    }

    disconnect () {
        this._closed = true
        this._ws.close()
    }

    _register () {
        Nimiq.Log.i(SushiPoolCpuMiner, `Registering to pool (${this._host}) using device id ${this._deviceId} (${this._deviceData.deviceName}) as a dumb client.`)
        this._send({
            message: 'register',
            mode: 'dumb',
            address: this._address,
            deviceId: this._deviceId,
            startDifficulty: this._deviceData.startDifficulty,
            deviceName: this._deviceData.deviceName,
            deviceData: this._deviceData,
            minerVersion: this._deviceData.minerVersion,
            genesisHash: GENESIS_HASH_MAINNET
        })
    }

    _onMessage (msg) {
        if (!msg || !msg.message) return
        switch (msg.message) {
        case 'registered':
            Nimiq.Log.i(SushiPoolCpuMiner, 'Connected to pool')
            break
        case 'settings':
            this._onNewPoolSettings(msg.address, Buffer.from(msg.extraData, 'base64'), msg.targetCompact, msg.nonce)
            break
        case 'balance':
            this._onBalance(msg.balance, msg.confirmedBalance)
            break
        case 'new-block':
            this._onNewBlock(Buffer.from(msg.blockHeader, 'base64'))
            break
        case 'error':
            Nimiq.Log.w(SushiPoolCpuMiner, `Pool error: ${msg.reason}`)
            break
        }
    }

    _startMining () {
        // const height = this._currentBlockHeader.readUInt32BE(134)
        const header = Nimiq.BlockHeader.unserialize(new Nimiq.SerialBuffer(this._currentBlockHeader))
        const interlink = new Nimiq.BlockInterlink([], new Nimiq.Hash(null))
        this._block = new Nimiq.Block(header, interlink)
        Nimiq.Log.i(SushiPoolCpuMiner, `Starting work on block #${this._block}`)
        this._miner.startMiningOnBlock(this._block, this._shareCompact)
        if (!this._hashRateTimer) {
            this._hashRateTimer = setInterval(() => {
                this._miner._reportHashRate()
            }, 1000 * HASHRATE_REPORT_INTERVAL)
        }
    }

    _stopMining () {
        this._miner.stop()
        delete this._currentBlockHeader
        if (this._hashRateTimer) {
            clearInterval(this._hashRateTimer)
            delete this._hashRateTimer
        }
    }

    _onNewPoolSettings (address, extraData, shareCompact, nonce) {
        const difficulty = Nimiq.BlockUtils.compactToDifficulty(shareCompact)
        Nimiq.Log.i(SushiPoolCpuMiner, `Set share difficulty: ${difficulty.toFixed(2)} (${shareCompact.toString(16)})`)
        this._shareCompact = shareCompact
        this._miner.setShareCompact(shareCompact)
    }

    _onBalance (balance, confirmedBalance) {
        Nimiq.Log.i(SushiPoolCpuMiner, `Balance: ${Nimiq.Policy.lunasToCoins(balance)} NIM, confirmed balance: ${Nimiq.Policy.lunasToCoins(confirmedBalance)} NIM`)
    }

    _onNewBlock (blockHeader) {
        // Workaround duplicated blocks
        if (this._currentBlockHeader !== undefined && this._currentBlockHeader.equals(blockHeader)) {
            Nimiq.Log.w(SushiPoolCpuMiner, 'The same block appears once again!')
            return
        }

        this._currentBlockHeader = blockHeader
        this._startMining()
    }

    _submitShare (nonce) {
        this._send({
            message: 'share',
            nonce
        })
        this.fire('share', nonce)
    }

    _send (msg) {
        try {
            this._ws.send(JSON.stringify(msg))
        } catch (e) {
            const readyState = this._ws.readyState
            Nimiq.Log.e(SushiPoolCpuMiner, `WS error - ${e.message}`)
            if (readyState === WebSocket.CLOSED) {
                this._ws.close()
            }
        }
    }
}

module.exports = SushiPoolCpuMiner

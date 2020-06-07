const fs = require('fs');
const JSON5 = require('json5');
const Nimiq = require('@nimiq/core');

function readConfigFile (fileName) {
    try {
        const config = JSON5.parse(fs.readFileSync(fileName))
        // TODO: Validate
        return config
    } catch (e) {
        Nimiq.Log.e(`Failed to read config file ${fileName}: ${e.message}`)
        return false
    }
}

function humanHashes (bytes) {
    let thresh = 1000
    if (Math.abs(bytes) < thresh) {
        return bytes + ' H/s'
    }
    let units = [
        'kH/s',
        'MH/s',
        'GH/s',
        'TH/s',
        'PH/s',
        'EH/s',
        'ZH/s',
        'YH/s'
    ]
    let u = -1
    do {
        bytes /= thresh
        ++u
    } while (Math.abs(bytes) >= thresh && u < units.length - 1)
    return bytes.toFixed(1) + ' ' + units[u]
}

function toHumanReadable (seconds, next) {
    let days = Math.floor(seconds / (3600 * 24))
    seconds -= days * 3600 * 24
    let hrs = Math.floor(seconds / 3600)
    seconds -= hrs * 3600
    let mnts = Math.floor(seconds / 60)
    seconds -= mnts * 60
    if (hrs < 10) {
        hrs = '0' + hrs
    }
    if (mnts < 10) {
        mnts = '0' + mnts
    }
    if (seconds < 10) {
        seconds = '0' + seconds
    }
    return hrs + ':' + mnts + ':' + seconds
}

function convertDateToUTC (date) {
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds())
}

function countTo (countdown) {
    let now = convertDateToUTC(new Date())

    // find closest next
    let nextIdx = -1
    let next = convertDateToUTC(new Date())
    for (let i = 0; i < countdown.length; i++) {
        next.setHours(countdown[i], 0, 0)
        if (next > now) {
            nextIdx = i
            break
        }
    }
    if (nextIdx === -1) { // next day
        next.setDate(next.getDate() + 1)
        next.setHours(countdown[0], 0, 0)
    }
    let remainingSeconds = (next - now) / 1000
    return toHumanReadable(remainingSeconds, next)
}

// https://stackoverflow.com/questions/154059/how-to-check-empty-undefined-null-string-in-javascript
function isEmpty (str) {
    return (!str || str.length === 0)
}

function getNewHost (currentHost) {
    const FALLBACK_HOSTS = [
        'eu.sushipool.com',
        'us.sushipool.com',
        'asia.sushipool.com'
    ]
    let idx = FALLBACK_HOSTS.indexOf(currentHost)
    if (idx !== -1) {
        // if current host is found in fallback hosts, then try the next one
        idx = (idx + 1) % FALLBACK_HOSTS.length
    } else { // otherwise just randomly choose one fallback host
        idx = Math.floor(Math.random() * FALLBACK_HOSTS.length)
    }
    const newHost = FALLBACK_HOSTS[idx]
    return newHost
}

const DASHBOARD_INITIALISING = 'Initialising'
const DASHBOARD_MINING = 'Mining'
const DASHBOARD_IDLE = 'Idle'

module.exports = {
    readConfigFile,
    humanHashes,
    countTo,
    isEmpty,
    getNewHost,
    DASHBOARD_INITIALISING,
    DASHBOARD_MINING,
    DASHBOARD_IDLE
}

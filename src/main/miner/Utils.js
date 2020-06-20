function humanHashes(bytes) {
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

function toHumanReadable(seconds, next) {
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

function convertDateToUTC(date) {
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds())
}

function getNewHost(currentHost) {
    const FALLBACK_HOSTS = [
        'eu.nimpool.io',
        'us.nimpool.io',
        'ap.nimpool.io'
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

module.exports = {
    humanHashes,
    getNewHost,
}

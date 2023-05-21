const axios = require("axios");
const https = require("https");
const log = require("electron-log");
const Nimiq = require("@nimiq/core");

const agent = new https.Agent({
  rejectUnauthorized: false // Necessary for current Electron version
});

const checkPoolOnline = (poolName) => {
  return eval("is" + poolName + "Online(true)");
};

const isIceminingOnline = async (retry) => {
  try {
    const { NIM } = (
      await axios.get("https://icemining.ca/api/currencies", {
        timeout: 20000,
        httpsAgent: agent
      })
    ).data;
    const online = NIM.hashrate > 0;
    return {
      online,
      hashrate: parseHashrate(NIM.hashrate),
      hashrateComplete: Number(NIM.hashrate.toFixed(0)),
      pool_fee: "1.25%",
      minimum_payout: NIM.payout_min,
    };
  } catch (e) {
    console.log(e.toString());
    log.error(e);

    if (retry) return isIceminingOnline(false);
    return false;
  }
};


const isNimiqwatchOnline = async (retry) => {
  try {
    const { device_count, hashrate } = (
      await axios.get("https://pool.nimiq.watch/api/stats.json", {
        timeout: 20000,
        httpsAgent: agent
      })
    ).data;
    const { fee } = (
      await axios.get("https://pool.nimiq.watch/api/pool.json", {
        timeout: 20000,
        httpsAgent: agent
      })
    ).data;
    return {
      online: device_count > 0 || hashrate > 0,
      hashrate: parseHashrate(hashrate),
      hashrateComplete: Number(hashrate.toFixed(0)),
      pool_fee: (fee < 1 ? parseFloat(fee).toFixed(2) : fee) + "%",
      minimum_payout: 10,
    };
  } catch (e) {
    console.log(e.toString());
    log.error(e);

    if (retry) return isNimiqwatchOnline(false);
    return false;
  }
};

const isE4poolOnline = async (retry) => {
  try {
    const { device_count, hashrate } = (
      await axios.get("https://nimiq.e4pool.com/api/stats.json", {
        timeout: 20000,
        httpsAgent: agent
      })
    ).data;
    const { fee } = (
      await axios.get("https://nimiq.e4pool.com/api/pool.json", {
        timeout: 20000,
        httpsAgent: agent
      })
    ).data;
    return {
      online: device_count > 0 || hashrate > 0,
      hashrate: parseHashrate(hashrate),
      hashrateComplete: Number(hashrate.toFixed(0)),
      pool_fee: (fee < 1 ? parseFloat(fee).toFixed(2) : fee) + "%",
      minimum_payout: 50,
    };
  } catch (e) {
    console.log(e.toString());
    log.error(e);

    if (retry) return isNimiqwatchOnline(false);
    return false;
  }
};

const isAceminingOnline = async (retry) => {
  try {
    const statsPromise = axios.get("https://api.acemining.co/api/v1/currencies", {
      timeout: 20000,
      httpsAgent: agent
    })

    const blocksPromise = axios.get("https://api.acemining.co/api/v1/totalblocks", {
      timeout: 20000,
      httpsAgent: agent
    })

    const [stats, blocks] = (await Promise.all([statsPromise, blocksPromise])).map(res => res.data)

    return {
      online: stats.workers > 0 || stats.hashrate > 0,
      hashrate: parseHashrate(stats.hashrate),
      hashrateComplete: Number(stats.hashrate.toFixed(0)),
      pool_fee: stats.NIM.reward_model.PPLNS + "%",
      minimum_payout: stats.payout_min,
    };
  } catch (e) {
    console.log(e.toString());
    log.error(e);

    if (retry) return isAceminingOnline(false);
    return false;
  }
};

export const getGlobalHashrate = async () => {
  try {
    const { data } = (
      await axios.get("https://api.nimiq.watch/statistics/difficulty/day", {
        timeout: 15000,
        httpsAgent: agent
      })
    );
    const difficulty = data.map(function (block) { return block['d']; });
    const timestamp = data.map(function (block) { return block['t']; });

    // Fill empty times
    let i = 0;
    const gap = 15 * 60; // 15 minutes
    const now = Date.now() / 1000;

    while (timestamp[i]) {
      if (
        (!timestamp[i + 1] && now - timestamp[i] > gap * 1.8)
        || (timestamp[i + 1] > timestamp[i] + gap * 1.8)
      ) {
        // Add missing time
        timestamp.splice(i + 1, 0, timestamp[i] + gap);
        difficulty.splice(i + 1, 0, 0);
      }
      i++;
    }
    const hashrate  = difficulty.map(function(diff) { return Math.round(diff * Math.pow(2, 16) / Nimiq.Policy.BLOCK_TIME); });

    return hashrate[hashrate.length - 1];
  } catch (e) {
    console.log('Cannot get global hashrate');
    console.log(e.toString());

    log.error('Cannot get global hashrate');
    log.error(e);
    return 0;
  }
};

const parseHashrate = (number) => {
  number = Number(number);
  const hs_length = number.toFixed(0).toString().length;
  let hashrate = 0;
  if (hs_length <= 6) hashrate = Number((number / 1e3).toFixed(2)) + " kH/s";
  else if (hs_length > 6 && hs_length <= 9)
    hashrate = Number((number / 1e6).toFixed(2)) + " MH/s";
  else if (hs_length > 9 && hs_length <= 12)
    hashrate = Number((number / 1e9).toFixed(2)) + " GH/s";
  else if (hs_length > 12 && hs_length <= 15)
    hashrate = Number((number / 1e12).toFixed(2)) + " TH/s";
  else hashrate = Number(number.toFixed(2)) + " H/s";

  return hashrate;
};

export default checkPoolOnline;

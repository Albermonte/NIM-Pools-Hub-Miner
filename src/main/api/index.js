const axios = require("axios");

const checkPoolOnline = (poolName) => {
  return eval("is" + poolName + "Online(true)");
};

const isIceminingOnline = async (retry) => {
  try {
    const { NIM } = (
      await axios.get("https://icemining.ca/api/currencies", {
        timeout: 20000,
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
  } catch {
    if (retry) return isIceminingOnline(false);
    return false;
  }
};

const isNimpoolOnline = async (retry) => {
  try {
    const res = (
      await axios.get("https://api.nimpool.io/status", { timeout: 20000 })
    ).data.result;
    const { result } = (
      await axios.get("https://api.nimpool.io/pool", { timeout: 20000 })
    ).data;
    return {
      online: res.eu.core,
      hashrate: parseHashrate((result.work_per_second || 0) * Math.pow(2, 16)),
      hashrateComplete: Number(
        ((result.work_per_second || 0) * Math.pow(2, 16)).toFixed(0)
      ),
      pool_fee: "1.0%",
      minimum_payout: 5,
    };
  } catch {
    if (retry) return isNimpoolOnline(false);
    return false;
  }
};

const isSkypoolOnline = async (retry) => {
  try {
    const stats = (
      await axios.get("https://api.nimiq.skypool.xyz/api/v1/pool/poolProfile", {
        timeout: 20000,
      })
    ).data.data;
    console.log(stats);
    const online = stats.hashrate > 0;
    return {
      online,
      hashrate: parseHashrate(stats.hashrate),
      hashrateComplete: Number(stats.hashrate.toFixed(0)),
      pool_fee: "~1%",
      minimum_payout: 10,
    };
  } catch {
    if (retry) return isSkypoolOnline(false);
    return false;
  }
};

const isBlankpoolOnline = async (retry) => {
  try {
    const { clientCounts, averageHashrate } = (
      await axios.get("https://mine.blank.drawpad.org/api/pool/stats", {
        timeout: 20000,
      })
    ).data;
    const pool_fee = (
      await axios.get("https://mine.blank.drawpad.org/api/pool/config", {
        timeout: 20000,
      })
    ).data.fees;
    return {
      online: clientCounts.total > 0 || averageHashrate > 0,
      hashrate: parseHashrate(averageHashrate),
      hashrateComplete: Number(averageHashrate.toFixed(0)),
      pool_fee,
      minimum_payout: 0,
    };
  } catch {
    if (retry) return isBlankpoolOnline(false);
    return false;
  }
};


const isNimiqwatchOnline = async (retry) => {
  try {
    const { device_count, hashrate } = (
      await axios.get("https://pool.nimiq.watch/api/stats.json", {
        timeout: 20000,
      })
    ).data;
    const { fee } = (
      await axios.get("https://pool.nimiq.watch/api/pool.json", {
        timeout: 20000,
      })
    ).data;
    return {
      online: device_count > 0 || hashrate > 0,
      hashrate: parseHashrate(hashrate),
      hashrateComplete: Number(hashrate.toFixed(0)),
      pool_fee: (fee < 1 ? parseFloat(fee).toFixed(2) : fee) + "%",
      minimum_payout: 10,
    };
  } catch {
    if (retry) return isNimiqwatchOnline(false);
    return false;
  }
};

const isAceminingOnline = async (retry) => {
  try {
    const { hashrate } = (
      await axios.get("https://api.acemining.co/api/v1/hashrate", {
        timeout: 20000
      })
    ).data;

    const { total } = (
      await axios.get("https://api.acemining.co/api/v1/miners", {
        timeout: 20000
      })
    ).data;

    const poolfee = "0.5%";
    const minimal = "1 NIM";

    return {
      online: total > 0 || hashrate > 0,
      hashrate: parseHashrate(hashrate),
      hashrateComplete: Number(hashrate.toFixed(0)),
      pool_fee: poolfee,
      minimum_payout: Number(minimal.match(/\d+/)[0]),
    };
  } catch {
    if (retry) return isAceminingOnline(false);
    return false;
  }
};

export const getGlobalHashrate = async () => {
  try {

    const { estimated_global_hashrate } = (
      await axios.get("https://nimiq.mopsus.com/api/quick-stats", {
        timeout: 15000,
      })
    ).data;
    return Number(estimated_global_hashrate.toFixed(0));
  } catch (e) {
    console.log('Cannot get global hashrate');
    console.log(e.toString());
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

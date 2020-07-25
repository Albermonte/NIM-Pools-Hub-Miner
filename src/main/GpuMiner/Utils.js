exports.humanHashrate = function(hashes) {
  const thresh = 1000;
  const units = [
    "H/s",
    "kH/s",
    "MH/s",
    "GH/s",
    "TH/s",
    "PH/s",
    "EH/s",
    "ZH/s",
    "YH/s",
  ];
  let u = 0;
  while (Math.abs(hashes) >= thresh && u < units.length - 1) {
    hashes /= thresh;
    ++u;
  }
  return `${hashes.toFixed(hashes >= 100 ? 0 : hashes >= 10 ? 1 : 2)} ${
    units[u]
  }`;
};

exports.getDeviceOptions = function(argv) {
  const devices = Array.isArray(argv.devices) ? argv.devices : [];
  const memory = Array.isArray(argv.memory) ? argv.memory : [];
  const threads = Array.isArray(argv.threads) ? argv.threads : [];
  const cache = Array.isArray(argv.cache) ? argv.cache : [];
  const memoryTradeoff = Array.isArray(argv.memoryTradeoff)
    ? argv.memoryTradeoff
    : [];
  const jobs = Array.isArray(argv.jobs) ? argv.jobs : [];

  const getOption = (values, deviceIndex) => {
    if (values.length > 0) {
      const value =
        values.length === 1
          ? values[0]
          : values[
              devices.length === 0 ? deviceIndex : devices.indexOf(deviceIndex)
            ];
      if (Number.isInteger(value)) {
        return value;
      }
    }
    return undefined;
  };

  return {
    forDevice: (deviceIndex) => {
      const enabled = devices.length === 0 || devices.includes(deviceIndex);
      if (!enabled) {
        return {
          enabled: false,
        };
      }
      return {
        enabled: true,
        memory: getOption(memory, deviceIndex),
        threads: getOption(threads, deviceIndex),
        cache: getOption(cache, deviceIndex),
        memoryTradeoff: getOption(memoryTradeoff, deviceIndex),
        jobs: getOption(jobs, deviceIndex),
      };
    },
  };
};

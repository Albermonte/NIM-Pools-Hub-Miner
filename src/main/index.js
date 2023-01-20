import { constants, setPriority, cpus } from "os";

import * as Nimiq from "@nimiq/core";
import { battery, cpuTemperature, graphics } from "systeminformation";
import { app, BrowserWindow, ipcMain, dialog } from "electron";
import log from "electron-log"

import { Analytics } from "./analytics";

import SushiPoolCpuMiner from "./CpuMiner/SushiPoolCpuMiner.js";
import { humanHashes } from "./CpuMiner/Utils";

import NativeMiner from "./GpuMiner/NativeMiner";
import DumbPoolMiner from "./GpuMiner/DumbPoolMiner";
import { getDeviceOptions } from "./GpuMiner/Utils";

import checkPoolOnline, { getGlobalHashrate } from "./api";

import store from "../renderer/store";

import * as Sentry from "@sentry/electron";

Sentry.init({ dsn: "https://1e437d0b759040b09de59cbd274f67d7@o286629.ingest.sentry.io/4504531872251904" });

// Disable security warnings
process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== "development") {
  global.__static = require("path")
    .join(__dirname, "/static")
    .replace(/\\/g, "\\\\");
}

let mainWindow;
const winURL =
  process.env.NODE_ENV === "development"
    ? `http://localhost:9080`
    : `file://${__dirname}/index.html`;

function createWindow() {
  log.info("\n\n\n#################### Creating window ####################\n\n\n");
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    height: 560,
    width: process.env.NODE_ENV === "development" ? 1090 : 660,
    center: true,
    resizable: false,
    fullscreenable: false,
    frame: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      experimentalFeatures: true,
    },
  });
  if (process.env.NODE_ENV !== "development") mainWindow.removeMenu();

  log.info("Detecting UV_THREADPOOL_SIZE: " + process.env.UV_THREADPOOL_SIZE);

  if (!process.env.UV_THREADPOOL_SIZE) {
    process.env.UV_THREADPOOL_SIZE = 128;
    if (process.platform === "win32") {
      const Shell = require("node-powershell");
      let ps = new Shell({
        executionPolicy: "Bypass",
        noProfile: true,
      });
      const command =
        "[System.Environment]::SetEnvironmentVariable('UV_THREADPOOL_SIZE', 128, 'User')";
      ps.addCommand(command);
      ps.invoke()
        .then((output) => {
          console.log("Set UV_THREADPOOL_SIZE to 128")
          ps.dispose();
        })
        .catch((err) => {
          console.log(err);
          ps.dispose();
        });
    }
  } else {
    log(`Detected ${process.env.UV_THREADPOOL_SIZE} threadpool size`);
  }

  log.info("Nimiq initialization");
  Nimiq.GenesisConfig.main();

  store.dispatch("setAppVersion", app.getVersion());
  store.dispatch("setCpuHashrate", null);
  store.dispatch("setGpuHashrate", null);
  store.dispatch("setMiningCPU", false);
  store.dispatch("setMiningGPU", false);

  mainWindow.loadURL(winURL);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Disabled until Temperatures are reliable, getting 16ºC on my PC, thanks to wmic reporting bad temperatures
/* ipcMain.on("cpu-temp", async (event, arg) => {
  const temp = await cpuTemperature();
  console.log("CPU Temp: ", temp);
  event.reply("cpu-temp-reply", temp.main);
}); */

/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */

const { autoUpdater } = require("electron-updater");

autoUpdater.on("update-downloaded", () => {
  mainWindow.webContents.send("update-downloaded");
  setTimeout(() => autoUpdater.quitAndInstall(), 5000);
});

app.on("ready", () => {
  if (process.env.NODE_ENV === "production")
    autoUpdater.checkForUpdatesAndNotify();
  autoUpdater.logger = require("electron-log");
  autoUpdater.logger.transports.file.level = "info";
});

// Miner

const TAG = "Miner";
const $ = {};

const startMining = async (gpu = false) => {
  const priority = Object.entries(constants.priority)[
    store.state.settings.cpuPriority
  ];
  try {
    setPriority(priority[1]);
  } catch (error) {
    log.error("Set CPU Priority Failed: ", error);
  }

  const deviceName = store.state.settings.deviceName;
  const maxThreads = store.state.settings.cpuThreads;
  const userAddress = store.state.settings.address;
  const poolHost = store.state.settings.host;
  const poolPort = store.state.settings.port;

  log.info(TAG, `- GPU              = ${gpu}`);
  log.info(TAG, `- network          = main`);
  log.info(TAG, `- no. of threads   = ${maxThreads}`);
  log.info(TAG, `- pool server      = ${poolHost}:${poolPort}`);
  log.info(TAG, `- address          = ${userAddress}`);
  log.info(TAG, `- device name      = ${deviceName}`);

  const hashrate = gpu ? 200 : 50; // 100 kH/s by default
  const desiredSps = 5;
  const startDifficulty = (1e3 * hashrate * desiredSps) / (1 << 16);
  const minerVersion = `NPH Miner ${gpu ? "GPU" : "CPU"} ${app.getVersion()}`;
  const userAgent = `${minerVersion} (${Nimiq.PlatformUtils.userAgentString})`;
  const deviceData = {
    deviceName,
    startDifficulty,
    minerVersion,
    userAgent,
  };

  if (!gpu) {
    $.miner = new SushiPoolCpuMiner(userAddress, deviceData, maxThreads);
    $.miner.on("hashrate-changed", async (hashrates) => {
      const totalHashrate = hashrates.reduce((a, b) => a + b, 0);
      const temp = await cpuTemperature();
      log.info(TAG, `Hashrate: ${humanHashes(totalHashrate)}`);
      log.info(TAG, `CPU Temp: ${temp.main}`);
      try {
        store.dispatch("setCpuHashrate", humanHashes(totalHashrate));
      } catch (e) {
        log.error(e);
      }
    });
    $.miner.connect(poolHost, poolPort);

    $.miner.on("share", (nonce) => {
      log.info(TAG, `Found share. Nonce: ${nonce}`);
    });

    $.miner.on("pool-disconnected", function () {
      log.warn(TAG, `Lost connection with ${poolHost}.`);
    });

    $.miner.on("pool-balance", (balances) => {
      store.dispatch("setPoolBalance", balances);
    });
  } else {
    const vendor = (await graphics()).controllers[0].vendor;
    if (!vendor.includes("Advanced Micro Devices") && !vendor.includes("NVIDIA")) {
      mainWindow.webContents.send("no-gpu-alert");
    }
    const type = vendor.includes("NVIDIA") ? "cuda" : "opencl";
    log.info(`GPU Type: ${type}`);

    const argv = {
      memory: [store.state.settings.gpuMemory],
      threads: [store.state.settings.gpuThreads],
      cache: [store.state.settings.gpuCache],
      memoryTradeoff: [store.state.settings.gpuMemoryTradeoff],
      jobs: [store.state.settings.gpuJobs],
    };

    const deviceOptions = getDeviceOptions(argv);
    $.nativeMiner = new NativeMiner(type, deviceOptions);
    $.nativeMiner.on("hashrate-changed", (hashrates) => {
      const totalHashrate = hashrates.reduce((a, v) => a + (v || 0), 0);
      log.info(TAG, `Hashrate: ${humanHashes(totalHashrate)} | ${hashrates
        .map((hr, idx) => `GPU${idx}: ${humanHashes(hr)}`)
        .filter((hr) => hr)
        .join(" | ")}`)
      try {
        /* mainWindow.webContents.send(
          "hashrate-update",
          humanHashes(totalHashrate)
        ); */
        store.dispatch("setGpuHashrate", humanHashes(totalHashrate));
      } catch (e) { }
    });
    const deviceId = DumbPoolMiner.generateDeviceId();
    log.info(TAG, `- device id        = ${deviceId}`);

    $.minerGPU = new DumbPoolMiner(
      $.nativeMiner,
      Nimiq.Address.fromUserFriendlyAddress(userAddress),
      deviceId,
      deviceData
    );

    $.minerGPU.connect(poolHost, poolPort);

    $.minerGPU.on("share", (nonce) => {
      log.info(TAG, `Found share. Nonce: ${nonce}`);
    });

    $.minerGPU.on("pool-disconnected", function () {
      log.warn(TAG, `Lost connection with ${poolHost}.`);
    });

    $.minerGPU.on("pool-balance", (balances) => {
      store.dispatch("setPoolBalance", balances);
    });
  }
};

// Messages from render process

ipcMain.on("startMining", async (event, arg) => {
  startMining(arg.gpu);
});

ipcMain.on("stopMining", async (event, arg) => {
  store.dispatch("setPoolBalance", null);
  if (arg === "cpu") {
    if ($.miner) {
      $.miner.disconnect();
      delete $.miner;
      store.dispatch("setCpuHashrate", "0 kH/s");
    }
  } else {
    if ($.minerGPU) {
      $.minerGPU.disconnect();
      delete $.minerGPU;
    }
    if ($.nativeMiner) {
      $.nativeMiner.stop();
      delete $.nativeMiner;
      store.dispatch("setGpuHashrate", "0 kH/s");
    }
  }
});

ipcMain.on("poolOnline", async (event, arg) => {
  let pool = arg.toLowerCase();
  pool = pool.charAt(0).toUpperCase() + pool.slice(1);
  const online = await checkPoolOnline(pool);
  event.reply(`poolOnlineReply${arg}`, online);
});

ipcMain.on("getGlobalHashrate", async (event) => {
  const globalHashrate = await getGlobalHashrate();
  event.reply("getGlobalHashrateReply", globalHashrate);
});


process.on("uncaughtException", (err, origin) => {
  log.error("Uncaught Exception:");
  log.error(err);
  log.error(`On: ${origin}`);
});

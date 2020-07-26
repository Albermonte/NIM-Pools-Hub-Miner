import { cpus, hostname, constants, setPriority } from "os";
let maxThreads = Math.round(cpus().length / 1.25);

import * as Nimiq from "@nimiq/core";
import { battery, cpuTemperature, graphics } from "systeminformation";

import { app, BrowserWindow, ipcMain, dialog } from "electron";

import SushiPoolCpuMiner from "./CpuMiner/SushiPoolCpuMiner.js";
import { humanHashes } from "./CpuMiner/Utils";

import NativeMiner from "./GpuMiner/NativeMiner";
import DumbPoolMiner from "./GpuMiner/DumbPoolMiner";
import { getDeviceOptions } from "./GpuMiner/Utils";

import checkPoolOnline, { getGlobalHashrate } from "./api";

// Disable security warnings
process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";

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
    },
  });
  if (process.env.NODE_ENV !== "development") mainWindow.removeMenu();

  log("Detecting UV_THREADPOOL_SIZE: " + process.env.UV_THREADPOOL_SIZE);

  if (!process.env.UV_THREADPOOL_SIZE) {
    process.env.UV_THREADPOOL_SIZE = 128;
    if (process.platform === "win32") {
      const Shell = require("node-powershell");
      let ps = new Shell({
        executionPolicy: "Bypass",
        noProfile: true,
      });
      const command =
        "[Environment]::SetEnvironmentVariable('UV_THREADPOOL_SIZE', 128, 'User')";
      ps.addCommand(command);
      ps.invoke()
        .then((output) => {
          dialog.showMessageBox({
            type: "info",
            message:
              "First time setup completed. NIM Pools Hub Miner will now restart.",
          });
          app.relaunch();
          app.quit();
        })
        .catch((err) => {
          console.log(err);
          ps.dispose();
        });
    }
  } else {
    log(`Detected ${process.env.UV_THREADPOOL_SIZE} threadpool size`);
  }

  log("Nimiq initialization");
  Nimiq.GenesisConfig.main();

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

ipcMain.on("app-version", (event, arg) => {
  log("App Version: " + app.getVersion());
  event.reply("app-version-reply", app.getVersion());
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
  // TODO: Let user choose
  const priority = Object.entries(constants.priority)[5];
  setPriority(priority[1]);

  if (process.env.NODE_ENV === "production")
    autoUpdater.checkForUpdatesAndNotify();
  autoUpdater.logger = require("electron-log");
  autoUpdater.logger.transports.file.level = "info";
});

// Miner

const TAG = "Miner";
const $ = {};

Nimiq.Log.instance.level = "info";

const startMining = async (userAddress, poolHost, poolPort, gpu = false) => {
  // TODO: Let users set miner name on settings
  const deviceName = hostname();
  console.log("GPU: " + gpu);
  Nimiq.Log.i(TAG, `- network          = main`);
  Nimiq.Log.i(TAG, `- no. of threads   = ${maxThreads}`);
  Nimiq.Log.i(TAG, `- pool server      = ${poolHost}:${poolPort}`);
  Nimiq.Log.i(TAG, `- address          = ${userAddress}`);
  Nimiq.Log.i(TAG, `- device name      = ${deviceName}`);
  if (Nimiq.Log.instance.level === 3) {
    Nimiq.Log.w(TAG, `Debug mode has been enabled.`);
  }

  const hashrate = gpu ? 200 : 100; // 100 kH/s by default
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
    $.miner.on("hashrate-changed", (hashrates) => {
      const totalHashRate = hashrates.reduce((a, b) => a + b, 0);
      Nimiq.Log.i(TAG, `Hashrate: ${humanHashes(totalHashRate)}`);
      try {
        mainWindow.webContents.send(
          "hashrate-update",
          humanHashes(totalHashRate)
        );
      } catch (e) {}
    });
  } else {
    const vendor = (await graphics()).controllers[0].vendor;
    const type = vendor.includes("Advanced Micro Devices") ? "opencl" : "cuda";
    console.log(`GPU Type: ${type}`);

    const argv = { threads: [2], cache: [4], jobs: [8] };
    const deviceOptions = getDeviceOptions(argv);
    $.nativeMiner = new NativeMiner(type, deviceOptions);
    $.nativeMiner.on("hashrate-changed", (hashrates) => {
      const totalHashrate = hashrates.reduce((a, v) => a + (v || 0), 0);
      Nimiq.Log.i(
        TAG,
        `Hashrate: ${humanHashes(totalHashrate)} | ${hashrates
          .map((hr, idx) => `GPU${idx}: ${humanHashes(hr)}`)
          .filter((hr) => hr)
          .join(" | ")}`
      );
      try {
        mainWindow.webContents.send(
          "hashrate-update",
          humanHashes(totalHashrate)
        );
      } catch (e) {}
    });
    const deviceId = DumbPoolMiner.generateDeviceId();
    Nimiq.Log.i(TAG, `- device id        = ${deviceId}`);

    $.miner = new DumbPoolMiner(
      $.nativeMiner,
      Nimiq.Address.fromUserFriendlyAddress(userAddress),
      deviceId,
      deviceData
    );
  }

  $.miner.connect(poolHost, poolPort);

  $.miner.on("share", (nonce) => {
    Nimiq.Log.i(TAG, `Found share. Nonce: ${nonce}`);
  });

  $.miner.on("pool-disconnected", function() {
    Nimiq.Log.w(TAG, `Lost connection with ${poolHost}.`);
  });

  $.miner.on("pool-balance", (balances) => {
    try {
      mainWindow.webContents.send("pool-balance", balances);
    } catch (e) {}
  });
};

// Messages from render process

ipcMain.on("threads", (event, arg) => {
  maxThreads = arg;
});

ipcMain.on("startMining", async (event, arg) => {
  const batteryData = await battery();
  if (batteryData.hasbattery && !batteryData.ischarging)
    mainWindow.webContents.send("laptopNotChargin");
  startMining(arg.address, arg.host, arg.port, arg.gpu);
});

ipcMain.on("stopMining", () => {
  if ($.miner) {
    $.miner.disconnect();
    delete $.miner;
  }
  if ($.nativeMiner) {
    $.nativeMiner.stop();
    delete $.nativeMiner;
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

const log = (message) => {
  console.log(message);
  try {
    mainWindow.webContents.send("log", message);
  } catch (e) {}
};

process.on("uncaughtException", (err, origin) => {
  console.log("Uncaught Exception:");
  console.log(err);
  console.log(`On: ${origin}`);
});

const os = require('os');
let maxThreads = Math.round(os.cpus().length / 1.25);

const Nimiq = require('@nimiq/core');
const Utils = require('./miner/Utils');
import SushiPoolCpuMiner from './miner/SushiPoolCpuMiner.js';

const { app, BrowserWindow, ipcMain, dialog } = require('electron')


/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let mainWindow
const winURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`

function createWindow() {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    height: 560,
    width: process.env.NODE_ENV === 'development' ? 1000 : 570,
    center: true,
    resizable: false,
    fullscreenable: false,
    frame: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: true
    }
  })
  if (process.env.NODE_ENV !== 'development') mainWindow.removeMenu()

  console.log('Detecting UV_THREADPOOL_SIZE: ' + process.env.UV_THREADPOOL_SIZE)

  if (!process.env.UV_THREADPOOL_SIZE) {
    process.env.UV_THREADPOOL_SIZE = 128
    if (process.platform === 'win32') {
      const Shell = require('node-powershell')
      let ps = new Shell({
        executionPolicy: 'Bypass',
        noProfile: true
      })
      const command = "[Environment]::SetEnvironmentVariable('UV_THREADPOOL_SIZE', 128, 'User')"
      ps.addCommand(command)
      ps.invoke()
        .then(output => {
          dialog.showMessageBox({
            type: 'info',
            message: 'First time setup completed. NIM Pools Hub Miner will now restart.'
          })
          app.relaunch()
          app.quit()
        })
        .catch(err => {
          console.log(err)
          ps.dispose()
        })
    }
  } else {
    console.log(`Detected ${process.env.UV_THREADPOOL_SIZE} threadpool size`)
  }

  console.log('Nimiq initialization')
  Nimiq.GenesisConfig.main()

  mainWindow.loadURL(winURL)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

ipcMain.on('app-version', (event, arg) => {
  console.log('App Version: ' + app.getVersion());
  event.reply('app-version-reply', app.getVersion())
})

/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */


const { autoUpdater } = require("electron-updater")

autoUpdater.on('update-downloaded', () => {
  mainWindow.webContents.send('update-downloaded');
  setTimeout(() => autoUpdater.quitAndInstall(), 5000)
})

app.on('ready', () => {
  if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdatesAndNotify()
  autoUpdater.logger = require("electron-log")
  autoUpdater.logger.transports.file.level = "info"
})


// Miner

const TAG = 'Miner';
const $ = {};

Nimiq.Log.instance.level = 'info';

const startMining = async (userAddress, poolHost, poolPort) => {

  const deviceName = os.hostname();

  Nimiq.Log.i(TAG, `- network          = main`);
  Nimiq.Log.i(TAG, `- no. of threads   = ${maxThreads}`);
  Nimiq.Log.i(TAG, `- pool server      = ${poolHost}:${poolPort}`);
  Nimiq.Log.i(TAG, `- address          = ${userAddress}`);
  Nimiq.Log.i(TAG, `- device name      = ${deviceName}`);
  if (Nimiq.Log.instance.level === 3) {
    Nimiq.Log.w(TAG, `Debug mode has been enabled.`);
  }

  const hashrate = 100 // 100 kH/s by default
  const desiredSps = 5
  const startDifficulty = (1e3 * hashrate * desiredSps) / (1 << 16)

  const deviceData = { deviceName: 'test', startDifficulty, minerVersion: '0.0.1' }
  $.miner = new SushiPoolCpuMiner(userAddress, deviceData, maxThreads)

  $.miner.connect(poolHost, poolPort);

  $.miner.on('share', nonce => {
    Nimiq.Log.i(TAG, `Found share. Nonce: ${nonce}`)
  })

  $.miner.on('pool-disconnected', function () {
    Nimiq.Log.w(TAG, `Lost connection with ${poolHost}.`);
  });
  $.miner.on('pool-connected', function () {
    timeout = false;
  });

  $.miner.on('hashrate-changed', hashrates => {
    const totalHashRate = hashrates.reduce((a, b) => a + b, 0)
    Nimiq.Log.i(TAG, `Hashrate: ${Utils.humanHashes(totalHashRate)}`)
    try {
      mainWindow.webContents.send('hashrate-update', Utils.humanHashes(totalHashRate))
    } catch (e) { }
  });

  $.miner.on('pool-balance', balances => {
    try {
      mainWindow.webContents.send('pool-balance', balances)
    } catch (e) { }
  })
}

ipcMain.on('threads', (event, arg) => {
  maxThreads = arg
})

ipcMain.on('startMining', (event, arg) => {
  startMining(arg.address, arg.host, arg.port)
})

ipcMain.on('stopMining', () => {
  if ($.miner) {
    $.miner.disconnect()
    delete $.miner
  }
})

process.on('uncaughtException', (err, origin) => {
  console.log('Uncaught Exception:')
  console.log(err)
  console.log(`On: ${origin}`)
});
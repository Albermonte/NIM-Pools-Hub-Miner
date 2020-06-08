const os = require('os');
const maxThreads = os.cpus().length;

const Nimiq = require('@nimiq/core');
const SushiPoolCpuMiner = require('./miner/SushiPoolCpuMiner.js');
const Utils = require('./miner/Utils')

// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, dialog } = require('electron')

const path = require('path')

let mainWindow = null

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true
    }
  })

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
            message: 'First time setup completed. SushiPool Desktop Miner will now restart.'
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

  // and load the index.html of the app.
  mainWindow.loadFile('index.html')

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  console.log('Creating Main Window')
  createWindow()

  console.log('Nimiq initialization')
  Nimiq.GenesisConfig.main()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.


// Miner

const START = Date.now();
const TAG = 'SushiPool';
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

}

ipcMain.on('startMining', (event, arg) => {
  startMining(arg.address, arg.host, arg.port)
  //event.reply('asynchronous-reply', 'pong')
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
// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.
const { ipcRenderer } = require('electron');

const startMining = () => {
    document.getElementById('startMiningButton').style.display = "none";
    document.getElementById('stopMiningButton').style.display = "inline";
    const address = document.getElementById('address').value;
    const host = document.getElementById('host').value;
    const port = document.getElementById('port').value;
    if (address === '' || host === '' || port === '') {
        alert('Fill all the inputs')
        return
    } else {
        ipcRenderer.send('startMining', {
            address,
            host,
            port
        });
    }
}

const stopMining = () => {
    document.getElementById('stopMiningButton').style.display = "none";
    document.getElementById('startMiningButton').style.display = "inline";
    document.getElementById('hashrate').innerHTML = '0 kH/s'
    ipcRenderer.send('stopMining');
}

ipcRenderer.on('hashrate-update', (event, message) => {
    document.getElementById('hashrate').innerHTML = message
})

document.getElementById('startMiningButton').addEventListener("click", startMining);
document.getElementById('stopMiningButton').addEventListener("click", stopMining);
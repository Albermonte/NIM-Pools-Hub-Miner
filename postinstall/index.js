const { exec } = require("child_process");
const os = require("os");
const fs = require("fs");
const Windows = require.resolve("./postinstall.bat");
const LinuxAndMac = require.resolve("./postinstall.sh");

fs.chmodSync(LinuxAndMac, "755");

const log = (error, stdout, stderr) => {
  if (error) {
    console.log(`error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.log(`stderr: ${stderr}`);
    return;
  }
  console.log(`stdout: ${stdout}`);
};

const osType = os.type();

console.log(`Optimizing build for ${osType}, this will take some time`);

if (osType === "Linux") exec(LinuxAndMac, log);
else if (osType === "Darwin") exec(LinuxAndMac, log);
else if (osType === "Windows_NT") exec(Windows, log);
else throw new Error("Unsupported OS found: " + osType);

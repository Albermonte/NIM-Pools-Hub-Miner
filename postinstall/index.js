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

console.log("OS Type: " + os.type());

if (os.type() === "Linux") exec(LinuxAndMac, log);
else if (os.type() === "Darwin") exec(LinuxAndMac, log);
else if (os.type() === "Windows_NT") exec(Windows, log);
else throw new Error("Unsupported OS found: " + os.type());

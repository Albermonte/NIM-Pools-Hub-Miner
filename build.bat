RMDIR /Q/S "node_modules"

cd build

del .\nim-pools-hub-miner-win32-x64.zip

cd ..

CALL npm i

CALL npm run build

CALL Powershell.exe Compress-Archive -Path .\build\win-unpacked\* -DestinationPath .\build\nim-pools-hub-miner-win32-x64.zip
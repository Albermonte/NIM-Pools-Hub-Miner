:: This has to be run automatically after npm i, no need to do it manually

@echo off

del /F/Q ".\binding.gyp"
del /F/Q ".\build\*"
del /F/Q ".\src\main\GpuMiner\nimiq_miner_cuda.node"
del /F/Q ".\src\main\GpuMiner\nimiq_miner_opencl.node"

RMDIR /Q/S ".\build\Release"

echo Running Windows Postinstall

xcopy /y ".\bindings\SushiPool_binding.gyp" ".\node_modules\@nimiq\core\binding.gyp"
xcopy /y ".\bindings\NQMiner_binding.gyp" ".\binding.gyp*"
:: xcopy /y ".\bindings\Albermonte_binding.gyp" ".\node_modules\node-lmdb\binding.gyp"
:: xcopy /y ".\bindings\Albermonte_binding.gyp" ".\node_modules\@nimiq\jungle-db\node_modules\node-lmdb\binding.gyp"

CALL npm rebuild

CALL .\node_modules\.bin\electron-rebuild.cmd

xcopy /y ".\build\Release\nimiq_miner_cuda.node" ".\src\main\GpuMiner\nimiq_miner_cuda.node*"
xcopy /y ".\build\Release\nimiq_miner_opencl.node" ".\src\main\GpuMiner\nimiq_miner_opencl.node*"

del /F/Q ".\build\*"
RMDIR /Q/S ".\build\Release"
del /F/Q ".\binding.gyp"

:: compact: that works on all CPUs
:: sse2: works on most CPUs
:: avx2: works on new CPUs
:: avx512f: works on newest Intel processors (>=Skylake-SP)
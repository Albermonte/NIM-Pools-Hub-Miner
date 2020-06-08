:: This has to be run automatically after npm i, no need to do it manually

@echo off

xcopy /y ".\bindings\SushiPool_binding.gyp" ".\node_modules\@nimiq\core\binding.gyp"
xcopy /y ".\bindings\Albermonte_binding.gyp" ".\node_modules\node-lmdb\binding.gyp"
xcopy /y ".\bindings\Albermonte_binding.gyp" ".\node_modules\@nimiq\jungle-db\node_modules\node-lmdb\binding.gyp"

CALL npm rebuild

CALL .\node_modules\.bin\electron-rebuild.cmd

:: compact: that works on all CPUs
:: sse2: works on most CPUs
:: avx2: works on new CPUs
:: avx512f: works on newest Intel processors (>=Skylake-SP)
rm -rf "./build/*"

cp "./bindings/SushiPool_binding.gyp" "./node_modules/@nimiq/core/binding.gyp"
cp "./bindings/NQMiner_binding.gyp" "./binding.gyp"

npm rebuild

$(npm bin)/electron-rebuild

cp "./build/Release/nimiq_miner_cuda.node" "./src/main/GpuMiner/modules/nimiq_miner_cuda.node"
cp "./build/Release/nimiq_miner_opencl.node" "./src/main/GpuMiner/modules/nimiq_miner_opencl.node"

rm "./binding.gyp"
rm -rf "./build/*"

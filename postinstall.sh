cp "./bindings/SushiPool_binding.gyp" "./node_modules/@nimiq/core/binding.gyp"
cp "./bindings/Albermonte_binding.gyp" "./node_modules/node-lmdb/binding.gyp"
cp "./bindings/Albermonte_binding.gyp" "./node_modules/@nimiq/jungle-db/node_modules/node-lmdb/binding.gyp"

npm rebuild

$(npm bin)/electron-rebuild
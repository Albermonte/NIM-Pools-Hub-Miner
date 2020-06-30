cp "./bindings/SushiPool_binding.gyp" "./node_modules/@nimiq/core/binding.gyp"

npm rebuild

$(npm bin)/electron-rebuild
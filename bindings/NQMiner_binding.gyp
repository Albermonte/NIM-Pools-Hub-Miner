{
    'targets': [{
        'target_name': 'nimiq_miner_opencl',
        'sources': [
            'src/native/miner.cc'
        ],
        'include_dirs': [
            '<!(node -e "require(\'nan\')")'
        ],
        'conditions': [
            ['OS=="win"', {
                'variables': {
                    'CUDA_PATH': 'C:\\Program Files\\NVIDIA GPU Computing Toolkit\\CUDA\\v11.0'
                },
                'include_dirs': [
                    '<(CUDA_PATH)/include'
                ],
                'libraries': [
                    '-lOpenCL'
                ],
                'library_dirs': [
                    '<(CUDA_PATH)/lib/x64'
                ],
                'defines': [
                    'VC_EXTRALEAN'
                ],
                'cflags_cc': ['-Wall', '-O3', '-fexceptions']
            }],
            ['OS=="linux"', {
                'variables': {
                    'CUDA_PATH': '<!(echo $CUDA_PATH)'
                },
                'include_dirs': [
                    '<(CUDA_PATH)/include'
                ],
                'libraries': [
                    '-lOpenCL'
                ],
                'library_dirs': [
                    '<(CUDA_PATH)/lib64'
                ],
                'cflags_cc': ['-Wall', '-std=c++11', '-O3', '-fexceptions']
            }],
        ]
    }]
}

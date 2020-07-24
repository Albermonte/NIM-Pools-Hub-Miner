#ifndef MINER_H_
#define MINER_H_

#include <stdint.h>

#define ONE_GB (1 << 30)
#define ONE_MB (1 << 20)
#define ONE_KB (1 << 10)

#define ARGON2_BLOCK_SIZE 1024
#define ARGON2_HASH_LENGTH 32

#define THREADS_PER_LANE 32

#define NIMIQ_ARGON2_SALT "nimiqrocks!"
#define NIMIQ_ARGON2_SALT_LEN 11
#define NIMIQ_ARGON2_COST 512

#ifdef _WIN32
#pragma pack(push, 1)
#endif

struct
#ifndef _WIN32
    __attribute__((packed))
#endif
    nimiq_block_header
{
    // Big endian
    uint16_t version;
    uint8_t prev_hash[32];
    uint8_t interlink_hash[32];
    uint8_t body_hash[32];
    uint8_t accounts_hash[32];
    uint32_t nbits;
    uint32_t height;
    uint32_t timestamp;
    uint32_t nonce;
};

struct
#ifndef _WIN32
    __attribute__((packed))
#endif
    initial_seed
{
    uint32_t lanes;
    uint32_t hash_len;
    uint32_t memory_cost;
    uint32_t iterations;
    uint32_t version;
    uint32_t type;
    uint32_t header_len;
    nimiq_block_header header;
    uint32_t salt_len;
    uint8_t salt[NIMIQ_ARGON2_SALT_LEN];
    uint32_t secret_len;
    uint32_t extra_len;
    uint8_t padding[59];
};

#ifdef _WIN32
#pragma pack(pop)
#endif

#endif /* MINER_H_ */

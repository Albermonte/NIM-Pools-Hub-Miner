/*
* Blake2b
* based on reference implementation https://github.com/BLAKE2/BLAKE2
*/

#include <string>

std::string srcBlake2b{R"====(
#define ARGON2_HASH_LENGTH 32

#define BLAKE2B_HASH_LENGTH 64
#define BLAKE2B_BLOCK_SIZE 128
#define BLAKE2B_QWORDS_IN_BLOCK (BLAKE2B_BLOCK_SIZE / 8)

#define ARGON2_INITIAL_SEED_SIZE 197
#define ARGON2_PREHASH_SEED_SIZE 76

#define IV0 0x6a09e667f3bcc908UL
#define IV1 0xbb67ae8584caa73bUL
#define IV2 0x3c6ef372fe94f82bUL
#define IV3 0xa54ff53a5f1d36f1UL
#define IV4 0x510e527fade682d1UL
#define IV5 0x9b05688c2b3e6c1fUL
#define IV6 0x1f83d9abfb41bd6bUL
#define IV7 0x5be0cd19137e2179UL

#define SWAP64(n) (as_ulong(as_uchar8(n).s76543210))

constant uint sigma[12][16] = {
  {0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15},
  {14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3},
  {11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4},
  {7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8},
  {9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13},
  {2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9},
  {12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11},
  {13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10},
  {6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5},
  {10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0},
  {0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15},
  {14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3},
};

void blake2b_init(ulong *h, uint hashlen)
{
  h[0] = IV0 ^ (0x01010000 | hashlen);
  h[1] = IV1;
  h[2] = IV2;
  h[3] = IV3;
  h[4] = IV4;
  h[5] = IV5;
  h[6] = IV6;
  h[7] = IV7;
}

#define G(i, a, b, c, d)                \
  do {                                  \
    a = a + b + m[sigma[r][2 * i]];     \
    d = rotr_32(d ^ a);                 \
    c = c + d;                          \
    b = rotr_24(b ^ c);                 \
    a = a + b + m[sigma[r][2 * i + 1]]; \
    d = rotr_16(d ^ a);                 \
    c = c + d;                          \
    b = rotr_63(b ^ c);                 \
  } while(0)

#define ROUND()                      \
  do {                               \
    G(0, v[0], v[4], v[8], v[12]);   \
    G(1, v[1], v[5], v[9], v[13]);   \
    G(2, v[2], v[6], v[10], v[14]);  \
    G(3, v[3], v[7], v[11], v[15]);  \
    G(4, v[0], v[5], v[10], v[15]);  \
    G(5, v[1], v[6], v[11], v[12]);  \
    G(6, v[2], v[7], v[8], v[13]);   \
    G(7, v[3], v[4], v[9], v[14]);   \
  } while(0)

void blake2b_compress(ulong *h, ulong *m, uint bytes_compressed, bool last_block)
{
  ulong v[BLAKE2B_QWORDS_IN_BLOCK];

  v[0] = h[0];
  v[1] = h[1];
  v[2] = h[2];
  v[3] = h[3];
  v[4] = h[4];
  v[5] = h[5];
  v[6] = h[6];
  v[7] = h[7];
  v[8] = IV0;
  v[9] = IV1;
  v[10] = IV2;
  v[11] = IV3;
  v[12] = IV4 ^ bytes_compressed;
  v[13] = IV5; // it's OK if below 2^32 bytes
  v[14] = last_block ? ~IV6 : IV6;
  v[15] = IV7;

  #pragma unroll
  for(int r = 0; r < 12; r++)
  {
    ROUND();
  }

  h[0] = h[0] ^ v[0] ^ v[8];
  h[1] = h[1] ^ v[1] ^ v[9];
  h[2] = h[2] ^ v[2] ^ v[10];
  h[3] = h[3] ^ v[3] ^ v[11];
  h[4] = h[4] ^ v[4] ^ v[12];
  h[5] = h[5] ^ v[5] ^ v[13];
  h[6] = h[6] ^ v[6] ^ v[14];
  h[7] = h[7] ^ v[7] ^ v[15];
}

void set_nonce(ulong *inseed, uint nonce)
{
  // bytes 170-173
  ulong n = as_uint(as_uchar4(nonce).s3210);
  inseed[21] = inseed[21] | (n << 16);
}

void initial_hash(ulong *hash, global ulong *inseed, uint nonce)
{
  ulong is[32];
#pragma unroll
  for (uint i = 0; i < 32; i++)
  {
    is[i] = inseed[i];
  }
  set_nonce(is, nonce);

  blake2b_init(hash, BLAKE2B_HASH_LENGTH);
  blake2b_compress(hash, &is[0], BLAKE2B_BLOCK_SIZE, false);
  blake2b_compress(hash, &is[BLAKE2B_QWORDS_IN_BLOCK], ARGON2_INITIAL_SEED_SIZE, true);
}

void fill_first_block(global struct block_g *memory, global ulong *inseed, uint nonce, uint block)
{
  ulong hash[8];
  initial_hash(hash, inseed, nonce);

  uint prehash_seed[32] = {0};
  prehash_seed[0] = ARGON2_BLOCK_SIZE;
  #pragma unroll
  for (uint i = 0; i < 8; i++)
  {
    prehash_seed[2 * i + 1] = (uint) hash[i];
    prehash_seed[2 * i + 2] = (uint) (hash[i] >> 32);
  }
  prehash_seed[17] = block;

  ulong buffer[BLAKE2B_QWORDS_IN_BLOCK] = {0};

  // V1
  blake2b_init(hash, BLAKE2B_HASH_LENGTH);
  blake2b_compress(hash, (ulong*) &prehash_seed, ARGON2_PREHASH_SEED_SIZE, true);

  memory->data[0] = hash[0];
  memory->data[1] = hash[1];
  memory->data[2] = hash[2];
  memory->data[3] = hash[3];

  // V2-Vr
  for (uint r = 1; r < 2 * ARGON2_BLOCK_SIZE / BLAKE2B_HASH_LENGTH - 1; r++)
  {
    buffer[0] = hash[0];
    buffer[1] = hash[1];
    buffer[2] = hash[2];
    buffer[3] = hash[3];
    buffer[4] = hash[4];
    buffer[5] = hash[5];
    buffer[6] = hash[6];
    buffer[7] = hash[7];

    blake2b_init(hash, BLAKE2B_HASH_LENGTH);
    blake2b_compress(hash, buffer, BLAKE2B_HASH_LENGTH, true);

    uint idx = ((r & 0x3) << 5) | (r & 0x1c);
    memory->data[0 + idx] = hash[0];
    memory->data[1 + idx] = hash[1];
    memory->data[2 + idx] = hash[2];
    memory->data[3 + idx] = hash[3];
  }

  memory->data[124] = hash[4];
  memory->data[125] = hash[5];
  memory->data[126] = hash[6];
  memory->data[127] = hash[7];
}

void compact_to_target(uint share_compact, ulong *target)
{
  uint offset = (share_compact >> 24) - 3; // offset in bytes
  ulong value = share_compact & 0xFFFFFF;
  ulong hi = value >> ((8 - offset & 0x7) << 3);
  ulong lo = value << ((offset & 0x7) << 3); // value << (8 * (offset % 8))

  target[0] = (offset >= 24) ? lo : (offset > 20) ? hi : 0;
  target[1] = (offset >= 24) ? 0 : (offset >= 16) ? lo : (offset > 12) ? hi : 0;
  target[2] = (offset >= 16) ? 0 : (offset >= 8) ? lo : (offset > 4) ? hi : 0;
  target[3] = (offset < 8) ? lo : 0;
}

bool is_proof_of_work(ulong *hash, ulong *target)
{
  #pragma unroll
  for (uint i = 0; i < 4; i++)
  {
    if (SWAP64(hash[i]) < target[i]) return true;
    if (SWAP64(hash[i]) > target[i]) return false;
  }
  return true;
}

void hash_last_block(global struct block_g *memory, ulong *hash)
{
  ulong buffer[BLAKE2B_QWORDS_IN_BLOCK];
  uint i, hi, lo;
  uint bytes_compressed = 0;
  uint bytes_remaining = ARGON2_BLOCK_SIZE;
  global uint *src = (global uint*) memory->data;

  blake2b_init(hash, ARGON2_HASH_LENGTH);

  hi = *(src++);
  buffer[0] = ARGON2_HASH_LENGTH | ((ulong) hi << 32);

  #pragma unroll
  for (i = 1; i < BLAKE2B_QWORDS_IN_BLOCK; i++)
  {
    lo = *(src++);
    hi = *(src++);
    buffer[i] = lo | ((ulong) hi << 32);
  }

  bytes_compressed += BLAKE2B_BLOCK_SIZE;
  bytes_remaining -= (BLAKE2B_BLOCK_SIZE - sizeof(uint));
  blake2b_compress(hash, buffer, bytes_compressed, false);

  while (bytes_remaining > BLAKE2B_BLOCK_SIZE)
  {
    #pragma unroll
    for (i = 0; i < BLAKE2B_QWORDS_IN_BLOCK; i++)
    {
      lo = *(src++);
      hi = *(src++);
      buffer[i] = lo | ((ulong) hi << 32);
    }
    bytes_compressed += BLAKE2B_BLOCK_SIZE;
    bytes_remaining -= BLAKE2B_BLOCK_SIZE;
    blake2b_compress(hash, buffer, bytes_compressed, false);
  }

  buffer[0] = *src;
  #pragma unroll
  for (i = 1; i < BLAKE2B_QWORDS_IN_BLOCK; i++)
  {
    buffer[i] = 0;
  }
  bytes_compressed += bytes_remaining;
  blake2b_compress(hash, buffer, bytes_compressed, true);
}


__kernel
__attribute__((reqd_work_group_size(128, 2, 1)))
void init_memory(global struct block_g *memory, global ulong *inseed, uint start_nonce)
{
  uint job_id = get_global_id(0);
  uint nonce = start_nonce + job_id;
  uint nonces_per_run = get_global_size(0);

  uint block = get_local_id(1);
  memory += job_id + block * nonces_per_run;
  fill_first_block(memory, inseed, nonce, block);
}

__kernel
__attribute__((reqd_work_group_size(256, 1, 1)))
void get_nonce(global struct block_g *memory, uint start_nonce, uint share_compact, global uint *nonce_found)
{
  uint job_id = get_global_id(0);
  uint nonce = start_nonce + job_id;
  uint nonces_per_run = get_global_size(0);

  ulong hash[8];
  ulong target[4];

  memory += job_id + nonces_per_run * (MEMORY_COST - 1);

  compact_to_target(share_compact, target);
  hash_last_block(memory, hash);

  if (is_proof_of_work(hash, target))
  {
    atomic_cmpxchg(nonce_found, 0, nonce);
  }
}
)===="};

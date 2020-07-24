/*
MIT License

Copyright (c) 2016 Ondrej Mosnáček

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

/*
* Argon2d
* Simplified and refactored version of https://gitlab.com/omos/argon2-gpu
*/

#include "kernels.h"

struct block_th
{
    uint64_t a, b, c, d;
};

__device__ void move_block(struct block_th *dst, const struct block_th *src)
{
    *dst = *src;
}

__device__ void xor_block(struct block_th *dst, const struct block_th *src)
{
    dst->a ^= src->a;
    dst->b ^= src->b;
    dst->c ^= src->c;
    dst->d ^= src->d;
}

__device__ void load_block_cache(struct block_th *dst, const struct block_g *src, uint32_t thread)
{
    dst->a = src->data[0 * THREADS_PER_LANE + thread];
    dst->b = src->data[1 * THREADS_PER_LANE + thread];
    dst->c = src->data[2 * THREADS_PER_LANE + thread];
    dst->d = src->data[3 * THREADS_PER_LANE + thread];
}

__device__ void load_block_global(struct block_th *dst, const struct block_g *src, uint32_t thread)
{
    ulonglong2 *u128 = (ulonglong2*) src->data;
    asm("ld.global.ca.v2.u64 {%0, %1}, [%2];" : "=l"(dst->a), "=l"(dst->b) : "l"(&u128[0 * THREADS_PER_LANE + thread]));
    asm("ld.global.ca.v2.u64 {%0, %1}, [%2];" : "=l"(dst->c), "=l"(dst->d) : "l"(&u128[1 * THREADS_PER_LANE + thread]));
}

__device__ void store_block_cache(struct block_g *dst, const struct block_th *src, uint32_t thread)
{
    dst->data[0 * THREADS_PER_LANE + thread] = src->a;
    dst->data[1 * THREADS_PER_LANE + thread] = src->b;
    dst->data[2 * THREADS_PER_LANE + thread] = src->c;
    dst->data[3 * THREADS_PER_LANE + thread] = src->d;
}

__device__ void store_block_global(struct block_g *dst, const struct block_th *src, uint32_t thread)
{
    asm("st.global.wb.v2.u64 [%0], {%1, %2};" :: "l"(&dst->data[0 * THREADS_PER_LANE + 2 * thread]), "l"(src->a), "l"(src->b));
    asm("st.global.wb.v2.u64 [%0], {%1, %2};" :: "l"(&dst->data[2 * THREADS_PER_LANE + 2 * thread]), "l"(src->c), "l"(src->d));
}

__device__ void g(struct block_th *block)
{
    asm("{"
        ".reg .u64 s, x;"
        ".reg .u32 l1, l2, h1, h2;"
        // a = f(a, b);
        "add.u64 s, %0, %1;"            // s = a + b
        "cvt.u32.u64 l1, %0;"           // xlo = u64_lo(a)
        "cvt.u32.u64 l2, %1;"           // ylo = u64_lo(b)
        "mul.hi.u32 h1, l1, l2;"        // umulhi(xlo, ylo)
        "mul.lo.u32 l1, l1, l2;"        // xlo * ylo
        "mov.b64 x, {l1, h1};"          // x = u64_build(umulhi(xlo, ylo), xlo * ylo)
        "shl.b64 x, x, 1;"              // x = 2 * x
        "add.u64 %0, s, x;"             // a = s + x
        // d = rotr64(d ^ a, 32);
        "xor.b64 x, %3, %0;"
        "mov.b64 {h2, l2}, x;"
        "mov.b64 %3, {l2, h2};"         // swap hi and lo = rotr64(x, 32)
        // c = f(c, d);
        "add.u64 s, %2, %3;"
        "cvt.u32.u64 l1, %2;"
        "mul.hi.u32 h1, l1, l2;"
        "mul.lo.u32 l1, l1, l2;"
        "mov.b64 x, {l1, h1};"
        "shl.b64 x, x, 1;"
        "add.u64 %2, s, x;"
        // b = rotr64(b ^ c, 24);
        "xor.b64 x, %1, %2;"
        "mov.b64 {l1, h1}, x;"
        "prmt.b32 l2, l1, h1, 0x6543;"  // permute bytes 76543210 => 21076543
        "prmt.b32 h2, l1, h1, 0x2107;"  // rotr64(x, 24)
        "mov.b64 %1, {l2, h2};"
        // a = f(a, b);
        "add.u64 s, %0, %1;"
        "cvt.u32.u64 l1, %0;"
        "mul.hi.u32 h1, l1, l2;"
        "mul.lo.u32 l1, l1, l2;"
        "mov.b64 x, {l1, h1};"
        "shl.b64 x, x, 1;"
        "add.u64 %0, s, x;"
        // d = rotr64(d ^ a, 16);
        "xor.b64 x, %3, %0;"
        "mov.b64 {l1, h1}, x;"
        "prmt.b32 l2, l1, h1, 0x5432;"  // permute bytes 76543210 => 10765432
        "prmt.b32 h2, l1, h1, 0x1076;"  // rotr64(x, 16)
        "mov.b64 %3, {l2, h2};"
        // c = f(c, d);
        "add.u64 s, %2, %3;"
        "cvt.u32.u64 l1, %2;"
        "mul.hi.u32 h1, l1, l2;"
        "mul.lo.u32 l1, l1, l2;"
        "mov.b64 x, {l1, h1};"
        "shl.b64 x, x, 1;"
        "add.u64 %2, s, x;"
        // b = rotr64(b ^ c, 63);
        "xor.b64 x, %1, %2;"
        "shl.b64 s, x, 1;"              // x << 1
        "shr.b64 x, x, 63;"             // x >> 63
        "add.u64 %1, s, x;"             // emits less instructions than "or"
        "}"
        : "+l"(block->a), "+l"(block->b), "+l"(block->c), "+l"(block->d)
    );
}

__device__ void transpose1(struct block_th *block, uint32_t thread)
{
    uint32_t src_thr = (thread ^ 0x2);
    uint32_t g2 = (thread & 0x2);
    uint32_t g4 = (thread & 0x4);

    uint64_t xab = __shfl_sync(0xFFFFFFFF, g2 ? block->a : block->b, src_thr);
    uint64_t xcd = __shfl_sync(0xFFFFFFFF, g2 ? block->c : block->d, src_thr);

    uint64_t xa = g2 ? xab : block->a;
    uint64_t xc = g2 ? xcd : block->c;
    uint64_t xac = __shfl_xor_sync(0xFFFFFFFF, g4 ? xa : xc, 0x4);

    uint64_t xb = g2 ? block->b : xab;
    uint64_t xd = g2 ? block->d : xcd;
    uint64_t xbd = __shfl_xor_sync(0xFFFFFFFF, g4 ? xb : xd, 0x4);

    block->a = g4 ? xac : xa;
    block->b = g4 ? xbd : xb;
    block->c = g4 ? xc : xac;
    block->d = g4 ? xd : xbd;
}

__device__ void transpose2(struct block_th *block, uint32_t thread)
{
    uint32_t src_thr = (thread ^ 0x10);
    uint32_t g4 = (thread & 0x4);
    uint32_t g16 = (thread & 0x10);

    uint64_t xac = __shfl_xor_sync(0xFFFFFFFF, g4 ? block->a : block->c, 0x4);
    uint64_t xbd = __shfl_xor_sync(0xFFFFFFFF, g4 ? block->b : block->d, 0x4);

    uint64_t xa = g4 ? xac : block->a;
    uint64_t xb = g4 ? xbd : block->b;
    uint64_t xab = __shfl_sync(0xFFFFFFFF, g16 ? xa : xb, src_thr);

    uint64_t xc = g4 ? block->c : xac;
    uint64_t xd = g4 ? block->d : xbd;
    uint64_t xcd = __shfl_sync(0xFFFFFFFF, g16 ? xc : xd, src_thr);

    block->a = g16 ? xab : xa;
    block->b = g16 ? xb : xab;
    block->c = g16 ? xcd : xc;
    block->d = g16 ? xd : xcd;
}

__device__ void transpose3(struct block_th *block, uint32_t thread)
{
    uint32_t src_thr1 = (thread ^ 0x10);
    uint32_t src_thr2 = (thread ^ 0x2);
    uint32_t g2 = (thread & 0x2);
    uint32_t g16 = (thread & 0x10);

    uint64_t xab = __shfl_sync(0xFFFFFFFF, g16 ? block->a : block->b, src_thr1);
    uint64_t xcd = __shfl_sync(0xFFFFFFFF, g16 ? block->c : block->d, src_thr1);

    uint64_t xa = g16 ? xab : block->a;
    uint64_t xb = g16 ? block->b : xab;
    uint64_t xc = g16 ? xcd : block->c;
    uint64_t xd = g16 ? block->d : xcd;

    xab = __shfl_sync(0xFFFFFFFF, g2 ? xa : xb, src_thr2);
    xcd = __shfl_sync(0xFFFFFFFF, g2 ? xc : xd, src_thr2);

    block->a = g2 ? xab : xa;
    block->b = g2 ? xb : xab;
    block->c = g2 ? xcd : xc;
    block->d = g2 ? xd : xcd;
}

__device__ void shift1_shuffle(struct block_th *block, uint32_t thread)
{
    uint32_t mask = (thread & 0x2) >> 1;
    uint32_t src_thr_b = thread ^ mask ^ 0x2;
    uint32_t src_thr_d = thread ^ mask ^ 0x3;

    block->b = __shfl_sync(0xFFFFFFFF, block->b, src_thr_b, 0x4);
    block->c = __shfl_xor_sync(0xFFFFFFFF, block->c, 0x1, 0x4);
    block->d = __shfl_sync(0xFFFFFFFF, block->d, src_thr_d, 0x4);
}

__device__ void unshift1_shuffle(struct block_th *block, uint32_t thread)
{
    uint32_t mask = (thread & 0x2) >> 1;
    uint32_t src_thr_b = thread ^ mask ^ 0x3;
    uint32_t src_thr_d = thread ^ mask ^ 0x2;

    block->b = __shfl_sync(0xFFFFFFFF, block->b, src_thr_b, 0x4);
    block->c = __shfl_xor_sync(0xFFFFFFFF, block->c, 0x1, 0x4);
    block->d = __shfl_sync(0xFFFFFFFF, block->d, src_thr_d, 0x4);
}

__device__ void shift2_shuffle(struct block_th *block, uint32_t thread)
{
    uint32_t src_thr_b = thread ^ (((thread & 0x2) << 2) | 0x2);
    uint32_t src_thr_d = thread ^ (((~thread & 0x2) << 2) | 0x2);

    block->b = __shfl_sync(0xFFFFFFFF, block->b, src_thr_b);
    block->c = __shfl_xor_sync(0xFFFFFFFF, block->c, 0x8);
    block->d = __shfl_sync(0xFFFFFFFF, block->d, src_thr_d);
}

__device__ void unshift2_shuffle(struct block_th *block, uint32_t thread)
{
    uint32_t src_thr_b = thread ^ (((~thread & 0x2) << 2) | 0x2);
    uint32_t src_thr_d = thread ^ (((thread & 0x2) << 2) | 0x2);

    block->b = __shfl_sync(0xFFFFFFFF, block->b, src_thr_b);
    block->c = __shfl_xor_sync(0xFFFFFFFF, block->c, 0x8);
    block->d = __shfl_sync(0xFFFFFFFF, block->d, src_thr_d);
}

__device__ void shuffle_block(struct block_th *block, uint32_t thread)
{
    transpose1(block, thread);

    g(block);

    shift1_shuffle(block, thread);

    g(block);

    unshift1_shuffle(block, thread);
    transpose2(block, thread);

    g(block);

    shift2_shuffle(block, thread);

    g(block);

    unshift2_shuffle(block, thread);
    transpose3(block, thread);
}

__device__ uint32_t compute_ref_index(struct block_th *prev, uint32_t curr_index)
{
    uint32_t ref_index = __shfl_sync(0xFFFFFFFF, (uint32_t) prev->a, 0);

    uint32_t ref_area_size = curr_index - 1;
    ref_index = __umulhi(ref_index, ref_index);
    ref_index = ref_area_size - 1 - __umulhi(ref_area_size, ref_index);
    return ref_index;
}

__global__ void argon2(struct block_g *memory, uint32_t cache_size, uint32_t memory_tradeoff)
{
    extern __shared__ struct block_g cache[];
    // ref_index of the current block, -1 if current block is stored to global mem
    __shared__ uint16_t ref_indexes[MEMORY_COST];

    uint32_t job_id = blockIdx.y;
    uint32_t thread = threadIdx.x;

    // select job's memory region
    memory += (size_t)job_id * MEMORY_COST;

    struct block_th prev_prev, prev, ref, tmp;
    bool is_stored = true;
    load_block_global(&tmp, memory, thread);
    load_block_global(&prev, memory + 1, thread);

    // cache first block
    store_block_cache(&cache[0], &tmp, thread);
    uint32_t curr_cache_pos = 1;

    ((uint64_t*) ref_indexes)[0 * THREADS_PER_LANE + thread] = (uint64_t) -1;
    ((uint64_t*) ref_indexes)[1 * THREADS_PER_LANE + thread] = (uint64_t) -1;
    ((uint64_t*) ref_indexes)[2 * THREADS_PER_LANE + thread] = (uint64_t) -1;
    ((uint64_t*) ref_indexes)[3 * THREADS_PER_LANE + thread] = (uint64_t) -1;

    for (uint32_t curr_index = 2; curr_index < MEMORY_COST; curr_index++)
    {
        move_block(&prev_prev, &prev);

        uint32_t ref_index = compute_ref_index(&prev, curr_index);
        uint32_t ref_ref_index = ref_indexes[ref_index];

        uint32_t ref_offset = curr_index - ref_index;
        if (ref_offset <= cache_size + 1)
        {
            uint32_t ref_cache_pos = curr_cache_pos + (cache_size + 1 - ref_offset);
            ref_cache_pos = (ref_cache_pos >= cache_size) ? ref_cache_pos - cache_size : ref_cache_pos;
            load_block_cache(&ref, &cache[ref_cache_pos], thread);
            xor_block(&prev, &ref);
        }
        else if (ref_ref_index == (uint16_t) -1)
        {
            load_block_global(&ref, memory + ref_index, thread);
            xor_block(&prev, &ref);
        }
        else
        {
            struct block_th ref_prev, ref_ref;

            load_block_global(&ref_prev, memory + ref_index - 1, thread);
            load_block_global(&ref_ref, memory + ref_ref_index, thread);
            xor_block(&ref_prev, &ref_ref);

            move_block(&tmp, &ref_prev);
            shuffle_block(&ref_prev, thread);
            xor_block(&ref_prev, &tmp);

            xor_block(&prev, &ref_prev);
        }

        move_block(&tmp, &prev);
        shuffle_block(&prev, thread);
        xor_block(&prev, &tmp);

        if (curr_index < MEMORY_COST - 1)
        {
            if (curr_index > 2 + cache_size
                && ref_indexes[curr_index - cache_size - 1] == (uint16_t) -1)
            {
                load_block_cache(&tmp, &cache[curr_cache_pos], thread);
                store_block_global(memory + curr_index - cache_size - 1, &tmp, thread);
            }

            store_block_cache(&cache[curr_cache_pos], &prev_prev, thread);

            is_stored = !is_stored || (curr_index < memory_tradeoff) || (ref_ref_index != (uint16_t) -1);
            if (!is_stored)
            {
                ref_indexes[curr_index] = ref_index;
            }

            curr_cache_pos++;
            curr_cache_pos = (curr_cache_pos == cache_size) ? 0 : curr_cache_pos;
        }
    }

    store_block_global(memory + MEMORY_COST - 1, &prev, thread);
}

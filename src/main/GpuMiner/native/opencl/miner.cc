#include <nan.h>

#define __CL_ENABLE_EXCEPTIONS
#include <CL/cl.hpp>

#include <atomic>
#include <cstdint>
#include <cstdlib>
#include <iostream>
#include <mutex>
#include <string>
#include <thread>
#include <vector>

#include "argon2d.hpp"
#include "blake2b.hpp"
#include "miner.h"

#define VENDOR_AMD "Advanced Micro Devices"
#define VENDOR_NVIDIA "NVIDIA Corporation"

// Return the SKU board name for the device
#ifndef CL_DEVICE_BOARD_NAME_AMD
#define CL_DEVICE_BOARD_NAME_AMD 0x4038
#endif

// Return the global free memory in KBytes for the device:
#ifndef CL_DEVICE_GLOBAL_FREE_MEMORY_AMD
#define CL_DEVICE_GLOBAL_FREE_MEMORY_AMD 0x4039
#endif

const cl_uint zero = 0;

typedef Nan::AsyncBareProgressQueueWorker<uint32_t>::ExecutionProgress MinerProgress;

class Device;
class MinerThread;

class Miner : public Nan::ObjectWrap
{
public:
  explicit Miner();
  ~Miner();

  static NAN_MODULE_INIT(Init);
  static NAN_METHOD(New);
  static NAN_METHOD(GetDevices);
  static NAN_METHOD(InitializeDevices);
  static NAN_METHOD(SetShareCompact);
  static NAN_METHOD(StartMiningOnBlock);
  static NAN_METHOD(Stop);
  // TODO static NAN_METHOD(FreeDevices);

  uint32_t GetShareCompact();
  bool IsMiningEnabled();
  uint64_t GetNextStartNonce(uint32_t noncesPerRun);
  uint32_t GetWorkId();

private:
  static Nan::Persistent<v8::Function> constructor;

  std::vector<Device *> devices;
  bool devicesInitialized = false;
  std::atomic_uint_fast32_t shareCompact;
  std::atomic_bool miningEnabled;
  std::atomic_uint_fast32_t workId;
  std::atomic_uint_fast64_t startNonce;
};

class Device
{
public:
  Device(Miner *miner, const cl::Device &device, uint32_t deviceIndex);
  ~Device();

  static NAN_GETTER(HandleGetters);
  static NAN_SETTER(HandleSetters);

  bool IsEnabled();
  uint32_t GetDeviceIndex();

  void Initialize();
  void StartMiningOnBlock(const v8::Local<v8::Function> &cbFunc, uint32_t workId, nimiq_block_header *blockHeader);
  void MineNonces(uint32_t workId, uint32_t threadIndex, nimiq_block_header *blockHeader, const MinerProgress &progress);

private:
  Miner *miner;
  cl::Device device;
  uint32_t deviceIndex;
  bool isAMD;

  bool enabled = true;
  uint32_t memory = 0; // auto
  uint32_t threads = 2;
  uint32_t cache = 2;
  uint32_t jobs = 2;

  std::vector<MinerThread *> minerThreads;

  cl::Context context;
  cl::Program program;
};

class MinerThread
{
public:
  MinerThread(Miner *miner, uint32_t threadIndex, uint32_t noncesPerRun,
              cl::CommandQueue queue, cl::Buffer memInitialSeed, cl::Buffer memArgon2, cl::Buffer memNonce,
              cl::Kernel kernelInitMemory, cl::Kernel kernelArgon2, cl::Kernel kernelGetNonce,
              cl::NDRange globalInitMemory, cl::NDRange localInitMemory,
              cl::NDRange globalArgon2, cl::NDRange localArgon2,
              cl::NDRange globalGetNonce, cl::NDRange localGetNonce);

  uint32_t GetThreadIndex();
  uint32_t GetNoncesPerRun();

  void MineNonces(uint32_t workId, nimiq_block_header *blockHeader, const MinerProgress &progress);

private:
  void SetBlockHeader(nimiq_block_header *blockHeader);
  uint32_t MineNonces(uint32_t startNonce, uint32_t shareCompact);

  Miner *miner;
  uint32_t threadIndex;
  uint32_t noncesPerRun;

  std::mutex mutex;
  cl::CommandQueue queue;
  cl::Buffer memInitialSeed;
  cl::Buffer memArgon2;
  cl::Buffer memNonce;
  cl::Kernel kernelInitMemory;
  cl::Kernel kernelArgon2;
  cl::Kernel kernelGetNonce;
  cl::NDRange globalInitMemory;
  cl::NDRange localInitMemory;
  cl::NDRange globalArgon2;
  cl::NDRange localArgon2;
  cl::NDRange globalGetNonce;
  cl::NDRange localGetNonce;
};

class MinerWorker : public Nan::AsyncProgressQueueWorker<uint32_t>
{
public:
  MinerWorker(Nan::Callback *callback, Device *device, MinerThread *minerThread, uint32_t workId, nimiq_block_header blockHeader);

  void Execute(const MinerProgress &progress);
  void HandleProgressCallback(const uint32_t *data, size_t count);
  void HandleOKCallback();

private:
  Device *device;
  MinerThread *minerThread;
  uint32_t workId;
  nimiq_block_header blockHeader;
};

/*
* Miner
*/

Nan::Persistent<v8::Function> Miner::constructor;

Miner::Miner()
{
  try
  {
    std::vector<cl::Platform> platforms;
    cl::Platform::get(&platforms);
    if (platforms.size() == 0)
    {
      Nan::ThrowError(Nan::New("Failed to find OpenCL platforms.").ToLocalChecked());
      return;
    }

    uint32_t deviceIndex = 0;
    for (auto const &platform : platforms)
    {
      std::string platformVendor = platform.getInfo<CL_PLATFORM_VENDOR>();
      bool isAMD = (platformVendor.find(VENDOR_AMD) == 0);
      bool isNvidia = (platformVendor.find(VENDOR_NVIDIA) == 0);

      if (!isAMD && !isNvidia)
      {
        continue;
      }

      try
      {
        std::vector<cl::Device> platformDevices;
        platform.getDevices(CL_DEVICE_TYPE_GPU, &platformDevices);
        for (auto const &platformDevice : platformDevices)
        {
          devices.push_back(new Device(this, platformDevice, deviceIndex++));
        }
      }
      catch (cl::Error &error)
      {
        // No GPU devices in this platform, proceed
        if (error.err() != CL_DEVICE_NOT_FOUND)
        {
          throw;
        }
      }
    }
  }
  catch (cl::Error &error)
  {
    Nan::ThrowError(Nan::New("Failed to initialize miner: " + std::string(error.what())).ToLocalChecked());
    return;
  }

  if (devices.size() == 0)
  {
    Nan::ThrowError(Nan::New("Failed to find GPU devices.").ToLocalChecked());
    return;
  }
}

Miner::~Miner()
{
  for (size_t i = 0; i < devices.size(); i++)
  {
    delete devices[i];
  }
}

uint32_t Miner::GetShareCompact()
{
  return shareCompact;
}

bool Miner::IsMiningEnabled()
{
  return miningEnabled;
}

uint64_t Miner::GetNextStartNonce(uint32_t noncesPerRun)
{
  return startNonce.fetch_add(noncesPerRun);
}

uint32_t Miner::GetWorkId()
{
  return workId;
}

NAN_MODULE_INIT(Miner::Init)
{
  v8::Local<v8::FunctionTemplate> tpl = Nan::New<v8::FunctionTemplate>(New);
  tpl->SetClassName(Nan::New("Miner").ToLocalChecked());
  tpl->InstanceTemplate()->SetInternalFieldCount(1);

  Nan::SetPrototypeMethod(tpl, "getDevices", GetDevices);
  Nan::SetPrototypeMethod(tpl, "initializeDevices", InitializeDevices);
  Nan::SetPrototypeMethod(tpl, "setShareCompact", SetShareCompact);
  Nan::SetPrototypeMethod(tpl, "startMiningOnBlock", StartMiningOnBlock);
  Nan::SetPrototypeMethod(tpl, "stop", Stop);

  constructor.Reset(Nan::GetFunction(tpl).ToLocalChecked());
  Nan::Set(target, Nan::New("Miner").ToLocalChecked(), Nan::GetFunction(tpl).ToLocalChecked());
}

NAN_METHOD(Miner::New)
{
  if (!info.IsConstructCall())
  {
    return Nan::ThrowError(Nan::New("Miner() must be called with new keyword.").ToLocalChecked());
  }

  try
  {
    Miner *miner = new Miner();
    miner->Wrap(info.This());
    info.GetReturnValue().Set(info.This());
  }
  catch (std::exception &e)
  {
    return Nan::ThrowError(Nan::New(e.what()).ToLocalChecked());
  }
}

NAN_METHOD(Miner::GetDevices)
{
  Miner *miner = Nan::ObjectWrap::Unwrap<Miner>(info.This());
  v8::Local<v8::Array> devices = Nan::New<v8::Array>(miner->devices.size());

  for (size_t deviceIndex = 0; deviceIndex < miner->devices.size(); deviceIndex++)
  {
    v8::Local<v8::Object> device = Nan::New<v8::Object>();
    Nan::SetPrivate(device, Nan::New("device").ToLocalChecked(), v8::External::New(info.GetIsolate(), miner->devices[deviceIndex]));
    Nan::SetAccessor(device, Nan::New("name").ToLocalChecked(), Device::HandleGetters);
    Nan::SetAccessor(device, Nan::New("vendor").ToLocalChecked(), Device::HandleGetters);
    Nan::SetAccessor(device, Nan::New("driverVersion").ToLocalChecked(), Device::HandleGetters);
    Nan::SetAccessor(device, Nan::New("maxComputeUnits").ToLocalChecked(), Device::HandleGetters);
    Nan::SetAccessor(device, Nan::New("maxClockFrequency").ToLocalChecked(), Device::HandleGetters);
    Nan::SetAccessor(device, Nan::New("maxMemAllocSize").ToLocalChecked(), Device::HandleGetters);
    Nan::SetAccessor(device, Nan::New("globalMemSize").ToLocalChecked(), Device::HandleGetters);
    Nan::SetAccessor(device, Nan::New("enabled").ToLocalChecked(), Device::HandleGetters, Device::HandleSetters);
    Nan::SetAccessor(device, Nan::New("memory").ToLocalChecked(), Device::HandleGetters, Device::HandleSetters);
    Nan::SetAccessor(device, Nan::New("threads").ToLocalChecked(), Device::HandleGetters, Device::HandleSetters);
    Nan::SetAccessor(device, Nan::New("cache").ToLocalChecked(), Device::HandleGetters, Device::HandleSetters);
    Nan::SetAccessor(device, Nan::New("jobs").ToLocalChecked(), Device::HandleGetters, Device::HandleSetters);
    devices->Set(deviceIndex, device);
  }
  info.GetReturnValue().Set(devices);
}

NAN_METHOD(Miner::InitializeDevices)
{
  Miner *miner = Nan::ObjectWrap::Unwrap<Miner>(info.This());

  if (miner->devicesInitialized)
  {
    return Nan::ThrowError(Nan::New("Devices already initialized.").ToLocalChecked());
  }

  try
  {
    for (auto device : miner->devices)
    {
      if (device->IsEnabled())
      {
        device->Initialize();
      }
    }

    miner->devicesInitialized = true;
  }
  catch (cl::Error &error)
  {
    return Nan::ThrowError(Nan::New("Failed to initialize devices: " + std::string(error.what())).ToLocalChecked());
  }
}

NAN_METHOD(Miner::SetShareCompact)
{
  if (!info[0]->IsUint32())
  {
    return Nan::ThrowError(Nan::New("Invalid share compact.").ToLocalChecked());
  }
  // TODO: Check if valid target

  uint32_t shareCompact = Nan::To<uint32_t>(info[0]).FromJust();
  Miner *miner = Nan::ObjectWrap::Unwrap<Miner>(info.This());
  miner->shareCompact = shareCompact;
}

NAN_METHOD(Miner::StartMiningOnBlock)
{
  if (!info[0]->IsUint8Array())
  {
    return Nan::ThrowError(Nan::New("Block header required.").ToLocalChecked());
  }
  v8::Local<v8::Uint8Array> blockHeader = info[0].As<v8::Uint8Array>();
  if (blockHeader->Length() != sizeof(nimiq_block_header))
  {
    return Nan::ThrowError(Nan::New("Invalid block header size.").ToLocalChecked());
  }
  nimiq_block_header *header = (nimiq_block_header *)blockHeader->Buffer()->GetContents().Data();

  if (!info[1]->IsFunction())
  {
    return Nan::ThrowError(Nan::New("Callback required.").ToLocalChecked());
  }
  v8::Local<v8::Function> cbFunc = info[1].As<v8::Function>();

  Miner *miner = Nan::ObjectWrap::Unwrap<Miner>(info.This());
  if (!miner->devicesInitialized)
  {
    return Nan::ThrowError(Nan::New("Devices are not initialized.").ToLocalChecked());
  }

  if (miner->shareCompact == 0)
  {
    return Nan::ThrowError(Nan::New("Share compact is not set.").ToLocalChecked());
  }

  miner->miningEnabled = true;
  uint32_t workId = ++miner->workId;
  miner->startNonce = 0;

  int enabledDevices = 0;
  for (auto device : miner->devices)
  {
    if (device->IsEnabled())
    {
      device->StartMiningOnBlock(cbFunc, workId, header);
      enabledDevices++;
    }
  }

  if (enabledDevices == 0)
  {
    return Nan::ThrowError(Nan::New("Can't start mining - all devices are disabled.").ToLocalChecked());
  }
}

NAN_METHOD(Miner::Stop)
{
  Miner *miner = Nan::ObjectWrap::Unwrap<Miner>(info.This());
  miner->miningEnabled = false;
}

/*
* Device
*/

Device::Device(Miner *miner, const cl::Device &device, uint32_t deviceIndex) : miner(miner), device(device), deviceIndex(deviceIndex)
{
  std::string deviceVendor = device.getInfo<CL_DEVICE_VENDOR>();
  isAMD = (deviceVendor.find(VENDOR_AMD) == 0);
}

Device::~Device()
{
  for (size_t i = 0; i < minerThreads.size(); i++)
  {
    delete minerThreads[i];
  }
}

NAN_GETTER(Device::HandleGetters)
{
  v8::Local<v8::Value> ext = Nan::GetPrivate(info.This(), Nan::New("device").ToLocalChecked()).ToLocalChecked();
  Device *device = (Device *)ext.As<v8::External>()->Value();

  std::string propertyName = std::string(*Nan::Utf8String(property));
  if (propertyName == "name")
  {
    if (device->isAMD)
    {
      char boardName[255];
      cl_uint ret = clGetDeviceInfo(device->device(), CL_DEVICE_BOARD_NAME_AMD, sizeof(boardName), boardName, NULL);
      if (ret == CL_SUCCESS)
      {
        info.GetReturnValue().Set(Nan::New(boardName).ToLocalChecked());
        return;
      }
    }

    std::string deviceName = device->device.getInfo<CL_DEVICE_NAME>(); // Includes null-terminator
    info.GetReturnValue().Set(Nan::New(deviceName.c_str()).ToLocalChecked());
  }
  else if (propertyName == "vendor")
  {
    std::string deviceVendor = device->device.getInfo<CL_DEVICE_VENDOR>();
    info.GetReturnValue().Set(Nan::New(deviceVendor.c_str()).ToLocalChecked());
  }
  else if (propertyName == "driverVersion")
  {
    std::string driverVersion = device->device.getInfo<CL_DRIVER_VERSION>();
    info.GetReturnValue().Set(Nan::New(driverVersion.c_str()).ToLocalChecked());
  }
  else if (propertyName == "maxComputeUnits")
  {
    info.GetReturnValue().Set(device->device.getInfo<CL_DEVICE_MAX_COMPUTE_UNITS>());
  }
  else if (propertyName == "maxClockFrequency")
  {
    info.GetReturnValue().Set(device->device.getInfo<CL_DEVICE_MAX_CLOCK_FREQUENCY>()); // MHz
  }
  else if (propertyName == "maxMemAllocSize")
  {
    info.GetReturnValue().Set((double)device->device.getInfo<CL_DEVICE_MAX_MEM_ALLOC_SIZE>());
  }
  else if (propertyName == "globalMemSize")
  {
    info.GetReturnValue().Set((double)device->device.getInfo<CL_DEVICE_GLOBAL_MEM_SIZE>());
  }
  else if (propertyName == "enabled")
  {
    info.GetReturnValue().Set(device->enabled);
  }
  else if (propertyName == "memory")
  {
    info.GetReturnValue().Set(device->memory);
  }
  else if (propertyName == "threads")
  {
    info.GetReturnValue().Set(device->threads);
  }
  else if (propertyName == "cache")
  {
    info.GetReturnValue().Set(device->cache);
  }
  else if (propertyName == "jobs")
  {
    info.GetReturnValue().Set(device->jobs);
  }
}

NAN_SETTER(Device::HandleSetters)
{
  v8::Local<v8::Value> ext = Nan::GetPrivate(info.This(), Nan::New("device").ToLocalChecked()).ToLocalChecked();
  Device *device = (Device *)ext.As<v8::External>()->Value();

  std::string propertyName = std::string(*Nan::Utf8String(property));
  if (propertyName == "enabled")
  {
    if (!value->IsBoolean())
    {
      return Nan::ThrowError(Nan::New("Boolean value required.").ToLocalChecked());
    }
    device->enabled = Nan::To<bool>(value).FromJust();
  }
  else if (propertyName == "memory")
  {
    if (!value->IsUint32())
    {
      return Nan::ThrowError(Nan::New("Memory must be >= 0.").ToLocalChecked());
    }
    device->memory = Nan::To<uint32_t>(value).FromJust();
  }
  else if (propertyName == "threads")
  {
    if (!value->IsUint32())
    {
      return Nan::ThrowError(Nan::New("Threads must be >= 1").ToLocalChecked());
    }
    uint32_t threads = Nan::To<uint32_t>(value).FromJust();
    if (threads < 1)
    {
      return Nan::ThrowError(Nan::New("Threads must be >= 1.").ToLocalChecked());
    }
    device->threads = threads;
  }
  else if (propertyName == "cache")
  {
    if (!value->IsUint32())
    {
      return Nan::ThrowError(Nan::New("Cache must be >= 2.").ToLocalChecked());
    }
    uint32_t cache = Nan::To<uint32_t>(value).FromJust();
    if (cache < 2)
    {
      return Nan::ThrowError(Nan::New("Cache must be >= 2.").ToLocalChecked());
    }
    device->cache = cache;
  }
  else if (propertyName == "jobs")
  {
    if (!value->IsUint32())
    {
      return Nan::ThrowError(Nan::New("Jobs must be >= 1.").ToLocalChecked());
    }
    uint32_t jobs = Nan::To<uint32_t>(value).FromJust();
    if (jobs < 1)
    {
      return Nan::ThrowError(Nan::New("Jobs must be >= 1.").ToLocalChecked());
    }
    device->jobs = jobs;
  }
}

bool Device::IsEnabled()
{
  return enabled;
}

uint32_t Device::GetDeviceIndex()
{
  return deviceIndex;
}

void Device::Initialize()
{
  size_t memSize = (size_t)memory * ONE_MB;
  // Autoconfig memory size
  if (memSize == 0)
  {
    if (isAMD)
    {
      cl_ulong freeMemory = 0;
#ifndef _WIN32
      cl_uint ret = clGetDeviceInfo(device(), CL_DEVICE_GLOBAL_FREE_MEMORY_AMD, sizeof(freeMemory), &freeMemory, NULL);
      freeMemory = (ret == CL_SUCCESS) ? freeMemory * ONE_KB : 0;
#endif
      if (freeMemory == 0)
      {
        cl_ulong globalMemSize = device.getInfo<CL_DEVICE_GLOBAL_MEM_SIZE>();
        freeMemory = 0.8 * globalMemSize; // 80% of total
      }
      memSize = freeMemory / threads;

      cl_ulong maxMemAllocSize = device.getInfo<CL_DEVICE_MAX_MEM_ALLOC_SIZE>();
      if (memSize > maxMemAllocSize)
      {
        memSize = maxMemAllocSize;
      }
    }
    else
    {
      cl_ulong globalMemSize = device.getInfo<CL_DEVICE_GLOBAL_MEM_SIZE>();
      cl_ulong freeMemory = globalMemSize - ONE_GB; // total - 1G can't work with less than 1Gb
      memSize = freeMemory / threads;
    }
  }

  size_t memBlockSize = (isAMD ? 64 : 128) * ONE_MB;
  memSize = (memSize / memBlockSize) * memBlockSize;

  uint32_t noncesPerRun = memSize / (ARGON2_BLOCK_SIZE * NIMIQ_ARGON2_COST);

  cl_uint jobsPerBlock = (isAMD ? jobs : 1);
  size_t shmemSize = cache * jobsPerBlock * ARGON2_BLOCK_SIZE;

  context = cl::Context(device);

  cl::Program::Sources sources{
      std::make_pair(srcArgon2d.c_str(), srcArgon2d.size()),
      std::make_pair(srcBlake2b.c_str(), srcBlake2b.size())};

  program = cl::Program(context, sources);
  try
  {
    std::string buildOptions = "-Werror";
    buildOptions += " -DCACHE_SIZE=" + std::to_string(cache);
    buildOptions += " -DJOBS_PER_BLOCK=" + std::to_string(jobsPerBlock);

    // printf("Build options: `%s`\n", buildOptions.c_str());
    program.build(buildOptions.c_str());
  }
  catch (cl::Error &error)
  {
    std::string buildLog = program.getBuildInfo<CL_PROGRAM_BUILD_LOG>(device);
    std::cerr << buildLog << std::endl;
    throw;
  }

  for (uint32_t threadIndex = 0; threadIndex < threads; threadIndex++)
  {
    cl::CommandQueue queue = cl::CommandQueue(context, device);

    cl::Buffer memInitialSeed = cl::Buffer(context, CL_MEM_READ_WRITE, sizeof(initial_seed));
    cl::Buffer memArgon2 = cl::Buffer(context, CL_MEM_READ_WRITE, memSize);
    cl::Buffer memNonce = cl::Buffer(context, CL_MEM_READ_WRITE, sizeof(cl_uint));

    cl::Kernel kernelInitMemory = cl::Kernel(program, "init_memory");
    kernelInitMemory.setArg(0, memArgon2);
    kernelInitMemory.setArg(1, memInitialSeed);

    cl::Kernel kernelArgon2 = cl::Kernel(program, "argon2");
    kernelArgon2.setArg(0, shmemSize, NULL);
    kernelArgon2.setArg(1, memArgon2);

    cl::Kernel kernelGetNonce = cl::Kernel(program, "get_nonce");
    kernelGetNonce.setArg(0, memArgon2);
    kernelGetNonce.setArg(3, memNonce);

    cl::NDRange globalInitMemory = cl::NDRange(noncesPerRun, 2);
    cl::NDRange localInitMemory = cl::NDRange(128, 2);

    cl::NDRange globalArgon2 = cl::NDRange(THREADS_PER_LANE, noncesPerRun);
    cl::NDRange localArgon2 = cl::NDRange(THREADS_PER_LANE, jobsPerBlock);

    cl::NDRange globalGetNonce = cl::NDRange(noncesPerRun);
    cl::NDRange localGetNonce = cl::NDRange(256);

    minerThreads.push_back(new MinerThread(miner, threadIndex, noncesPerRun,
                                           queue, memInitialSeed, memArgon2, memNonce,
                                           kernelInitMemory, kernelArgon2, kernelGetNonce,
                                           globalInitMemory, localInitMemory,
                                           globalArgon2, localArgon2,
                                           globalGetNonce, localGetNonce));
  }
}

void Device::StartMiningOnBlock(const v8::Local<v8::Function> &cbFunc, uint32_t workId, nimiq_block_header *blockHeader)
{
  Nan::HandleScope scope;

  for (auto minerThread : minerThreads)
  {
    Nan::AsyncQueueWorker(new MinerWorker(new Nan::Callback(cbFunc), this, minerThread, workId, *blockHeader));
  }
}

/*
* MinerThread
*/
MinerThread::MinerThread(Miner *miner, uint32_t threadIndex, uint32_t noncesPerRun,
                         cl::CommandQueue queue, cl::Buffer memInitialSeed, cl::Buffer memArgon2, cl::Buffer memNonce,
                         cl::Kernel kernelInitMemory, cl::Kernel kernelArgon2, cl::Kernel kernelGetNonce,
                         cl::NDRange globalInitMemory, cl::NDRange localInitMemory,
                         cl::NDRange globalArgon2, cl::NDRange localArgon2,
                         cl::NDRange globalGetNonce, cl::NDRange localGetNonce)
    : miner(miner), threadIndex(threadIndex), noncesPerRun(noncesPerRun),
      queue(queue), memInitialSeed(memInitialSeed), memArgon2(memArgon2), memNonce(memNonce),
      kernelInitMemory(kernelInitMemory), kernelArgon2(kernelArgon2), kernelGetNonce(kernelGetNonce),
      globalInitMemory(globalInitMemory), localInitMemory(localInitMemory),
      globalArgon2(globalArgon2), localArgon2(localArgon2),
      globalGetNonce(globalGetNonce), localGetNonce(localGetNonce)
{
}

uint32_t MinerThread::GetThreadIndex()
{
  return threadIndex;
}

uint32_t MinerThread::GetNoncesPerRun()
{
  return noncesPerRun;
}

void MinerThread::SetBlockHeader(nimiq_block_header *blockHeader)
{
  initial_seed inseed;
  inseed.lanes = 1;
  inseed.hash_len = ARGON2_HASH_LENGTH;
  inseed.memory_cost = NIMIQ_ARGON2_COST;
  inseed.iterations = 1;
  inseed.version = 0x13;
  inseed.type = 0;
  inseed.header_len = sizeof(nimiq_block_header);
  memcpy(&inseed.header, blockHeader, sizeof(nimiq_block_header));
  inseed.salt_len = NIMIQ_ARGON2_SALT_LEN;
  memcpy(&inseed.salt, NIMIQ_ARGON2_SALT, NIMIQ_ARGON2_SALT_LEN);
  inseed.secret_len = 0;
  inseed.extra_len = 0;
  memset(&inseed.padding, 0, sizeof(inseed.padding));

  queue.enqueueWriteBuffer(memInitialSeed, CL_FALSE, 0, sizeof(initial_seed), &inseed);
  queue.enqueueWriteBuffer(memNonce, CL_TRUE, 0, sizeof(cl_uint), &zero);
}

uint32_t MinerThread::MineNonces(uint32_t startNonce, uint32_t shareCompact)
{
  // Initialize memory
  kernelInitMemory.setArg(2, startNonce);
  queue.enqueueNDRangeKernel(kernelInitMemory, cl::NullRange, globalInitMemory, localInitMemory);

  // Compute Argon2d hashes
  queue.enqueueNDRangeKernel(kernelArgon2, cl::NullRange, globalArgon2, localArgon2);

  // Is there PoW?
  kernelGetNonce.setArg(1, startNonce);
  kernelGetNonce.setArg(2, shareCompact);
  queue.enqueueNDRangeKernel(kernelGetNonce, cl::NullRange, globalGetNonce, localGetNonce);

  // TODO: Handle kernel error

  cl_uint nonce;
  queue.enqueueReadBuffer(memNonce, CL_TRUE, 0, sizeof(cl_uint), &nonce);

  if (nonce > 0)
  {
    queue.enqueueWriteBuffer(memNonce, CL_TRUE, 0, sizeof(cl_uint), &zero);
  }

  return nonce;
}

void MinerThread::MineNonces(uint32_t workId, nimiq_block_header *blockHeader, const MinerProgress &progress)
{
  std::lock_guard<std::mutex> lock(mutex);

  SetBlockHeader(blockHeader);

  while (miner->IsMiningEnabled())
  {
    if (workId != miner->GetWorkId())
    {
      break;
    }
    uint64_t startNonce = miner->GetNextStartNonce(noncesPerRun);
    if (startNonce + noncesPerRun > UINT32_MAX)
    {
      break;
    }

    uint32_t nonce = MineNonces(startNonce, miner->GetShareCompact());
    progress.Send(&nonce, 1);
  }
}

/*
* MinerWorker
*/

MinerWorker::MinerWorker(Nan::Callback *callback, Device *device, MinerThread *minerThread, uint32_t workId, nimiq_block_header blockHeader)
    : AsyncProgressQueueWorker(callback), device(device), minerThread(minerThread), workId(workId), blockHeader(blockHeader)
{
}

void MinerWorker::Execute(const MinerProgress &progress)
{
  try
  {
    minerThread->MineNonces(workId, &blockHeader, progress);
  }
  catch (std::exception &e)
  {
    SetErrorMessage(e.what());
  }
}

void MinerWorker::HandleProgressCallback(const uint32_t *nonce, size_t count)
{
  Nan::HandleScope scope;

  v8::Local<v8::Object> obj = Nan::New<v8::Object>();
  Nan::Set(obj, Nan::New("done").ToLocalChecked(), Nan::New(false));
  Nan::Set(obj, Nan::New("device").ToLocalChecked(), Nan::New(device->GetDeviceIndex()));
  Nan::Set(obj, Nan::New("thread").ToLocalChecked(), Nan::New(minerThread->GetThreadIndex()));
  Nan::Set(obj, Nan::New("noncesPerRun").ToLocalChecked(), Nan::New(minerThread->GetNoncesPerRun()));
  Nan::Set(obj, Nan::New("nonce").ToLocalChecked(), Nan::New(*nonce));

  v8::Local<v8::Value> argv[] = {Nan::Null(), obj};
  callback->Call(2, argv, async_resource);
}

void MinerWorker::HandleOKCallback()
{
  Nan::HandleScope scope;

  v8::Local<v8::Object> obj = Nan::New<v8::Object>();
  Nan::Set(obj, Nan::New("done").ToLocalChecked(), Nan::New(true));
  Nan::Set(obj, Nan::New("device").ToLocalChecked(), Nan::New(device->GetDeviceIndex()));
  Nan::Set(obj, Nan::New("thread").ToLocalChecked(), Nan::New(minerThread->GetThreadIndex()));
  Nan::Set(obj, Nan::New("noncesPerRun").ToLocalChecked(), Nan::New(minerThread->GetNoncesPerRun()));
  Nan::Set(obj, Nan::New("nonce").ToLocalChecked(), Nan::Undefined());

  v8::Local<v8::Value> argv[] = {Nan::Null(), obj};
  callback->Call(2, argv, async_resource);
}

NODE_MODULE(nimiq_miner_opencl, Miner::Init);

#include <cuda_runtime.h>
#include <nan.h>

#include <atomic>
#include <cstdint>
#include <cstdlib>
#include <iostream>
#include <mutex>
#include <string>
#include <thread>
#include <vector>

#include "kernels.h"

typedef Nan::AsyncBareProgressQueueWorker<uint32_t>::ExecutionProgress MinerProgress;

class Device;

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

  uint32_t GetShareCompact();
  bool IsMiningEnabled();
  uint64_t GetNextStartNonce(uint32_t noncesPerRun);
  uint32_t GetWorkId();

private:
  static Nan::Persistent<v8::Function> constructor;

  int numberOfDevices;
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
  Device(Miner *miner, uint32_t deviceIndex);
  ~Device();

  static NAN_GETTER(HandleGetters);
  static NAN_SETTER(HandleSetters);

  bool IsEnabled();
  uint32_t GetNoncesPerRun();
  uint32_t GetDeviceIndex();

  void StartMiningOnBlock(const v8::Local<v8::Function> &cbFunc, uint32_t workId, nimiq_block_header *blockHeader);
  void Initialize();
  void MineNonces(uint32_t workId, uint32_t threadIndex, nimiq_block_header *blockHeader, const MinerProgress &progress);

private:
  Miner *miner;
  uint32_t deviceIndex;
  cudaDeviceProp prop;
  bool enabled = true;
  uint32_t memory = 0; // auto
  uint32_t threads = 2;
  uint32_t cache = 4;
  uint32_t memoryTradeoff = 192;
  bool initialized = false;
  // TODO: Extract new class
  std::mutex **mutexes;
  worker_t worker;
};

class MinerWorker : public Nan::AsyncProgressQueueWorker<uint32_t>
{
public:
  MinerWorker(Nan::Callback *callback, Device *device, uint32_t workId, uint32_t threadIndex, nimiq_block_header blockHeader);

  void Execute(const MinerProgress &progress);
  void HandleProgressCallback(const uint32_t *data, size_t count);
  void HandleOKCallback();

private:
  Device *device;
  uint32_t workId;
  uint32_t threadIndex;
  nimiq_block_header blockHeader;
};

/*
* Miner
*/

Nan::Persistent<v8::Function> Miner::constructor;

Miner::Miner()
{
  cudaGetDeviceCount(&numberOfDevices);
  if (numberOfDevices < 1)
  {
    throw std::runtime_error("Could not initialize miner. No CUDA devices found.");
  }

  devices.resize(numberOfDevices);
  for (int deviceIndex = 0; deviceIndex < numberOfDevices; deviceIndex++)
  {
    devices[deviceIndex] = new Device(this, deviceIndex);
  }

  shareCompact = 0;
  miningEnabled = false;
  workId = 0;
  startNonce = 0;
}

Miner::~Miner()
{
  for (int deviceIndex = 0; deviceIndex < numberOfDevices; deviceIndex++)
  {
    delete devices[deviceIndex];
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
  v8::Local<v8::Array> devices = Nan::New<v8::Array>(miner->numberOfDevices);
  for (int deviceIndex = 0; deviceIndex < miner->numberOfDevices; deviceIndex++)
  {
    v8::Local<v8::Object> device = Nan::New<v8::Object>();
    Nan::SetPrivate(device, Nan::New("device").ToLocalChecked(), v8::External::New(info.GetIsolate(), miner->devices[deviceIndex]));
    Nan::SetAccessor(device, Nan::New("name").ToLocalChecked(), Device::HandleGetters);
    Nan::SetAccessor(device, Nan::New("clockRate").ToLocalChecked(), Device::HandleGetters);
    Nan::SetAccessor(device, Nan::New("memoryClockRate").ToLocalChecked(), Device::HandleGetters);
    Nan::SetAccessor(device, Nan::New("memoryBusWidth").ToLocalChecked(), Device::HandleGetters);
    Nan::SetAccessor(device, Nan::New("memoryBandwidth").ToLocalChecked(), Device::HandleGetters);
    Nan::SetAccessor(device, Nan::New("multiProcessorCount").ToLocalChecked(), Device::HandleGetters);
    Nan::SetAccessor(device, Nan::New("totalGlobalMem").ToLocalChecked(), Device::HandleGetters);
    Nan::SetAccessor(device, Nan::New("sharedMemPerBlock").ToLocalChecked(), Device::HandleGetters);
    Nan::SetAccessor(device, Nan::New("major").ToLocalChecked(), Device::HandleGetters);
    Nan::SetAccessor(device, Nan::New("minor").ToLocalChecked(), Device::HandleGetters);
    Nan::SetAccessor(device, Nan::New("enabled").ToLocalChecked(), Device::HandleGetters, Device::HandleSetters);
    Nan::SetAccessor(device, Nan::New("memory").ToLocalChecked(), Device::HandleGetters, Device::HandleSetters);
    Nan::SetAccessor(device, Nan::New("threads").ToLocalChecked(), Device::HandleGetters, Device::HandleSetters);
    Nan::SetAccessor(device, Nan::New("cache").ToLocalChecked(), Device::HandleGetters, Device::HandleSetters);
    Nan::SetAccessor(device, Nan::New("memoryTradeoff").ToLocalChecked(), Device::HandleGetters, Device::HandleSetters);
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
  catch (std::exception &e)
  {
    return Nan::ThrowError(Nan::New(e.what()).ToLocalChecked());
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
  miner->startNonce = 0; // TODO: Make startNonce consistent across threads. It can be incremented by the worker mining stale block.

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

Device::Device(Miner *miner, uint32_t deviceIndex) : miner(miner), deviceIndex(deviceIndex)
{
  cudaGetDeviceProperties(&prop, deviceIndex);
}

Device::~Device()
{
  if (initialized)
  {
    for (uint32_t threadIndex = 0; threadIndex < threads; threadIndex++)
    {
      delete mutexes[threadIndex];
      cudaFree(worker.memory[threadIndex]);
      cudaFree(worker.inseed[threadIndex]);
      cudaFree(worker.nonce[threadIndex]);
    }

    delete[] mutexes;
    delete[] worker.memory;
    delete[] worker.inseed;
    delete[] worker.nonce;
  }
}

NAN_GETTER(Device::HandleGetters)
{
  v8::Local<v8::Value> ext = Nan::GetPrivate(info.This(), Nan::New("device").ToLocalChecked()).ToLocalChecked();
  Device *device = (Device *)ext.As<v8::External>()->Value();

  std::string propertyName = std::string(*Nan::Utf8String(property));
  if (propertyName == "name")
  {
    info.GetReturnValue().Set(Nan::New(device->prop.name).ToLocalChecked());
  }
  else if (propertyName == "clockRate")
  {
    info.GetReturnValue().Set(device->prop.clockRate / 1e3); // MHz
  }
  else if (propertyName == "memoryClockRate")
  {
    info.GetReturnValue().Set(device->prop.memoryClockRate / 1e3); // MHz
  }
  else if (propertyName == "memoryBusWidth")
  {
    info.GetReturnValue().Set(device->prop.memoryBusWidth);
  }
  else if (propertyName == "memoryBandwidth")
  {
    info.GetReturnValue().Set((2.0 * device->prop.memoryClockRate * device->prop.memoryBusWidth / 8) / 1e6); // GB/s
  }
  else if (propertyName == "multiProcessorCount")
  {
    info.GetReturnValue().Set(device->prop.multiProcessorCount);
  }
  else if (propertyName == "totalGlobalMem")
  {
    info.GetReturnValue().Set((double)device->prop.totalGlobalMem);
  }
  else if (propertyName == "sharedMemPerBlock")
  {
    info.GetReturnValue().Set((double)device->prop.sharedMemPerBlock);
  }
  else if (propertyName == "major")
  {
    info.GetReturnValue().Set(device->prop.major);
  }
  else if (propertyName == "minor")
  {
    info.GetReturnValue().Set(device->prop.minor);
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
  else if (propertyName == "memoryTradeoff")
  {
    info.GetReturnValue().Set(device->memoryTradeoff);
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
  else if (propertyName == "memoryTradeoff")
  {
    if (!value->IsUint32())
    {
      return Nan::ThrowError(Nan::New("Memory tradeoff must be between 2 and 512.").ToLocalChecked());
    }
    uint32_t memoryTradeoff = Nan::To<uint32_t>(value).FromJust();
    if (memoryTradeoff < 2 || memoryTradeoff > MEMORY_COST)
    {
      return Nan::ThrowError(Nan::New("Memory tradeoff must be between 2 and 512.").ToLocalChecked());
    }
    device->memoryTradeoff = memoryTradeoff;
  }
}

bool Device::IsEnabled()
{
  return enabled;
}

uint32_t Device::GetNoncesPerRun()
{
  return worker.nonces_per_run;
}

uint32_t Device::GetDeviceIndex()
{
  return deviceIndex;
}

void Device::StartMiningOnBlock(const v8::Local<v8::Function> &cbFunc, uint32_t workId, nimiq_block_header *blockHeader)
{
  Nan::HandleScope scope;

  for (uint32_t threadIndex = 0; threadIndex < threads; threadIndex++)
  {
    Nan::AsyncQueueWorker(new MinerWorker(new Nan::Callback(cbFunc), this, workId, threadIndex, *blockHeader));
  }
}

void Device::Initialize()
{
  if (initialized)
  {
    return;
  }

  cudaSetDevice(deviceIndex);
  cudaDeviceReset();
  cudaSetDeviceFlags(cudaDeviceScheduleBlockingSync); // cudaDeviceScheduleAuto

  size_t memSize = (size_t)memory * ONE_MB;

  if (memSize == 0)
  {
    size_t freeMemory, totalMemory;
    cudaMemGetInfo(&freeMemory, &totalMemory);
    memSize = (freeMemory - MEMORY_BLOCK_SIZE) / threads;
  }

  memSize = (memSize / MEMORY_BLOCK_SIZE) * MEMORY_BLOCK_SIZE;

  uint32_t threadsPerBlock = (MEMORY_BLOCK_SIZE / (sizeof(block_g) * NIMIQ_ARGON2_COST));
  uint32_t noncesPerRun = memSize / (sizeof(block_g) * NIMIQ_ARGON2_COST);

  worker.nonces_per_run = noncesPerRun;

  worker.init_memory_blocks = dim3(noncesPerRun / threadsPerBlock);
  worker.init_memory_threads = dim3(threadsPerBlock, 2);

  worker.argon2_blocks = dim3(1, noncesPerRun);
  worker.argon2_threads = dim3(THREADS_PER_LANE, 1);

  worker.get_nonce_blocks = dim3(noncesPerRun / threadsPerBlock);
  worker.get_nonce_threads = dim3(threadsPerBlock);

  worker.cacheSize = cache;
  worker.memoryTradeoff = memoryTradeoff;

  mutexes = new std::mutex *[threads];
  worker.memory = new block_g *[threads];
  worker.inseed = new uint64_t *[threads];
  worker.nonce = new uint32_t *[threads];

  for (uint32_t threadIndex = 0; threadIndex < threads; threadIndex++)
  {
    mutexes[threadIndex] = new std::mutex();

    cudaError_t result = cudaMalloc(&worker.memory[threadIndex], memSize);
    if (result != cudaSuccess)
    {
      throw std::runtime_error("Could not allocate memory.");
    }

    result = cudaMalloc(&worker.inseed[threadIndex], sizeof(initial_seed));
    if (result != cudaSuccess)
    {
      throw std::runtime_error("Could not allocate memory.");
    }

    result = cudaMalloc(&worker.nonce[threadIndex], sizeof(uint32_t));
    if (result != cudaSuccess)
    {
      throw std::runtime_error("Could not allocate memory.");
    }
  }

  initialized = true;
}

void Device::MineNonces(uint32_t workId, uint32_t threadIndex, nimiq_block_header *blockHeader, const MinerProgress &progress)
{
  std::lock_guard<std::mutex> lock(*mutexes[threadIndex]);

  cudaSetDevice(deviceIndex);

  set_block_header(&worker, threadIndex, blockHeader);

  while (miner->IsMiningEnabled())
  {
    if (workId != miner->GetWorkId())
    {
      break;
    }
    uint32_t noncesPerRun = GetNoncesPerRun();
    uint64_t startNonce = miner->GetNextStartNonce(noncesPerRun);
    if (startNonce + noncesPerRun > UINT32_MAX)
    {
      break;
    }

    uint32_t nonce;
    cudaError_t result = mine_nonces(&worker, threadIndex, (uint32_t)startNonce, miner->GetShareCompact(), &nonce);
    if (result != cudaSuccess)
    {
      const char *errorMsg = cudaGetErrorString(result);
      std::cerr << "GPU #" << deviceIndex << " failed: " << errorMsg << "\n";
      std::exit(result);
    }

    progress.Send(&nonce, 1);
  }
}

/*
* MinerWorker
*/

MinerWorker::MinerWorker(Nan::Callback *callback, Device *device, uint32_t workId, uint32_t threadIndex, nimiq_block_header blockHeader)
    : AsyncProgressQueueWorker(callback), device(device), workId(workId), threadIndex(threadIndex), blockHeader(blockHeader)
{
}

void MinerWorker::Execute(const MinerProgress &progress)
{
  try
  {
    device->MineNonces(workId, threadIndex, &blockHeader, progress);
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
  Nan::Set(obj, Nan::New("thread").ToLocalChecked(), Nan::New(threadIndex));
  Nan::Set(obj, Nan::New("noncesPerRun").ToLocalChecked(), Nan::New(device->GetNoncesPerRun()));
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
  Nan::Set(obj, Nan::New("thread").ToLocalChecked(), Nan::New(threadIndex));
  Nan::Set(obj, Nan::New("noncesPerRun").ToLocalChecked(), Nan::New(device->GetNoncesPerRun()));
  Nan::Set(obj, Nan::New("nonce").ToLocalChecked(), Nan::Undefined());

  v8::Local<v8::Value> argv[] = {Nan::Null(), obj};
  callback->Call(2, argv, async_resource);
}

NODE_MODULE(nimiq_miner_cuda, Miner::Init);

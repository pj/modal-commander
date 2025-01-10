#include <napi.h>

#include <CoreAudio/CoreAudioTypes.h>
#include <CoreAudio/AudioHardware.h>
#include <AudioUnit/AudioUnit.h>
#include <CoreAudio/CoreAudio.h>
#include <CoreServices/CoreServices.h>
#include <AudioToolbox/AudioServices.h>

Napi::Value muteVolume(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsBoolean()) {
    Napi::TypeError::New(env, "Boolean expected").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Get default output device first
  AudioObjectPropertyAddress defaultOutputDevice = {
    kAudioHardwarePropertyDefaultOutputDevice,
    kAudioObjectPropertyScopeGlobal,
    kAudioObjectPropertyElementMaster
  };

  AudioDeviceID outputDevice;
  UInt32 deviceSize = sizeof(AudioDeviceID);
  OSStatus status = AudioObjectGetPropertyData(
    kAudioObjectSystemObject,
    &defaultOutputDevice,
    0,
    nullptr,
    &deviceSize,
    &outputDevice
  );

  if (status != noErr) {
    std::string errorMsg = "Failed to get default output device. Status: " + std::to_string(status);
    Napi::Error::New(env, errorMsg).ThrowAsJavaScriptException();
    return env.Null();
  }

  // Set mute state on the device
  AudioObjectPropertyAddress muteAddress = {
    kAudioDevicePropertyMute,
    kAudioObjectPropertyScopeOutput,
    kAudioObjectPropertyElementMaster
  };

  UInt32 muted = info[0].As<Napi::Boolean>().Value() ? 1 : 0;
  UInt32 dataSize = sizeof(UInt32);

  status = AudioObjectSetPropertyData(
    outputDevice,
    &muteAddress,
    0,
    nullptr,
    dataSize,
    &muted
  );

  if (status != noErr) {
    std::string errorMsg = "Failed to set mute state. Status: " + std::to_string(status);
    Napi::Error::New(env, errorMsg).ThrowAsJavaScriptException();
    return env.Null();
  }

  return env.Null();
}

Napi::Value setVolume(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Number expected").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Get default output device
  AudioObjectPropertyAddress defaultOutputDevice = {
    kAudioHardwarePropertyDefaultOutputDevice,
    kAudioObjectPropertyScopeGlobal,
    kAudioObjectPropertyElementMaster
  };

  AudioDeviceID outputDevice;
  UInt32 deviceSize = sizeof(AudioDeviceID);
  OSStatus status = AudioObjectGetPropertyData(
    kAudioObjectSystemObject,
    &defaultOutputDevice,
    0,
    nullptr,
    &deviceSize,
    &outputDevice
  );

  if (status != noErr) {
    std::string errorMsg = "Failed to get default output device. Status: " + std::to_string(status);
    Napi::Error::New(env, errorMsg).ThrowAsJavaScriptException();
    return env.Null();
  }

  // Set volume on the device
  AudioObjectPropertyAddress volumeAddress = {
    kAudioHardwareServiceDeviceProperty_VirtualMasterVolume,
    kAudioObjectPropertyScopeOutput,
    kAudioObjectPropertyElementMaster
  };
  
  Float32 volume = info[0].As<Napi::Number>().FloatValue() / 100.0;
  UInt32 dataSize = sizeof(Float32);

  status = AudioObjectSetPropertyData(
    outputDevice,  // Use the output device
    &volumeAddress,
    0,
    nullptr,
    dataSize,
    &volume
  );

  if (status != noErr) {
    std::string errorMsg = "Failed to set volume. Status: " + std::to_string(status);
    Napi::Error::New(env, errorMsg).ThrowAsJavaScriptException();
    return env.Null();
  }
  
  return env.Null();
}

Napi::Value getVolume(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // First get the default output device
  AudioObjectPropertyAddress defaultOutputDevice = {
    kAudioHardwarePropertyDefaultOutputDevice,
    kAudioObjectPropertyScopeGlobal,
    kAudioObjectPropertyElementMaster
  };

  AudioDeviceID outputDevice;
  UInt32 deviceSize = sizeof(AudioDeviceID);
  OSStatus status = AudioObjectGetPropertyData(
    kAudioObjectSystemObject,
    &defaultOutputDevice,
    0,
    nullptr,
    &deviceSize,
    &outputDevice
  );

  if (status != noErr) {
    std::string errorMsg = "Failed to get default output device. Status: " + std::to_string(status);
    Napi::Error::New(env, errorMsg).ThrowAsJavaScriptException();
    return env.Null();
  }

  // Then get the volume from that device
  AudioObjectPropertyAddress volumeAddress = {
    kAudioHardwareServiceDeviceProperty_VirtualMasterVolume,
    kAudioObjectPropertyScopeOutput,
    kAudioObjectPropertyElementMaster
  };

  Float32 volume = 0.0;
  UInt32 dataSize = sizeof(Float32);

  status = AudioObjectGetPropertyData(
    outputDevice,  // Use the output device instead of system object
    &volumeAddress,
    0,
    nullptr,
    &dataSize,
    &volume
  );

  if (status != noErr) {
    std::string errorMsg = "Failed to get volume. Status: " + std::to_string(status);
    Napi::Error::New(env, errorMsg).ThrowAsJavaScriptException();
    return env.Null();
  }

  return Napi::Number::New(env, volume * 100);
}

Napi::Value getMuted(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Get default output device
  AudioObjectPropertyAddress defaultOutputDevice = {
    kAudioHardwarePropertyDefaultOutputDevice,
    kAudioObjectPropertyScopeGlobal,
    kAudioObjectPropertyElementMaster
  };

  AudioDeviceID outputDevice;
  UInt32 deviceSize = sizeof(AudioDeviceID);
  OSStatus status = AudioObjectGetPropertyData(
    kAudioObjectSystemObject,
    &defaultOutputDevice,
    0,
    nullptr,
    &deviceSize,
    &outputDevice
  );

  if (status != noErr) {
    std::string errorMsg = "Failed to get default output device. Status: " + std::to_string(status);
    Napi::Error::New(env, errorMsg).ThrowAsJavaScriptException();
    return env.Null();
  }

  // Get mute state
  AudioObjectPropertyAddress muteAddress = {
    kAudioDevicePropertyMute,
    kAudioObjectPropertyScopeOutput,
    kAudioObjectPropertyElementMaster
  };

  UInt32 muted = 0;
  UInt32 dataSize = sizeof(UInt32);

  status = AudioObjectGetPropertyData(
    outputDevice,
    &muteAddress,
    0,
    nullptr,
    &dataSize,
    &muted
  );

  if (status != noErr) {
    std::string errorMsg = "Failed to get mute state. Status: " + std::to_string(status);
    Napi::Error::New(env, errorMsg).ThrowAsJavaScriptException();
    return env.Null();
  }

  return Napi::Boolean::New(env, muted != 0);
}

// Napi::Value SetVolumeWithDevice(const Napi::CallbackInfo& info) {
//   Napi::Env env = info.Env();
  
//   if (info.Length() < 2) {
//     Napi::TypeError::New(env, "Wrong number of arguments")
//         .ThrowAsJavaScriptException();
//     return env.Null();
//   }
  
//   if (!info[0].IsString()) {
//     Napi::TypeError::New(env, "String expected for deviceId")
//         .ThrowAsJavaScriptException();
//     return env.Null();
//   }
//   std::string deviceId = info[0].As<Napi::String>().Utf8Value();
  
//   if (!info[1].IsNumber()) {
//     Napi::TypeError::New(env, "Number expected for volume")
//         .ThrowAsJavaScriptException();
//     return env.Null();
//   }
//   double volume = info[1].As<Napi::Number>().DoubleValue();
  
//   // Use deviceId and volume...
  
//   return env.Null();
// }

// Napi::Value SetConfig(const Napi::CallbackInfo& info) {
//   Napi::Env env = info.Env();
  
//   if (info.Length() < 1 || !info[0].IsObject()) {
//     Napi::TypeError::New(env, "Object expected")
//         .ThrowAsJavaScriptException();
//     return env.Null();
//   }
  
//   Napi::Object config = info[0].As<Napi::Object>();
  
//   // Get object properties
//   std::string device = config.Get("device").As<Napi::String>().Utf8Value();
//   double step = config.Get("step").As<Napi::Number>().DoubleValue();
  
//   // Use device and step...
  
//   return env.Null();
// }

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set(Napi::String::New(env, "muteVolume"), Napi::Function::New(env, muteVolume));
  exports.Set(Napi::String::New(env, "setVolume"), Napi::Function::New(env, setVolume));
  exports.Set(Napi::String::New(env, "getVolume"), Napi::Function::New(env, getVolume));
  exports.Set(Napi::String::New(env, "getMuted"), Napi::Function::New(env, getMuted));
//   exports.Set(Napi::String::New(env, "setVolumeWithDevice"), Napi::Function::New(env, SetVolumeWithDevice));
//   exports.Set(Napi::String::New(env, "setConfig"), Napi::Function::New(env, SetConfig));
  return exports;
}

NODE_API_MODULE(VolumeCommand, Init)
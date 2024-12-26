#include <napi.h>

extern int SACLockScreenImmediate ( void );

void LockScreen(const Napi::CallbackInfo& info) {
  SACLockScreenImmediate();
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set(Napi::String::New(env, "LockScreen"), Napi::Function::New(env, LockScreen));
  return exports;
}

NODE_API_MODULE(LockCommand, Init)
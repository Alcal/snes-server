#include <napi.h>
#include "emulator_wrapper.h"
#include <thread>
#include <memory>
#include <vector>

class Snes9xAddon : public Napi::ObjectWrap<Snes9xAddon> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    Snes9xAddon(const Napi::CallbackInfo& info);
    ~Snes9xAddon();

private:
    static Napi::FunctionReference constructor;
    EmulatorWrapper* emulator;
    
    // Thread-safe callbacks (using pointers to allow null check)
    Napi::ThreadSafeFunction* video_tsfn;
    Napi::ThreadSafeFunction* audio_tsfn;

    // Methods
    Napi::Value Init(const Napi::CallbackInfo& info);
    Napi::Value Deinit(const Napi::CallbackInfo& info);
    Napi::Value LoadROM(const Napi::CallbackInfo& info);
    Napi::Value LoadROMMem(const Napi::CallbackInfo& info);
    Napi::Value IsROMLoaded(const Napi::CallbackInfo& info);
    Napi::Value RunFrame(const Napi::CallbackInfo& info);
    Napi::Value Reset(const Napi::CallbackInfo& info);
    Napi::Value SoftReset(const Napi::CallbackInfo& info);
    Napi::Value SetPaused(const Napi::CallbackInfo& info);
    Napi::Value IsPaused(const Napi::CallbackInfo& info);
    Napi::Value SaveState(const Napi::CallbackInfo& info);
    Napi::Value LoadState(const Napi::CallbackInfo& info);
    Napi::Value SaveStateToFile(const Napi::CallbackInfo& info);
    Napi::Value LoadStateFromFile(const Napi::CallbackInfo& info);
    Napi::Value SetButtonState(const Napi::CallbackInfo& info);
    Napi::Value SetMousePosition(const Napi::CallbackInfo& info);
    Napi::Value SetMouseButtons(const Napi::CallbackInfo& info);
    Napi::Value GetFrameWidth(const Napi::CallbackInfo& info);
    Napi::Value GetFrameHeight(const Napi::CallbackInfo& info);
    Napi::Value GetFrameRate(const Napi::CallbackInfo& info);
    Napi::Value StartEmulationThread(const Napi::CallbackInfo& info);
    Napi::Value StopEmulationThread(const Napi::CallbackInfo& info);
    Napi::Value SetVideoCallback(const Napi::CallbackInfo& info);
    Napi::Value SetAudioCallback(const Napi::CallbackInfo& info);
};

Napi::FunctionReference Snes9xAddon::constructor;

Napi::Object Snes9xAddon::Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(env, "Snes9xAddon", {
        InstanceMethod("init", &Snes9xAddon::Init),
        InstanceMethod("deinit", &Snes9xAddon::Deinit),
        InstanceMethod("loadROM", &Snes9xAddon::LoadROM),
        InstanceMethod("loadROMMem", &Snes9xAddon::LoadROMMem),
        InstanceMethod("isROMLoaded", &Snes9xAddon::IsROMLoaded),
        InstanceMethod("runFrame", &Snes9xAddon::RunFrame),
        InstanceMethod("reset", &Snes9xAddon::Reset),
        InstanceMethod("softReset", &Snes9xAddon::SoftReset),
        InstanceMethod("setPaused", &Snes9xAddon::SetPaused),
        InstanceMethod("isPaused", &Snes9xAddon::IsPaused),
        InstanceMethod("saveState", &Snes9xAddon::SaveState),
        InstanceMethod("loadState", &Snes9xAddon::LoadState),
        InstanceMethod("saveStateToFile", &Snes9xAddon::SaveStateToFile),
        InstanceMethod("loadStateFromFile", &Snes9xAddon::LoadStateFromFile),
        InstanceMethod("setButtonState", &Snes9xAddon::SetButtonState),
        InstanceMethod("setMousePosition", &Snes9xAddon::SetMousePosition),
        InstanceMethod("setMouseButtons", &Snes9xAddon::SetMouseButtons),
        InstanceMethod("getFrameWidth", &Snes9xAddon::GetFrameWidth),
        InstanceMethod("getFrameHeight", &Snes9xAddon::GetFrameHeight),
        InstanceMethod("getFrameRate", &Snes9xAddon::GetFrameRate),
        InstanceMethod("startEmulationThread", &Snes9xAddon::StartEmulationThread),
        InstanceMethod("stopEmulationThread", &Snes9xAddon::StopEmulationThread),
        InstanceMethod("setVideoCallback", &Snes9xAddon::SetVideoCallback),
        InstanceMethod("setAudioCallback", &Snes9xAddon::SetAudioCallback),
    });

    constructor = Napi::Persistent(func);
    constructor.SuppressDestruct();
    exports.Set("Snes9xAddon", func);
    return exports;
}

Snes9xAddon::Snes9xAddon(const Napi::CallbackInfo& info) 
    : Napi::ObjectWrap<Snes9xAddon>(info)
    , emulator(new EmulatorWrapper())
    , video_tsfn(nullptr)
    , audio_tsfn(nullptr)
{
}

Snes9xAddon::~Snes9xAddon() {
    // Release thread-safe functions if they were initialized
    if (video_tsfn) {
        video_tsfn->Release();
        delete video_tsfn;
        video_tsfn = nullptr;
    }
    if (audio_tsfn) {
        audio_tsfn->Release();
        delete audio_tsfn;
        audio_tsfn = nullptr;
    }
    
    if (emulator) {
        emulator->deinit();
        delete emulator;
    }
}

Napi::Value Snes9xAddon::Init(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    bool result = emulator->init();
    return Napi::Boolean::New(env, result);
}

Napi::Value Snes9xAddon::Deinit(const Napi::CallbackInfo& info) {
    emulator->deinit();
    return info.Env().Undefined();
}

Napi::Value Snes9xAddon::LoadROM(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "String expected").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    std::string filename = info[0].As<Napi::String>().Utf8Value();
    bool result = emulator->loadROM(filename);
    return Napi::Boolean::New(env, result);
}

Napi::Value Snes9xAddon::LoadROMMem(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsBuffer()) {
        Napi::TypeError::New(env, "Buffer expected").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    Napi::Buffer<uint8_t> buffer = info[0].As<Napi::Buffer<uint8_t>>();
    std::string name = info.Length() > 1 && info[1].IsString() 
        ? info[1].As<Napi::String>().Utf8Value() 
        : "";
    
    bool result = emulator->loadROMMem(buffer.Data(), buffer.Length(), name);
    return Napi::Boolean::New(env, result);
}

Napi::Value Snes9xAddon::IsROMLoaded(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    return Napi::Boolean::New(env, emulator->isROMLoaded());
}

Napi::Value Snes9xAddon::RunFrame(const Napi::CallbackInfo& info) {
    emulator->runFrame();
    return info.Env().Undefined();
}

Napi::Value Snes9xAddon::Reset(const Napi::CallbackInfo& info) {
    emulator->reset();
    return info.Env().Undefined();
}

Napi::Value Snes9xAddon::SoftReset(const Napi::CallbackInfo& info) {
    emulator->softReset();
    return info.Env().Undefined();
}

Napi::Value Snes9xAddon::SetPaused(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsBoolean()) {
        Napi::TypeError::New(env, "Boolean expected").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    bool paused = info[0].As<Napi::Boolean>().Value();
    emulator->setPaused(paused);
    return env.Undefined();
}

Napi::Value Snes9xAddon::IsPaused(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    return Napi::Boolean::New(env, emulator->isPaused());
}

Napi::Value Snes9xAddon::SaveState(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsNumber()) {
        Napi::TypeError::New(env, "Number expected").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    int slot = info[0].As<Napi::Number>().Int32Value();
    bool result = emulator->saveState(slot);
    return Napi::Boolean::New(env, result);
}

Napi::Value Snes9xAddon::LoadState(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsNumber()) {
        Napi::TypeError::New(env, "Number expected").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    int slot = info[0].As<Napi::Number>().Int32Value();
    bool result = emulator->loadState(slot);
    return Napi::Boolean::New(env, result);
}

Napi::Value Snes9xAddon::SaveStateToFile(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "String expected").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    std::string filename = info[0].As<Napi::String>().Utf8Value();
    bool result = emulator->saveStateToFile(filename);
    return Napi::Boolean::New(env, result);
}

Napi::Value Snes9xAddon::LoadStateFromFile(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "String expected").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    std::string filename = info[0].As<Napi::String>().Utf8Value();
    bool result = emulator->loadStateFromFile(filename);
    return Napi::Boolean::New(env, result);
}

Napi::Value Snes9xAddon::SetButtonState(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsNumber()) {
        Napi::TypeError::New(env, "Number, Number expected").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    int port = info[0].As<Napi::Number>().Int32Value();
    uint16_t buttons = info[1].As<Napi::Number>().Uint32Value();
    emulator->setButtonState(port, buttons);
    return env.Undefined();
}

Napi::Value Snes9xAddon::SetMousePosition(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 3 || !info[0].IsNumber() || !info[1].IsNumber() || !info[2].IsNumber()) {
        Napi::TypeError::New(env, "Number, Number, Number expected").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    int port = info[0].As<Napi::Number>().Int32Value();
    int16_t x = info[1].As<Napi::Number>().Int32Value();
    int16_t y = info[2].As<Napi::Number>().Int32Value();
    emulator->setMousePosition(port, x, y);
    return env.Undefined();
}

Napi::Value Snes9xAddon::SetMouseButtons(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 3 || !info[0].IsNumber() || !info[1].IsBoolean() || !info[2].IsBoolean()) {
        Napi::TypeError::New(env, "Number, Boolean, Boolean expected").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    int port = info[0].As<Napi::Number>().Int32Value();
    bool left = info[1].As<Napi::Boolean>().Value();
    bool right = info[2].As<Napi::Boolean>().Value();
    emulator->setMouseButtons(port, left, right);
    return env.Undefined();
}

Napi::Value Snes9xAddon::GetFrameWidth(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    return Napi::Number::New(env, emulator->getFrameWidth());
}

Napi::Value Snes9xAddon::GetFrameHeight(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    return Napi::Number::New(env, emulator->getFrameHeight());
}

Napi::Value Snes9xAddon::GetFrameRate(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    return Napi::Number::New(env, emulator->getFrameRate());
}

Napi::Value Snes9xAddon::StartEmulationThread(const Napi::CallbackInfo& info) {
    emulator->startEmulationThread();
    return info.Env().Undefined();
}

Napi::Value Snes9xAddon::StopEmulationThread(const Napi::CallbackInfo& info) {
    emulator->stopEmulationThread();
    return info.Env().Undefined();
}

Napi::Value Snes9xAddon::SetVideoCallback(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsFunction()) {
        Napi::TypeError::New(env, "Function expected").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    Napi::Function callback = info[0].As<Napi::Function>();
    
    // Release previous thread-safe function if exists
    if (video_tsfn) {
        video_tsfn->Release();
        delete video_tsfn;
        video_tsfn = nullptr;
    }
    
    // Create thread-safe function
    video_tsfn = new Napi::ThreadSafeFunction(
        Napi::ThreadSafeFunction::New(
            env,
            callback,
            "VideoCallback",
            0,  // Unlimited queue
            1   // Initial thread count
        )
    );
    
    emulator->setVideoCallback([this](const uint16_t* data, int width, int height, int stride, double frameRate) {
        if (!video_tsfn) return;
        
        // Copy video data for thread-safe access
        size_t buffer_size = height * stride / sizeof(uint16_t);
        std::vector<uint16_t> buffer_copy(data, data + buffer_size);
        
        // Call JavaScript callback via thread-safe function
        video_tsfn->BlockingCall([buffer_copy, width, height, stride, frameRate](Napi::Env env, Napi::Function jsCallback) {
            Napi::Buffer<uint16_t> buffer = Napi::Buffer<uint16_t>::Copy(env, buffer_copy.data(), buffer_copy.size());
            jsCallback.Call({
                buffer,
                Napi::Number::New(env, width),
                Napi::Number::New(env, height),
                Napi::Number::New(env, stride),
                Napi::Number::New(env, frameRate)
            });
        });
    });
    
    return env.Undefined();
}

Napi::Value Snes9xAddon::SetAudioCallback(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsFunction()) {
        Napi::TypeError::New(env, "Function expected").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    Napi::Function callback = info[0].As<Napi::Function>();
    
    // Release previous thread-safe function if exists
    if (audio_tsfn) {
        audio_tsfn->Release();
        delete audio_tsfn;
        audio_tsfn = nullptr;
    }
    
    // Create thread-safe function
    audio_tsfn = new Napi::ThreadSafeFunction(
        Napi::ThreadSafeFunction::New(
            env,
            callback,
            "AudioCallback",
            0,  // Unlimited queue
            1   // Initial thread count
        )
    );
    
    emulator->setAudioCallback([this](const int16_t* data, int samples) {
        if (!audio_tsfn) return;
        
        // Copy audio data for thread-safe access
        std::vector<int16_t> buffer_copy(data, data + samples * 2); // Stereo
        
        // Call JavaScript callback via thread-safe function
        audio_tsfn->BlockingCall([buffer_copy, samples](Napi::Env env, Napi::Function jsCallback) {
            Napi::Buffer<int16_t> buffer = Napi::Buffer<int16_t>::Copy(env, buffer_copy.data(), buffer_copy.size());
            jsCallback.Call({
                buffer,
                Napi::Number::New(env, samples)
            });
        });
    });
    
    return env.Undefined();
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    return Snes9xAddon::Init(env, exports);
}

NODE_API_MODULE(snes9x_addon, Init)


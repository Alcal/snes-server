#include "emulator_wrapper.h"
#include "./core/snes9x.h"
#include "./core/memmap.h"
#include "./core/apu/apu.h"
#include "./core/gfx.h"
#include "./core/ppu.h"
#include "./core/snapshot.h"
#include "./core/controls.h"
#include "./core/display.h"
#include "./core/conffile.h"
#include "./core/fscompat.h"
#include "./core/cheats.h"
#include "./core/movie.h"
#include "./core/messages.h"
#include <cstring>
#include <cstdio>
#include <chrono>
#include <string>

// Global instance for callbacks
static EmulatorWrapper* g_emulator = nullptr;

// Video output callback
bool8 S9xDeinitUpdate(int width, int height) {
    if (!g_emulator) return true;
    
    auto& gfx = GFX;
    if (gfx.Screen && width >= 256 && height >= 224) {
        g_emulator->processVideoFrame();
    }
    
    return true;
}

// Audio samples callback
void S9xSamplesAvailable(void* user_data) {
    if (!g_emulator) return;
    g_emulator->processAudioSamples();
}

// Message callback - required by Snes9x core
void S9xMessage(int type, int number, const char *message) {
    if (!message) return;
    
    // Output to stdout/stderr based on message type
    switch (type) {
        case S9X_ERROR:
        case S9X_FATAL_ERROR:
            fprintf(stderr, "%s\n", message);
            break;
        case S9X_WARNING:
            fprintf(stdout, "Warning: %s\n", message);
            break;
        case S9X_INFO:
        case S9X_DEBUG:
        case S9X_TRACE:
        default:
            fprintf(stdout, "%s\n", message);
            break;
    }
    
    // Also call S9xSetInfoString if available (for on-screen display)
    S9xSetInfoString(message);
}

// Speed synchronization callback - required by Snes9x core
void S9xSyncSpeed(void) {
    // Handle turbo mode frame skipping
    if (Settings.TurboMode) {
        IPPU.FrameSkip++;
        if ((IPPU.FrameSkip > Settings.TurboSkipFrames) && !Settings.HighSpeedSeek) {
            IPPU.FrameSkip = 0;
            IPPU.SkippedFrames = 0;
            IPPU.RenderThisFrame = true;
        } else {
            IPPU.SkippedFrames++;
            IPPU.RenderThisFrame = false;
        }
        return;
    }
    
    // Normal mode: always render frames
    IPPU.RenderThisFrame = true;
}

// Auto-save SRAM callback - required by Snes9x core
void S9xAutoSaveSRAM(void) {
    Memory.SaveSRAM(S9xGetFilename(".srm", SRAM_DIR).c_str());
}

EmulatorWrapper::EmulatorWrapper()
    : rom_loaded(false)
    , emulation_running(false)
    , should_stop(false)
    , frame_width(256)
    , frame_height(224)
    , frame_rate(60.0)
{
    g_emulator = this;
}

EmulatorWrapper::~EmulatorWrapper() {
    deinit();
    g_emulator = nullptr;
}

bool EmulatorWrapper::init() {
    std::lock_guard<std::mutex> lock(emulation_mutex);

    // Initialize settings
    Settings.MouseMaster = true;
    Settings.SuperScopeMaster = true;
    Settings.JustifierMaster = true;
    Settings.MultiPlayer5Master = true;
    Settings.Transparency = true;
    Settings.Stereo = true;
    Settings.ReverseStereo = false;
    Settings.SixteenBitSound = true;
    Settings.StopEmulation = true;
    Settings.HDMATimingHack = 100;
    Settings.SkipFrames = 0;
    Settings.TurboSkipFrames = 9;
    Settings.NetPlay = false;
    Settings.UpAndDown = false;
    Settings.InterpolationMethod = 0; // DSP_INTERPOLATION_GAUSSIAN
    Settings.FrameTime = 16639;
    Settings.FrameTimeNTSC = 16639;
    Settings.FrameTimePAL = 20000;
    Settings.DisplayFrameRate = false;
    Settings.DisplayTime = false;
    Settings.DisplayPressedKeys = false;
    Settings.DisplayIndicators = false;
    Settings.SoundPlaybackRate = 48000;
    Settings.SoundInputRate = 32040;
    Settings.BlockInvalidVRAMAccess = true;
    Settings.SoundSync = false;
    Settings.Mute = false;
    Settings.DynamicRateControl = false;
    Settings.DynamicRateLimit = 5;
    Settings.SuperFXClockMultiplier = 100;
    Settings.MaxSpriteTilesPerLine = 34;
    Settings.OneClockCycle = 6;
    Settings.OneSlowClockCycle = 8;
    Settings.TwoClockCycles = 12;
    Settings.ShowOverscan = false;
    Settings.InitialInfoStringTimeout = 120;

    CPU.Flags = 0;

    // Initialize memory and APU
    if (!Memory.Init() || !S9xInitAPU()) {
        return false;
    }

    // Initialize sound
    S9xInitSound(0);
    S9xSetSamplesAvailableCallback(S9xSamplesAvailable, this);
    S9xSetSoundMute(true);

    // Initialize graphics
    if (!S9xGraphicsInit()) {
        S9xDeinitAPU();
        Memory.Deinit();
        return false;
    }

    // Initialize input
    S9xInitInputDevices();
    S9xUnmapAllControls();
    S9xCheatsEnable();

    // Set up controllers
    S9xSetController(0, CTL_JOYPAD, 0, 0, 0, 0);
    S9xSetController(1, CTL_JOYPAD, 1, 0, 0, 0);
    S9xVerifyControllers();

    return true;
}

void EmulatorWrapper::deinit() {
    stopEmulationThread();

    std::lock_guard<std::mutex> lock(emulation_mutex);

    if (rom_loaded) {
        S9xAutoSaveSRAM();
    }

    S9xGraphicsDeinit();
    S9xDeinitAPU();
    Memory.Deinit();
    
    rom_loaded = false;
}

bool EmulatorWrapper::loadROM(const std::string& filename) {
    std::lock_guard<std::mutex> lock(emulation_mutex);

    if (rom_loaded) {
        S9xAutoSaveSRAM();
    }

    Settings.StopEmulation = true;
    rom_loaded = false;

    bool loaded = Memory.LoadROM(filename.c_str());
    
    if (loaded) {
        rom_loaded = true;
        Settings.StopEmulation = false;
        Memory.LoadSRAM(S9xGetFilename(".srm", SRAM_DIR).c_str());
        
        // Update frame info
        frame_width = SNES_WIDTH;
        frame_height = SNES_HEIGHT;
        frame_rate = Settings.PAL ? 50.006977968 : 60.09881389744051;
    }

    return loaded;
}

bool EmulatorWrapper::loadROMMem(const uint8_t* data, size_t size, const std::string& name) {
    std::lock_guard<std::mutex> lock(emulation_mutex);

    if (rom_loaded) {
        S9xAutoSaveSRAM();
    }

    Settings.StopEmulation = true;
    rom_loaded = false;

    bool loaded = Memory.LoadROMMem(data, size, name.empty() ? nullptr : name.c_str());
    
    if (loaded) {
        rom_loaded = true;
        Settings.StopEmulation = false;
        Memory.LoadSRAM(S9xGetFilename(".srm", SRAM_DIR).c_str());
        
        // Update frame info
        frame_width = SNES_WIDTH;
        frame_height = SNES_HEIGHT;
        frame_rate = Settings.PAL ? 50.006977968 : 60.09881389744051;
    }

    return loaded;
}

void EmulatorWrapper::runFrame() {
    if (!rom_loaded || Settings.StopEmulation) {
        return;
    }

    S9xMainLoop();
}

void EmulatorWrapper::reset() {
    std::lock_guard<std::mutex> lock(emulation_mutex);
    if (rom_loaded) {
        S9xReset();
    }
}

void EmulatorWrapper::softReset() {
    std::lock_guard<std::mutex> lock(emulation_mutex);
    if (rom_loaded) {
        S9xSoftReset();
    }
}

void EmulatorWrapper::setPaused(bool paused) {
    Settings.Paused = paused;
    if (paused) {
        S9xSetSoundMute(true);
    } else {
        S9xSetSoundMute(false);
    }
}

bool EmulatorWrapper::isPaused() const {
    return Settings.Paused;
}

bool EmulatorWrapper::saveState(int slot) {
    std::lock_guard<std::mutex> lock(emulation_mutex);
    if (!rom_loaded) return false;
    
    std::string filename = S9xGetFilename(".000", SNAPSHOT_DIR);
    if (slot >= 0 && slot <= 9 && filename.length() >= 4) {
        filename[filename.length() - 4] = '0' + slot;
    }
    
    bool result = false;
    if (!filename.empty()) {
        result = S9xFreezeGame(filename.c_str());
    }
    return result;
}

bool EmulatorWrapper::loadState(int slot) {
    std::lock_guard<std::mutex> lock(emulation_mutex);
    if (!rom_loaded) return false;
    
    std::string filename = S9xGetFilename(".000", SNAPSHOT_DIR);
    if (slot >= 0 && slot <= 9 && filename.length() >= 4) {
        filename[filename.length() - 4] = '0' + slot;
    }
    
    bool result = false;
    if (!filename.empty()) {
        result = S9xUnfreezeGame(filename.c_str());
    }
    return result;
}

bool EmulatorWrapper::saveStateToFile(const std::string& filename) {
    std::lock_guard<std::mutex> lock(emulation_mutex);
    if (!rom_loaded) return false;
    return S9xFreezeGame(filename.c_str());
}

bool EmulatorWrapper::loadStateFromFile(const std::string& filename) {
    std::lock_guard<std::mutex> lock(emulation_mutex);
    if (!rom_loaded) return false;
    return S9xUnfreezeGame(filename.c_str());
}

void EmulatorWrapper::setButtonState(int port, uint16_t buttons) {
    if (port < 0 || port >= 8) return;
    
    // Map buttons to SNES format
    MovieSetJoypad(port, buttons);
}

void EmulatorWrapper::setAxisState(int port, int axis, int16_t value) {
    // Axis support can be implemented here if needed
    // For now, SNES controllers are digital only
}

void EmulatorWrapper::setMousePosition(int port, int16_t x, int16_t y) {
    if (port < 0 || port >= 2) return;
    
    // Clamp to SNES screen coordinates
    if (x < 0) x = 0;
    if (x > 255) x = 255;
    if (y < 0) y = 0;
    if (y > 223) y = 223;
    
    S9xReportPointer(PseudoPointerBase - port, x, y);
}

void EmulatorWrapper::setMouseButtons(int port, bool left, bool right) {
    if (port < 0 || port >= 2) return;
    
    // Mouse button handling would go here
    // This requires mapping to the appropriate control IDs
}

void EmulatorWrapper::setVideoCallback(std::function<void(const uint16_t*, int, int, int, double)> callback) {
    std::lock_guard<std::mutex> lock(emulation_mutex);
    video_callback = callback;
}

void EmulatorWrapper::setAudioCallback(std::function<void(const int16_t*, int)> callback) {
    std::lock_guard<std::mutex> lock(audio_mutex);
    audio_callback = callback;
}

int EmulatorWrapper::getFrameWidth() const {
    return frame_width;
}

int EmulatorWrapper::getFrameHeight() const {
    return frame_height;
}

double EmulatorWrapper::getFrameRate() const {
    return frame_rate;
}

void EmulatorWrapper::startEmulationThread() {
    if (emulation_running) {
        return;
    }

    should_stop = false;
    emulation_running = true;
    emulation_thread = std::thread(&EmulatorWrapper::emulationLoop, this);
}

void EmulatorWrapper::stopEmulationThread() {
    if (!emulation_running) {
        return;
    }

    should_stop = true;
    if (emulation_thread.joinable()) {
        emulation_thread.join();
    }
    emulation_running = false;
}

void EmulatorWrapper::emulationLoop() {
    auto last_frame_time = std::chrono::steady_clock::now();
    const auto frame_duration = std::chrono::microseconds(16639); // ~60 FPS

    while (!should_stop) {
        if (rom_loaded && !Settings.Paused && !Settings.StopEmulation) {
            runFrame();
        }

        // Throttle to maintain frame rate
        auto now = std::chrono::steady_clock::now();
        auto elapsed = std::chrono::duration_cast<std::chrono::microseconds>(now - last_frame_time);
        if (elapsed < frame_duration) {
            std::this_thread::sleep_for(frame_duration - elapsed);
        }
        last_frame_time = std::chrono::steady_clock::now();
    }
}

void EmulatorWrapper::processVideoFrame() {
    if (!video_callback || !GFX.Screen) {
        return;
    }

    int width = frame_width;
    int height = frame_height;
    int stride = GFX.RealPPL * sizeof(uint16_t);
    
    video_callback(GFX.Screen, width, height, stride, frame_rate);
}

void EmulatorWrapper::processAudioSamples() {
    std::lock_guard<std::mutex> lock(audio_mutex);
    
    if (!audio_callback) {
        return;
    }

    // Get audio samples from APU
    int samples_available = S9xGetSampleCount();
    if (samples_available > 0) {
        // Allocate buffer for stereo samples (16-bit each)
        audio_buffer.resize(samples_available * 2);
        // Mix samples into buffer (S9xMixSamples expects bytes, stereo = samples * 2 * 2 bytes)
        S9xMixSamples((uint8_t*)audio_buffer.data(), samples_available);
        audio_callback(audio_buffer.data(), samples_available);
    }
}


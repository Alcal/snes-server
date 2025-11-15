#ifndef EMULATOR_WRAPPER_H
#define EMULATOR_WRAPPER_H

#include <string>
#include <functional>
#include <mutex>
#include <thread>
#include <atomic>
#include <vector>
#include <queue>

// Forward declarations
struct SGFX;

class EmulatorWrapper {
public:
    EmulatorWrapper();
    ~EmulatorWrapper();

    // Initialization
    bool init();
    void deinit();

    // ROM management
    bool loadROM(const std::string& filename);
    bool loadROMMem(const uint8_t* data, size_t size, const std::string& name = "");
    bool isROMLoaded() const { return rom_loaded; }

    // Emulation control
    void runFrame();
    void reset();
    void softReset();
    void setPaused(bool paused);
    bool isPaused() const;

    // State management
    bool saveState(int slot);
    bool loadState(int slot);
    bool saveStateToFile(const std::string& filename);
    bool loadStateFromFile(const std::string& filename);

    // Control input
    void setButtonState(int port, uint16_t buttons);
    void setAxisState(int port, int axis, int16_t value);
    void setMousePosition(int port, int16_t x, int16_t y);
    void setMouseButtons(int port, bool left, bool right);

    // Video/Audio callbacks
    void setVideoCallback(std::function<void(const uint16_t*, int, int, int, double)> callback);
    void setAudioCallback(std::function<void(const int16_t*, int)> callback);

    // Frame info
    int getFrameWidth() const;
    int getFrameHeight() const;
    double getFrameRate() const;

    // Thread management
    void startEmulationThread();
    void stopEmulationThread();
    bool isRunning() const { return emulation_running; }

    // Public for C callbacks
    void processVideoFrame();
    void processAudioSamples();

private:
    void emulationLoop();

    std::atomic<bool> rom_loaded;
    std::atomic<bool> emulation_running;
    std::atomic<bool> should_stop;
    std::thread emulation_thread;
    std::mutex emulation_mutex;

    std::function<void(const uint16_t*, int, int, int, double)> video_callback;
    std::function<void(const int16_t*, int)> audio_callback;

    // Audio buffer
    std::vector<int16_t> audio_buffer;
    std::mutex audio_mutex;

    // Video frame info
    int frame_width;
    int frame_height;
    double frame_rate;
};

#endif // EMULATOR_WRAPPER_H


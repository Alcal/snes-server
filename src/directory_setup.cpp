// Minimal directory setup for Node.js interface
// This provides basic implementations of directory functions needed by Snes9x

#include "./core/snes9x.h"
#include "./core/fscompat.h"
#include "./core/memmap.h"
#include "./core/apu/apu.h"
#include "./core/display.h"
#include "./core/stream.h"
#include <string>
#include <cstring>
#include <sys/stat.h>
#include <sys/types.h>

#ifdef __WIN32__
#include <direct.h>
#include <windows.h>
#include <shlobj.h>
#define mkdir(path, mode) _mkdir(path)
#define SLASH_STR "\\"
#else
#include <unistd.h>
#include <pwd.h>
#define SLASH_STR "/"
#endif

static std::string s9x_base_dir;
static bool base_dir_initialized = false;

static void init_base_dir() {
    if (base_dir_initialized) return;
    
#ifdef __WIN32__
    char path[MAX_PATH];
    if (SUCCEEDED(SHGetFolderPathA(NULL, CSIDL_APPDATA, NULL, SHFOLDER_PIDL, path))) {
        s9x_base_dir = std::string(path) + SLASH_STR + "snes9x";
    } else {
        s9x_base_dir = ".snes9x";
    }
#else
    const char* home = getenv("HOME");
    if (home) {
        s9x_base_dir = std::string(home) + SLASH_STR + ".snes9x";
    } else {
        struct passwd* pw = getpwuid(getuid());
        if (pw) {
            s9x_base_dir = std::string(pw->pw_dir) + SLASH_STR + ".snes9x";
        } else {
            s9x_base_dir = ".snes9x";
        }
    }
#endif
    
    // Create base directory
    mkdir(s9x_base_dir.c_str(), 0755);
    
    base_dir_initialized = true;
}

std::string S9xGetDirectory(enum s9x_getdirtype dirtype) {
    init_base_dir();
    
    std::string dirname;
    
    switch (dirtype) {
        case DEFAULT_DIR:
        case HOME_DIR:
            dirname = s9x_base_dir;
            break;
            
        case SRAM_DIR:
            dirname = s9x_base_dir + SLASH_STR + "sram";
            break;
            
        case SNAPSHOT_DIR:
            dirname = s9x_base_dir + SLASH_STR + "snapshots";
            break;
            
        case SCREENSHOT_DIR:
            dirname = s9x_base_dir + SLASH_STR + "screenshots";
            break;
            
        case SPC_DIR:
            dirname = s9x_base_dir + SLASH_STR + "spc";
            break;
            
        case CHEAT_DIR:
            dirname = s9x_base_dir + SLASH_STR + "cheats";
            break;
            
        case PATCH_DIR:
            dirname = s9x_base_dir + SLASH_STR + "patches";
            break;
            
        case BIOS_DIR:
            dirname = s9x_base_dir + SLASH_STR + "bios";
            break;
            
        case ROMFILENAME_DIR: {
            if (!Memory.ROMFilename.empty()) {
                size_t pos = Memory.ROMFilename.find_last_of(SLASH_STR);
                if (pos != std::string::npos) {
                    dirname = Memory.ROMFilename.substr(0, pos);
                } else {
                    dirname = ".";
                }
            } else {
                dirname = ".";
            }
            break;
        }
        
        default:
            dirname = s9x_base_dir;
            break;
    }
    
    // Create directory if it doesn't exist
    if (dirtype != ROMFILENAME_DIR && dirname != ".") {
        mkdir(dirname.c_str(), 0755);
    }
    
    return dirname;
}

// Platform-specific function stubs for Node.js interface
// These are required by the Snes9x core but don't need full implementations
// since we handle I/O through Node.js callbacks

// Sound device stub - we handle audio through callbacks, not a system device
bool8 S9xOpenSoundDevice(void) {
    return TRUE;
}

// Display stubs - we handle video through callbacks
bool8 S9xInitUpdate(void) {
    return TRUE;
}

void S9xExtraUsage(void) {
    // No-op for Node.js interface
}

// Input device stub - we handle input through Node.js callbacks
void S9xInitInputDevices(void) {
    // No-op for Node.js interface - input is handled via setButtonState()
}

// Snapshot file functions - required by snapshot.cpp
bool8 S9xOpenSnapshotFile(const char *filename, bool8 read_only, STREAM *file) {
    if (read_only) {
        if ((*file = OPEN_STREAM(filename, "rb"))) {
            return TRUE;
        }
    } else {
        if ((*file = OPEN_STREAM(filename, "wb"))) {
            return TRUE;
        }
    }
    return FALSE;
}

void S9xCloseSnapshotFile(STREAM file) {
    CLOSE_STREAM(file);
}

// Note: S9xGetFilename, S9xGetFilenameInc, S9xBasename, and S9xBasenameNoExt
// are already implemented in fscompat.cpp, so we don't need to redefine them here.
// This file provides S9xGetDirectory and platform-specific stubs.


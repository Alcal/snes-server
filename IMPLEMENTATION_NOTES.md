# Implementation Notes

## Overview

This document provides implementation notes and important considerations for the Snes9x Node.js interface.

## Architecture Summary

The interface consists of several layers:

1. **C++ Emulator Wrapper** (`src/emulator_wrapper.cpp`)
   - Wraps the Snes9x core functionality
   - Handles video/audio callbacks
   - Manages emulation thread

2. **Node.js Addon** (`src/addon.cpp`)
   - Provides JavaScript bindings using node-addon-api
   - Bridges Node.js and C++ code

3. **Node.js Server** (`lib/server.js`)
   - HTTP API for ROM management
   - WebSocket servers for video/audio/control
   - Handles client connections

4. **Web Client** (`public/client.js`, `public/index.html`)
   - Browser-based interface
   - Connects to WebSocket streams
   - Provides virtual controller

## Important Implementation Details

### Directory Setup

The Snes9x core requires directory paths to be set up. You may need to implement or configure:

- `S9xGetDirectory()` - Returns paths for various directories (SRAM, snapshots, etc.)
- `SRAM_DIR`, `SNAPSHOT_DIR`, etc. - Directory constants

These are typically handled in platform-specific code (unix.cpp, win32.cpp, etc.). For the Node.js interface, you may need to:

1. Create a minimal directory setup function
2. Set up default directories in the `init()` function
3. Ensure directories exist before use

### Video Output

The video callback receives frames in RGB565 format (16-bit). The server converts these to RGB24 for web streaming. Key points:

- Frame size: 256x224 (standard) or 512x448 (high-res)
- Format conversion happens in `lib/server.js`
- WebSocket sends binary data with frame metadata

### Audio Output

Audio is captured through the `S9xSamplesAvailableCallback`:

- Sample rate: 32040 Hz (SNES native) or 48000 Hz (resampled)
- Format: 16-bit stereo PCM
- Buffer management is critical to prevent dropouts

### Control Input

SNES controllers use a bitmask format:
- Each button is represented by a bit in a 16-bit value
- Button states are set via `MovieSetJoypad()` or direct joypad access
- Multiple ports supported (0-7)

### Threading

The emulation runs in a separate thread:
- Main thread: Node.js event loop
- Emulation thread: Runs `S9xMainLoop()` continuously
- Synchronization: Mutexes protect shared state

## Build Requirements

### Include Paths

The `binding.gyp` file includes paths relative to the Snes9x source:
- `../` - Root of Snes9x source
- `../apu` - Audio processing unit
- `../apu/bapu` - BSNES audio processing

You may need to adjust these paths based on your directory structure.

### Linking

The addon needs to link against:
- Snes9x core libraries (if built separately)
- Or compile all Snes9x source files together

Consider creating a static library or including all necessary source files in the build.

### Platform-Specific Code

Some Snes9x code is platform-specific. You may need to:
- Define appropriate platform macros
- Provide minimal implementations for platform functions
- Handle platform-specific includes

## Known Issues and TODOs

1. **Directory Functions**: `S9xGetDirectory()` needs implementation or configuration
2. **File Loading**: ROM file paths need to be absolute or properly resolved
3. **Audio Buffer Size**: May need tuning based on latency requirements
4. **Error Handling**: Add more robust error handling throughout
5. **Memory Management**: Ensure proper cleanup on shutdown
6. **State Management**: Save/load state paths need verification

## Testing

To test the implementation:

1. **Build the addon**:
   ```bash
   npm run build
   ```

2. **Start the server**:
   ```bash
   npm start
   ```

3. **Load a ROM**:
   - Use the web interface to select a ROM file
   - Or send a POST request to `/api/load-rom`

4. **Test controls**:
   - Use the on-screen buttons
   - Or send WebSocket messages to `/control`

5. **Verify streaming**:
   - Check video WebSocket receives frames
   - Check audio WebSocket receives samples

## Performance Considerations

- **Frame Rate**: Target 60 FPS (NTSC) or 50 FPS (PAL)
- **Latency**: WebSocket adds ~16-33ms latency per frame
- **Bandwidth**: Video stream ~5-10 Mbps uncompressed
- **CPU Usage**: Emulation is CPU-intensive, monitor usage

## Security Considerations

- **ROM Files**: Validate ROM files before loading
- **File Paths**: Sanitize file paths to prevent directory traversal
- **WebSocket**: Consider authentication for remote access
- **Rate Limiting**: Limit control input rate to prevent abuse

## Future Enhancements

- **Compression**: Add JPEG/WebP compression for video
- **WebRTC**: Implement WebRTC for lower latency
- **Multiplayer**: Support multiple simultaneous players
- **Recording**: Add frame/audio recording capabilities
- **Cheats**: Expose cheat code functionality
- **Netplay**: Integrate existing netplay functionality

## Debugging

Enable debug logging:
- Set `NP_DEBUG` for network debugging
- Add console.log statements in JavaScript
- Use C++ debugger for native code

Common issues:
- **Build failures**: Check include paths and compiler flags
- **Runtime crashes**: Check memory initialization
- **No video**: Verify video callback is set
- **No audio**: Check audio callback and buffer setup

## References

- Snes9x documentation: `docs/porting.html`
- Node.js Addon API: https://nodejs.org/api/n-api.html
- WebSocket API: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket


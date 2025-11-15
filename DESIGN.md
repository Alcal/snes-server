# Snes9x Node.js Interface Design

## Overview

This document describes the architecture for mounting the Snes9x SNES emulation core on a Node.js server, enabling web-based streaming and control through simulated inputs.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Node.js Server                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Node.js Addon (C++ Bindings)                │   │
│  │  ┌──────────────────────────────────────────────┐   │   │
│  │  │         Snes9x Core (C++)                    │   │   │
│  │  │  - S9xMainLoop()                             │   │   │
│  │  │  - Video output callback                     │   │   │
│  │  │  - Audio output callback                     │   │   │
│  │  │  - Control input interface                   │   │   │
│  │  └──────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         WebSocket Server                             │   │
│  │  - Control input handling                           │   │
│  │  - State synchronization                            │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         HTTP/WebRTC Server                           │   │
│  │  - Video streaming (WebRTC/HLS/WebSocket)          │   │
│  │  - Audio streaming                                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/WebSocket
                              ▼
                    ┌─────────────────┐
                    │  Web Client     │
                    │  - Video player │
                    │  - Controller   │
                    └─────────────────┘
```

## Components

### 1. Node.js Addon (C++ Bindings)

**Purpose**: Bridge between Node.js and the Snes9x C++ core.

**Key Functions**:
- `init()` - Initialize emulator
- `loadROM(filename)` - Load ROM file
- `runFrame()` - Execute one emulation frame
- `setButtonState(port, buttons)` - Set controller button state
- `setAxisState(port, axis, value)` - Set controller axis state
- `getVideoFrame()` - Get current video frame buffer
- `getAudioSamples()` - Get audio samples buffer
- `reset()` - Reset emulator
- `saveState(slot)` - Save state
- `loadState(slot)` - Load state

**Video Output**:
- Capture frames from `GFX.Screen` buffer (16-bit RGB565)
- Convert to formats suitable for web streaming (RGB24, RGBA, or JPEG)
- Frame rate: ~60 FPS (NTSC) or ~50 FPS (PAL)

**Audio Output**:
- Capture samples from APU output
- Format: 16-bit stereo PCM, 32040 Hz (SNES native) or resampled to 48000 Hz
- Buffer management to prevent audio dropouts

### 2. Control Input Interface

**SNES Controller Mapping**:
- Port 1 & 2: Standard SNES controllers
- Buttons: A, B, X, Y, L, R, Start, Select, D-Pad (Up, Down, Left, Right)
- Mouse: Port 1 or 2 can be mouse
- Super Scope: Light gun support
- Justifier: Light gun support

**Input Protocol** (WebSocket JSON):
```json
{
  "type": "input",
  "port": 0,
  "buttons": {
    "a": false,
    "b": false,
    "x": false,
    "y": false,
    "l": false,
    "r": false,
    "start": false,
    "select": false,
    "up": false,
    "down": false,
    "left": false,
    "right": false
  },
  "mouse": {
    "x": 0,
    "y": 0,
    "left": false,
    "right": false
  }
}
```

### 3. Video Streaming

**Options**:
1. **WebSocket Binary**: Send raw frame data over WebSocket
2. **WebRTC**: Low-latency peer-to-peer streaming
3. **HLS/MPEG-DASH**: HTTP-based adaptive streaming
4. **MJPEG Stream**: Simple HTTP stream with JPEG frames

**Recommended**: WebSocket binary for low latency, with optional WebRTC for better performance.

**Frame Format**:
- Resolution: 256x224 (standard) or 512x448 (high-res)
- Format: RGB565 → Converted to RGB24/RGBA for web
- Compression: Optional JPEG encoding per frame

### 4. Audio Streaming

**Format**:
- Sample rate: 48000 Hz (resampled from SNES native 32040 Hz)
- Channels: Stereo (2 channels)
- Bit depth: 16-bit PCM
- Transport: WebSocket binary or WebRTC audio track

### 5. Web Server Endpoints

**HTTP Endpoints**:
- `GET /` - Web client HTML page
- `GET /api/status` - Emulator status
- `POST /api/load-rom` - Load ROM file
- `POST /api/reset` - Reset emulator
- `POST /api/save-state/:slot` - Save state
- `POST /api/load-state/:slot` - Load state

**WebSocket Endpoints**:
- `ws://host/control` - Control input stream
- `ws://host/video` - Video frame stream
- `ws://host/audio` - Audio sample stream

## Implementation Details

### Threading Model

- **Main Thread**: Node.js event loop, handles HTTP/WebSocket
- **Emulation Thread**: Separate thread running `S9xMainLoop()` continuously
- **Video Thread**: Optional thread for video encoding/compression
- **Audio Thread**: Optional thread for audio processing

### Memory Management

- Video frames: Shared buffer between C++ and Node.js
- Audio samples: Ring buffer for smooth streaming
- ROM data: Loaded into emulator memory, managed by Snes9x

### Performance Considerations

- Frame skipping: Skip frames if client can't keep up
- Adaptive quality: Reduce resolution/quality under load
- Buffering: Small buffers for low latency, larger for stability

## File Structure

```
nodejs-interface/
├── DESIGN.md                 # This file
├── package.json              # Node.js dependencies
├── binding.gyp               # node-addon-api build config
├── src/
│   ├── addon.cpp             # C++ addon implementation
│   ├── addon.h               # C++ addon header
│   ├── emulator_wrapper.cpp  # Snes9x wrapper
│   └── emulator_wrapper.h    # Snes9x wrapper header
├── lib/
│   ├── server.js             # HTTP/WebSocket server
│   ├── emulator.js            # Node.js emulator interface
│   ├── video-stream.js        # Video streaming handler
│   ├── audio-stream.js        # Audio streaming handler
│   └── control-handler.js    # Control input handler
├── public/
│   ├── index.html            # Web client
│   ├── client.js             # Client-side JavaScript
│   └── controller.js         # Virtual controller
└── examples/
    └── simple-client.html    # Simple example client
```

## Dependencies

### Node.js
- `ws` - WebSocket server
- `express` - HTTP server
- `node-addon-api` - C++ addon API
- `sharp` or `jimp` - Image processing (optional, for JPEG encoding)

### Build Tools
- `node-gyp` - Build tool for native addons
- C++ compiler (GCC/Clang/MSVC)
- CMake (if needed for Snes9x build)

## Security Considerations

- ROM file validation
- Rate limiting on control inputs
- Authentication for remote access
- Input sanitization
- Resource limits (memory, CPU)

## Future Enhancements

- Multiplayer support (multiple controllers)
- Save state management API
- Cheat code support
- Recording/playback functionality
- Performance metrics and monitoring


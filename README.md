# Snes9x Node.js Interface

A Node.js interface for the Snes9x SNES emulator core, enabling web-based streaming and control.

## Features

- 🎮 Full SNES emulation through Node.js
- 🌐 Web-based streaming via WebSocket
- 🎯 Real-time control input
- 📺 Video streaming (RGB24 format)
- 🔊 Audio streaming (16-bit PCM stereo)
- 💾 Save state support
- ⌨️ Keyboard and mouse control

## Architecture

See [DESIGN.md](./DESIGN.md) for detailed architecture documentation.

## Prerequisites

- Node.js 16+ and npm
- C++ compiler (GCC/Clang/MSVC)
- CMake (for building Snes9x dependencies)
- Python 3 (for node-gyp)

## Installation

1. Install Node.js dependencies:
```bash
npm install
```

2. Build the native addon:
```bash
npm run build
```

Note: The build process will compile the C++ addon that interfaces with the Snes9x core. Make sure all Snes9x source files are accessible from the build directory.

## Usage

1. Start the server:
```bash
npm start
```

2. Open your browser to `http://localhost:3000`

3. Load a ROM file through the web interface

## API Endpoints

### HTTP Endpoints

- `GET /` - Web client interface
- `GET /api/status` - Get emulator status
- `POST /api/load-rom` - Load ROM file
  ```json
  { "filename": "/path/to/rom.smc" }
  ```
- `POST /api/reset` - Reset emulator
- `POST /api/pause` - Pause/unpause emulator
  ```json
  { "paused": true }
  ```
- `POST /api/save-state/:slot` - Save state (0-9)
- `POST /api/load-state/:slot` - Load state (0-9)

### WebSocket Endpoints

- `ws://host/control` - Control input stream
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
    }
  }
  ```

- `ws://host/video` - Video frame stream (binary)
- `ws://host/audio` - Audio sample stream (binary)

## Control Mapping

### Keyboard Defaults
- **Z** - A button
- **X** - B button
- **A** - X button
- **S** - Y button
- **Q** - L button
- **W** - R button
- **Enter** - Start
- **Shift** - Select
- **Arrow Keys** - D-Pad

### SNES Button Masks
- A: `0x80`
- B: `0x8000`
- X: `0x40`
- Y: `0x4000`
- L: `0x20`
- R: `0x10`
- Start: `0x1000`
- Select: `0x2000`
- Up: `0x800`
- Down: `0x400`
- Left: `0x200`
- Right: `0x100`

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

## Troubleshooting

### Build Errors

If you encounter build errors, ensure:
1. All Snes9x source files are present
2. Include paths in `binding.gyp` are correct
3. Required libraries are installed

### Runtime Errors

- Check that ROM files are accessible
- Verify WebSocket connections are working
- Check server logs for detailed error messages

## License

This interface follows the same license as Snes9x. See the LICENSE file in the root directory.

## Contributing

Contributions are welcome! Please ensure:
- Code follows existing style
- Tests pass
- Documentation is updated

## Future Enhancements

- Multiplayer support
- WebRTC streaming for lower latency
- HLS/MPEG-DASH support
- Recording/playback functionality
- Performance monitoring


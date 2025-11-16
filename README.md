# Snes9x Node.js Interface

A Node.js interface for the Snes9x SNES emulator core, enabling web-based streaming and control.

## Features

- 🎮 Full SNES emulation through Node.js
- 🌐 Web-based streaming via WebSocket
- 🐰 RabbitMQ integration for distributed control input
- 🎯 Real-time control input (WebSocket and RabbitMQ)
- 📺 Video streaming (RGB24 format)
- 🔊 Audio streaming (16-bit PCM stereo)
- 💾 Save state support
- ⌨️ Keyboard and mouse control
- 🔔 ROM loaded event notifications

## Architecture

See [DESIGN.md](./DESIGN.md) for detailed architecture documentation.

## Prerequisites

- Node.js 16+ and npm
- C++ compiler (GCC/Clang/MSVC)
- CMake (for building Snes9x dependencies)
- Python 3 (for node-gyp)
- RabbitMQ server or CloudAMQP account (for RabbitMQ features)

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

1. Set up environment variables (create a `.env` file):
```bash
CLOUDAMQP_URL=amqp://user:password@host:port/vhost
PORT=3000
HOST=0.0.0.0
```

2. Start the server:
```bash
npm start
```

3. Open your browser to `http://localhost:3000`

4. Load a ROM file through the web interface

Note: The server will automatically load a ROM file on startup if available.

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

The server supports multiple WebSocket endpoints for different purposes:

#### `ws://host/control` - Control Input Stream
Send control input messages (JSON):
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

#### `ws://host/video` - Video Frame Stream (Binary)
Receives RGB24 video frames in binary format:
- Frame type byte: `0x01`
- Width (4 bytes, Uint32)
- Height (4 bytes, Uint32)
- RGB24 pixel data (width × height × 3 bytes)

#### `ws://host/audio` - Audio Sample Stream (Binary)
Receives 16-bit PCM stereo audio samples in binary format:
- Audio type byte: `0x02`
- Sample count (4 bytes, Uint32)
- Audio buffer (samples × 2 channels × 2 bytes per sample)

#### `ws://host/romLoaded` - ROM Loaded Event
Receives notifications when a ROM is loaded:
```json
{
  "type": "romLoaded"
}
```

### RabbitMQ Integration

The server integrates with RabbitMQ for distributed control input, allowing multiple clients to send control commands through a message queue.

#### Configuration

Set the `CLOUDAMQP_URL` environment variable to your RabbitMQ connection string:
```bash
CLOUDAMQP_URL=amqp://user:password@host:port/vhost
```

#### RabbitMQ Setup

The server consumes control messages from RabbitMQ using the following configuration:

- **Exchange**: `control_exchange` (Topic exchange, durable)
- **Queue**: `control_queue` (Durable)
- **Routing Key**: `control`

#### Publishing Control Messages to RabbitMQ

Clients can publish control messages to the RabbitMQ exchange:

```json
{
  "type": "input",
  "port": 0,
  "buttons": {
    "a": true,
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

Publish to:
- **Exchange**: `control_exchange`
- **Routing Key**: `control`

The server will automatically consume these messages and forward them to the emulator.

#### Message Processing

- Messages are acknowledged (`ACK`) on successful processing
- Messages are requeued (`REQUEUE`) on processing errors
- The server supports graceful shutdown and will close RabbitMQ connections properly

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
- Verify RabbitMQ connection (`CLOUDAMQP_URL` environment variable is set correctly)
- Check server logs for detailed error messages

### RabbitMQ Connection Issues

If RabbitMQ features are not working:
1. Ensure `CLOUDAMQP_URL` environment variable is set
2. Verify the RabbitMQ server is accessible
3. Check that the exchange and queue are created correctly
4. Review server logs for connection errors

## License

This interface follows the same license as Snes9x. See the LICENSE file in the root directory.

## Contributing

Contributions are welcome! Please ensure:
- Code follows existing style
- Tests pass
- Documentation is updated

## Architecture Details

### WebSocket Architecture

The WebSocket server uses a factory pattern for publishers and supports multiple client connections per endpoint:
- Each WebSocket path maintains its own set of connected clients
- Publishers broadcast messages to all connected clients on their respective paths
- Binary data is used for video and audio streams for efficiency
- JSON messages are used for control and event notifications

### RabbitMQ Architecture

The RabbitMQ integration follows a consumer pattern:
- The server consumes messages from a topic exchange
- Control messages are processed asynchronously
- Supports graceful connection handling and error recovery
- Publisher factory is available for future server-to-client messaging

## Future Enhancements

- Multiplayer support
- WebRTC streaming for lower latency
- HLS/MPEG-DASH support
- Recording/playback functionality
- Performance monitoring
- RabbitMQ publisher implementation for server-to-client messaging


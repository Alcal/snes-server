# Quick Start Guide

Get the Snes9x Node.js interface up and running quickly!

## Prerequisites Check

```bash
# Check Node.js version (need 16+)
node --version

# Check npm
npm --version

# Check C++ compiler
g++ --version  # or clang++ --version on macOS
```

## Build Steps

### 1. Install Dependencies

```bash
cd nodejs-interface
npm install
```

### 2. Build Native Addon

This compiles both the Snes9x core and the Node.js wrapper:

```bash
npm run build
```

**Note**: First build may take 5-10 minutes as it compiles ~100+ source files.

### 3. Start the Server

```bash
npm start
```

The server will start on `http://localhost:3000`

### 4. Open in Browser

Open `http://localhost:3000` in your web browser.

### 5. Load a ROM

1. Click "Load ROM" button
2. Select a SNES ROM file (.smc, .sfc, etc.)
3. The ROM will load and emulation will start automatically

## Troubleshooting

### Build Fails

- **Missing files**: Ensure you're in the `nodejs-interface` directory and parent directory contains Snes9x source
- **Compiler errors**: Check compiler version supports C++17
- **Permission errors**: Try `sudo npm install` (Linux) or run as administrator (Windows)

### Server Won't Start

- **Port in use**: Change port in `lib/server.js` or set `PORT` environment variable
- **Module not found**: Ensure build completed successfully
- **Permission denied**: Check file permissions

### ROM Won't Load

- **File path**: Use absolute paths or ensure ROM is accessible
- **File format**: Ensure ROM is a valid SNES ROM (.smc, .sfc, .swc, etc.)
- **Check logs**: Look for error messages in console

## Quick Test

Test that the addon loads correctly:

```bash
node -e "const addon = require('./build/Release/snes9x_addon.node'); console.log('Addon loaded:', !!addon.Snes9xAddon);"
```

Should output: `Addon loaded: true`

## Next Steps

- Read [BUILD.md](./BUILD.md) for detailed build instructions
- Read [README.md](./README.md) for API documentation
- Read [DESIGN.md](./DESIGN.md) for architecture details

## Example Usage

### Load ROM via API

```bash
curl -X POST http://localhost:3000/api/load-rom \
  -H "Content-Type: application/json" \
  -d '{"filename": "/path/to/game.smc"}'
```

### Reset Emulator

```bash
curl -X POST http://localhost:3000/api/reset
```

### Save State

```bash
curl -X POST http://localhost:3000/api/save-state/0
```

### Load State

```bash
curl -X POST http://localhost:3000/api/load-state/0
```

## Keyboard Controls

- **Z** - A button
- **X** - B button  
- **A** - X button
- **S** - Y button
- **Q** - L button
- **W** - R button
- **Enter** - Start
- **Shift** - Select
- **Arrow Keys** - D-Pad

## Performance Tips

- Close other applications for better performance
- Use wired connection for lower latency
- Adjust frame rate in settings if needed
- Monitor CPU usage - emulation is CPU-intensive


# Build Instructions

This document provides detailed instructions for building the Snes9x Node.js interface, including both the core emulator and the Node.js wrapper.

## Prerequisites

### Required Tools

- **Node.js** 16+ and npm
- **C++ Compiler**:
  - Linux: GCC 7+ or Clang 8+
  - macOS: Xcode Command Line Tools (Clang)
  - Windows: Visual Studio 2019+ or Build Tools
- **Python 3** (for node-gyp)
- **Make** (Linux/macOS) or Visual Studio (Windows)

### Optional Dependencies

- **zlib** (usually included with system)
- **pthread** (usually included with system)

## Building

### Step 1: Install Node.js Dependencies

```bash
cd nodejs-interface
npm install
```

This will install:
- `ws` - WebSocket server
- `express` - HTTP server
- `node-addon-api` - C++ addon API
- `node-gyp` - Build tool

### Step 2: Build the Native Addon

The build process compiles:
1. All Snes9x core source files (~80+ files)
2. APU (Audio Processing Unit) files
3. Node.js addon wrapper
4. Directory setup functions

```bash
npm run build
```

Or directly:
```bash
node-gyp rebuild
```

### Build Output

After successful build, you should see:
- `build/Release/snes9x_addon.node` - The compiled native addon

## Platform-Specific Notes

### Linux

```bash
# Install build essentials
sudo apt-get install build-essential python3

# Build
npm run build
```

### macOS

```bash
# Install Xcode Command Line Tools
xcode-select --install

# Build
npm run build
```

### Windows

```powershell
# Install Visual Studio Build Tools or Visual Studio
# Ensure "Desktop development with C++" workload is installed

# Build
npm run build
```

## Troubleshooting

### Build Errors

#### "Cannot find header file"
- **Solution**: Check that all Snes9x source files are present in the parent directory
- Verify include paths in `binding.gyp` are correct

#### "Undefined reference to..."
- **Solution**: Ensure all source files are listed in `binding.gyp`
- Check that platform-specific files are included (e.g., `iowin32.c` on Windows)

#### "Multiple definition of..."
- **Solution**: Some files may be included multiple times
- Check for duplicate entries in `sources` array

#### Compiler version issues
- **Solution**: Ensure C++17 support (GCC 7+, Clang 5+, MSVC 2017+)
- Update compiler if needed

### Runtime Errors

#### "Cannot find module 'snes9x_addon'"
- **Solution**: Ensure build completed successfully
- Check that `build/Release/snes9x_addon.node` exists
- Verify Node.js version matches build target

#### "S9xGetDirectory not found"
- **Solution**: Ensure `directory_setup.cpp` is compiled
- Check that it's listed in `binding.gyp` sources

#### Memory errors
- **Solution**: Ensure proper initialization order
- Check that `Memory.Init()` is called before other functions

## Build Configuration

### Customizing Build

Edit `binding.gyp` to:
- Add/remove source files
- Change compiler flags
- Modify include paths
- Add platform-specific settings

### Debug Build

For debugging, modify `binding.gyp`:

```json
"cflags_cc": [
  "-std=c++17",
  "-g",
  "-O0"
]
```

### Release Build

For optimized release build:

```json
"cflags_cc": [
  "-std=c++17",
  "-O3",
  "-DNDEBUG"
]
```

## Verification

After building, verify the addon loads:

```bash
node -e "console.log(require('./build/Release/snes9x_addon.node'))"
```

You should see the exported object with `Snes9xAddon` class.

## Clean Build

To clean and rebuild:

```bash
node-gyp clean
npm run build
```

## File Structure After Build

```
nodejs-interface/
├── build/
│   └── Release/
│       └── snes9x_addon.node    # Compiled addon
├── node_modules/                # Node.js dependencies
├── src/                        # Source files
├── lib/                        # JavaScript files
└── public/                     # Web client files
```

## Next Steps

After successful build:

1. **Test the server**:
   ```bash
   npm start
   ```

2. **Load a ROM** through the web interface

3. **Check logs** for any runtime errors

## Performance Notes

- **Compile time**: First build may take 5-10 minutes (compiling ~80+ files)
- **Binary size**: ~5-10 MB (depending on optimizations)
- **Memory usage**: ~50-100 MB at runtime

## Advanced: Building as Static Library

If you prefer to build Snes9x as a static library first:

1. Create a CMakeLists.txt or Makefile for Snes9x core
2. Build static library
3. Link against it in `binding.gyp`

This approach can speed up rebuilds but requires more setup.


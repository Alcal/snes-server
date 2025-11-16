const EmulatorInterface = require('./emulator_interface');
const path = require('path');

class EmulatorHandler {
    constructor(callbacks = {}) {
        this.emulator = new EmulatorInterface();
        if (!this.emulator.init()) {
            console.error('Failed to initialize emulator');
            process.exit(1);
        }

        // Store callbacks
        this.onVideo = callbacks.onVideo;
        this.onAudio = callbacks.onAudio;
        this.onRomLoaded = callbacks.onRomLoaded;

        // Set up event handlers
        this.emulator.on('video', (buffer, width, height, stride, frameRate) => {
            if (this.onVideo) {
                // Convert RGB565 to RGB24 for web
                const rgb24 = this.convertRGB565ToRGB24(buffer, width, height, stride);
                this.onVideo(rgb24, width, height, frameRate);
            }
        });

        this.emulator.on('audio', (buffer, samples) => {
            if (this.onAudio) {
                this.onAudio(buffer, samples);
            }
        });

        this.emulator.on('romLoaded', () => {
            console.log('ROM loaded, loading quicksave...');
            // Load quicksave immediately after ROM loads
            const quicksavePath = path.join(__dirname, 'quicksave.sav');
            const quicksaveLoaded = this.emulator.loadStateFromFile(quicksavePath);
            if (quicksaveLoaded) {
                console.log('Quicksave loaded successfully');
            } else {
                console.log('No quicksave found or failed to load (this is OK if starting fresh)');
            }
            console.log('Starting emulation thread');
            this.emulator.startEmulationThread();
            
            if (this.onRomLoaded) {
                this.onRomLoaded();
            }
        });
    }

    loadROM(filename) {
        return this.emulator.loadROM(filename);
    }

    // Handle control input
    handleControlInput(data) {
        if (data.type === 'input') {
            const { port, buttons } = data;
            
            // Convert button object to SNES button mask
            let buttonMask = 0;
            if (buttons.a) buttonMask |= 0x80;      // SNES_A_MASK
            if (buttons.b) buttonMask |= 0x8000;    // SNES_B_MASK
            if (buttons.x) buttonMask |= 0x40;     // SNES_X_MASK
            if (buttons.y) buttonMask |= 0x4000;   // SNES_Y_MASK
            if (buttons.l) buttonMask |= 0x20;     // SNES_TL_MASK
            if (buttons.r) buttonMask |= 0x10;     // SNES_TR_MASK
            if (buttons.start) buttonMask |= 0x1000;  // SNES_START_MASK
            if (buttons.select) buttonMask |= 0x2000; // SNES_SELECT_MASK
            if (buttons.up) buttonMask |= 0x800;    // SNES_UP_MASK
            if (buttons.down) buttonMask |= 0x400;  // SNES_DOWN_MASK
            if (buttons.left) buttonMask |= 0x200;  // SNES_LEFT_MASK
            if (buttons.right) buttonMask |= 0x100; // SNES_RIGHT_MASK
            
            this.emulator?.setButtonState(port || 0, buttonMask);
            
        } else if (data.type === 'mouse') {
            const { port, x, y, left, right } = data;
            this.emulator?.setMousePosition(port || 0, x, y);
            if (left !== undefined || right !== undefined) {
                this.emulator?.setMouseButtons(port || 0, left || false, right || false);
            }
        } else if (data.type === 'reset') {
            this.emulator?.reset();
        } else if (data.type === 'pause') {
            this.emulator?.setPaused(data.paused !== undefined ? data.paused : true);
        }
    }

    // Convert RGB565 to RGB24
    convertRGB565ToRGB24(buffer, width, height, stride) {
        const rgb24 = Buffer.allocUnsafe(width * height * 3);
        const source = new Uint16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const srcIdx = y * (stride / 2) + x;
                const dstIdx = (y * width + x) * 3;
                
                const pixel = source[srcIdx];
                const r = ((pixel >> 11) & 0x1F) << 3;
                const g = ((pixel >> 5) & 0x3F) << 2;
                const b = (pixel & 0x1F) << 3;
                
                rgb24[dstIdx] = r;
                rgb24[dstIdx + 1] = g;
                rgb24[dstIdx + 2] = b;
            }
        }
        
        return rgb24;
    }

    // Expose emulator methods for convenience
    getEmulator() {
        return this.emulator;
    }
}

module.exports = EmulatorHandler;
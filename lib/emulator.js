const addon = require('../build/Release/snes9x_addon.node');
const { EventEmitter } = require('events');

class Emulator extends EventEmitter {
    constructor() {
        super();
        this.addon = new addon.Snes9xAddon();
        this.romLoaded = false;
        this.paused = false;
        this.frameWidth = 256;
        this.frameHeight = 224;
        this.frameRate = 60.0;
        
        // Set up callbacks
        this.addon.setVideoCallback((buffer, width, height, stride, frameRate) => {
            this.frameWidth = width;
            this.frameHeight = height;
            this.frameRate = frameRate;
            this.emit('video', buffer, width, height, stride, frameRate);
        });
        
        this.addon.setAudioCallback((buffer, samples) => {
            this.emit('audio', buffer, samples);
        });
    }

    init() {
        return this.addon.init();
    }

    deinit() {
        this.addon.deinit();
    }

    loadROM(filename) {
        const result = this.addon.loadROM(filename);
        if (result) {
            this.romLoaded = true;
            this.frameWidth = this.addon.getFrameWidth();
            this.frameHeight = this.addon.getFrameHeight();
            this.frameRate = this.addon.getFrameRate();
            this.emit('romLoaded', filename);
        }
        return result;
    }

    loadROMMem(buffer, name = '') {
        const result = this.addon.loadROMMem(buffer, name);
        if (result) {
            this.romLoaded = true;
            this.frameWidth = this.addon.getFrameWidth();
            this.frameHeight = this.addon.getFrameHeight();
            this.frameRate = this.addon.getFrameRate();
            this.emit('romLoaded', name || 'Memory ROM');
        }
        return result;
    }

    isROMLoaded() {
        return this.addon.isROMLoaded();
    }

    runFrame() {
        if (this.romLoaded) {
            this.addon.runFrame();
        }
    }

    reset() {
        if (this.romLoaded) {
            this.addon.reset();
            this.emit('reset');
        }
    }

    softReset() {
        if (this.romLoaded) {
            this.addon.softReset();
            this.emit('softReset');
        }
    }

    setPaused(paused) {
        this.paused = paused;
        this.addon.setPaused(paused);
        this.emit('paused', paused);
    }

    isPaused() {
        return this.addon.isPaused();
    }

    saveState(slot) {
        if (this.romLoaded) {
            return this.addon.saveState(slot);
        }
        return false;
    }

    loadState(slot) {
        if (this.romLoaded) {
            return this.addon.loadState(slot);
        }
        return false;
    }

    saveStateToFile(filename) {
        if (this.romLoaded) {
            return this.addon.saveStateToFile(filename);
        }
        return false;
    }

    loadStateFromFile(filename) {
        if (this.romLoaded) {
            return this.addon.loadStateFromFile(filename);
        }
        return false;
    }

    setButtonState(port, buttons) {
        this.addon.setButtonState(port, buttons);
    }

    setMousePosition(port, x, y) {
        this.addon.setMousePosition(port, x, y);
    }

    setMouseButtons(port, left, right) {
        this.addon.setMouseButtons(port, left, right);
    }

    startEmulationThread() {
        this.addon.startEmulationThread();
        this.emit('emulationStarted');
    }

    stopEmulationThread() {
        this.addon.stopEmulationThread();
        this.emit('emulationStopped');
    }

    getFrameInfo() {
        return {
            width: this.frameWidth,
            height: this.frameHeight,
            frameRate: this.frameRate
        };
    }
}

module.exports = Emulator;


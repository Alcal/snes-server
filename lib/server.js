// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const Emulator = require('./emulator');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Initialize emulator
const emulator = new Emulator();

if (!emulator.init()) {
    console.error('Failed to initialize emulator');
    process.exit(1);
}

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// API Routes
app.get('/api/status', (req, res) => {
    res.json({
        romLoaded: emulator.isROMLoaded(),
        paused: emulator.isPaused(),
        frameInfo: emulator.getFrameInfo()
    });
});

app.post('/api/load-rom', (req, res) => {
    const { filename } = req.body;
    if (!filename) {
        return res.status(400).json({ error: 'Filename required' });
    }
    
    const result = emulator.loadROM(filename);
    if (result) {
        res.json({ success: true, frameInfo: emulator.getFrameInfo() });
    } else {
        res.status(500).json({ error: 'Failed to load ROM' });
    }
});

app.post('/api/reset', (req, res) => {
    emulator.reset();
    res.json({ success: true });
});

app.post('/api/pause', (req, res) => {
    const { paused } = req.body;
    emulator.setPaused(paused !== undefined ? paused : true);
    res.json({ success: true, paused: emulator.isPaused() });
});

app.post('/api/save-state/:slot', (req, res) => {
    const slot = parseInt(req.params.slot);
    const result = emulator.saveState(slot);
    res.json({ success: result });
});

app.post('/api/load-state/:slot', (req, res) => {
    const slot = parseInt(req.params.slot);
    const result = emulator.loadState(slot);
    res.json({ success: result });
});

// Preset filename for save/load state to/from file
const SAVESTATE_FILENAME = path.join(__dirname, 'quicksave.sav');

app.post('/api/save-state-to-file', (req, res) => {
    const result = emulator.saveStateToFile(SAVESTATE_FILENAME);
    res.json({ success: result });
});

app.post('/api/load-state-from-file', (req, res) => {
    const result = emulator.loadStateFromFile(SAVESTATE_FILENAME);
    res.json({ success: result });
});

// WebSocket connections
const clients = {
    control: new Set(),
    video: new Set(),
    audio: new Set()
};

wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    console.log(`New WebSocket connection: ${pathname}`);

    if (pathname === '/control') {
        clients.control.add(ws);
        
        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                handleControlInput(data);
            } catch (error) {
                console.error('Error parsing control message:', error);
            }
        });

        ws.on('close', () => {
            clients.control.delete(ws);
        });

    } else if (pathname === '/video') {
        clients.video.add(ws);
        
        ws.on('close', () => {
            clients.video.delete(ws);
        });

    } else if (pathname === '/audio') {
        clients.audio.add(ws);
        
        ws.on('close', () => {
            clients.audio.delete(ws);
        });
    }
});

// Handle control input
function handleControlInput(data) {
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
        
        emulator.setButtonState(port || 0, buttonMask);
        
    } else if (data.type === 'mouse') {
        const { port, x, y, left, right } = data;
        emulator.setMousePosition(port || 0, x, y);
        if (left !== undefined || right !== undefined) {
            emulator.setMouseButtons(port || 0, left || false, right || false);
        }
    } else if (data.type === 'reset') {
        emulator.reset();
    } else if (data.type === 'pause') {
        emulator.setPaused(data.paused !== undefined ? data.paused : true);
    }
}

// Video streaming
emulator.on('video', (buffer, width, height, stride, frameRate) => {
    if (clients.video.size === 0) return;
    
    // Convert RGB565 to RGB24 for web
    const rgb24 = convertRGB565ToRGB24(buffer, width, height, stride);
    
    // Send to all video clients
    const message = Buffer.concat([
        Buffer.from([0x01]), // Frame type
        Buffer.from(new Uint32Array([width, height]).buffer),
        rgb24
    ]);
    
    clients.video.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message, { binary: true });
        }
    });
});

// Audio streaming
emulator.on('audio', (buffer, samples) => {
    if (clients.audio.size === 0) return;
    
    // Send to all audio clients
    const message = Buffer.concat([
        Buffer.from([0x02]), // Audio type
        Buffer.from(new Uint32Array([samples]).buffer),
        buffer
    ]);
    
    clients.audio.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message, { binary: true });
        }
    });
});

// Convert RGB565 to RGB24
function convertRGB565ToRGB24(buffer, width, height, stride) {
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

// Start emulation thread
emulator.on('romLoaded', () => {
    console.log('ROM loaded, loading quicksave...');
    // Load quicksave immediately after ROM loads
    const quicksavePath = path.join(__dirname, 'quicksave.sav');
    const quicksaveLoaded = emulator.loadStateFromFile(quicksavePath);
    if (quicksaveLoaded) {
        console.log('Quicksave loaded successfully');
    } else {
        console.log('No quicksave found or failed to load (this is OK if starting fresh)');
    }
    console.log('Starting emulation thread');
    emulator.startEmulationThread();
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Snes9x Node.js server running on http://localhost:${PORT}`);
    console.log(`WebSocket endpoints:`);
    console.log(`  - ws://localhost:${PORT}/control - Control input`);
    console.log(`  - ws://localhost:${PORT}/video - Video stream`);
    console.log(`  - ws://localhost:${PORT}/audio - Audio stream`);
    
    // Auto-load ROM on server ready
    const romPath = path.join(__dirname, 'Street_Fighter_II_Turbo_USA.sfc');
    console.log(`Loading ROM: ${romPath}`);
    const result = emulator.loadROM(romPath);
    if (result) {
        console.log('ROM loaded successfully');
    } else {
        console.error('Failed to load ROM automatically');
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    emulator.stopEmulationThread();
    emulator.deinit();
    server.close(() => {
        process.exit(0);
    });
});

module.exports = { app, server, emulator };


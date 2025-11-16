// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const http = require('http');
const path = require('path');
const rabbitmq = require('./rabbitmq');
const setupRoutes = require('./routes');
const EmulatorHandler = require('./emulator/emulator_handler');
const WebSocketServer = require('./websocket/websockets_server');   
const webSocketConsumers = require('./websocket/websocket_consumers');
const webSocketPublishersFactory = require('./websocket/websocket_publishers'); 
const { WS_PATHS } = require('./websocket/ws_consts');

const app = express();
const server = http.createServer(app);

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// Setup WebSocket server
const { publishers: wsPublishers } = new WebSocketServer(server, webSocketConsumers, webSocketPublishersFactory);

const emulatorHandler = new EmulatorHandler({
    onVideo: (buffer, width, height, frameRate) => {
        wsPublishers[WS_PATHS.VIDEO]({rgb24: buffer, width, height, frameRate});
    },
    onAudio: (buffer, samples) => {
        wsPublishers[WS_PATHS.AUDIO]({buffer, samples});
    },
    onRomLoaded: () => {
        wsPublishers[WS_PATHS.ROM_LOADED]();
    },
});

rabbitmq.startRabbitMQConsumer({
    control: (data) => emulatorHandler.handleControlInput(data),
}).then(() => {
    console.log('RabbitMQ consumer started');
});
// Setup routes
setupRoutes(app, emulatorHandler);


// Start server
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces to allow Android connections
server.listen(PORT, HOST, () => {
    console.log(`Snes9x Node.js server running on http://${HOST}:${PORT}`);
    console.log(`WebSocket endpoints:`);
    console.log(`  - ws://${HOST}:${PORT}/control - Control input`);
    console.log(`  - ws://${HOST}:${PORT}/video - Video stream`);
    console.log(`  - ws://${HOST}:${PORT}/audio - Audio stream`);
    
    // Auto-load ROM on server ready
    const romPath = path.join(__dirname, 'Street_Fighter_II_Turbo_USA.sfc');
    console.log(`Loading ROM: ${romPath}`);
    const result = emulatorHandler.loadROM(romPath);
    if (result) {
        console.log('ROM loaded successfully');
    } else {
        console.error('Failed to load ROM automatically');
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    emulatorHandler.getEmulator().stopEmulationThread();
    emulatorHandler.getEmulator().deinit();
    rabbitmq.stopRabbitMQConsumer();
    server.close(() => {
        process.exit(0);
    });
});

module.exports = { app, server };

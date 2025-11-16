const path = require('path');

// Preset filename for save/load state to/from file
const SAVESTATE_FILENAME = path.join(__dirname, 'quicksave.sav');

function setupRoutes(app, emulatorHandler) {
    // API Routes
    app.get('/api/status', (req, res) => {
        res.json({
            romLoaded: emulatorHandler.getEmulator().isROMLoaded(),
            paused: emulatorHandler.getEmulator().isPaused(),
            frameInfo: emulatorHandler.getEmulator().getFrameInfo()
        });
    });

    app.get('/api/admin-enabled', (req, res) => {
        const adminEnabled = process.env.ADMIN_ENABLED === 'true' || process.env.ADMIN_ENABLED === '1';
        res.json({ adminEnabled });
    });

    app.post('/api/load-rom', (req, res) => {
        const { filename } = req.body;
        if (!filename) {
            return res.status(400).json({ error: 'Filename required' });
        }
        
        const result = emulatorHandler.getEmulator().loadROM(filename);
        if (result) {
            res.json({ success: true, frameInfo: emulatorHandler.getEmulator().getFrameInfo() });
        } else {
            res.status(500).json({ error: 'Failed to load ROM' });
        }
    });

    app.post('/api/reset', (req, res) => {
        emulatorHandler.getEmulator().reset();
        res.json({ success: true });
    });

    app.post('/api/pause', (req, res) => {
        const { paused } = req.body;
        emulatorHandler.getEmulator().setPaused(paused !== undefined ? paused : true);
        res.json({ success: true, paused: emulatorHandler.getEmulator().isPaused() });
    });

    app.post('/api/save-state/:slot', (req, res) => {
        const slot = parseInt(req.params.slot);
        const result = emulatorHandler.getEmulator().saveState(slot);
        res.json({ success: result });
    });

    app.post('/api/load-state/:slot', (req, res) => {
        const slot = parseInt(req.params.slot);
        const result = emulatorHandler.getEmulator().loadState(slot);
        res.json({ success: result });
    });

    app.post('/api/save-state-to-file', (req, res) => {
        const result = emulatorHandler.getEmulator().saveStateToFile(SAVESTATE_FILENAME);
        res.json({ success: result });
    });

    app.post('/api/load-state-from-file', (req, res) => {
        const result = emulatorHandler.getEmulator().loadStateFromFile(SAVESTATE_FILENAME);
        res.json({ success: result });
    });
}

module.exports = setupRoutes;


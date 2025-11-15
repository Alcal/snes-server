class Snes9xClient {
    constructor() {
        this.controlWS = null;
        this.videoWS = null;
        this.audioWS = null;
        this.canvas = document.getElementById('videoCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.buttons = {};
        this.selectedPlayer = 0; // Default to Player 1 (port 0)
        this.frameCount = 0;
        this.lastFpsTime = Date.now();
        
        // Audio setup
        this.audioContext = null;
        this.audioQueue = [];
        this.nextPlayTime = 0;
        this.snesSampleRate = 32000; // SNES audio sample rate (fixed)
        this.audioSampleRate = 32000; // Will be updated to AudioContext's actual rate
        this.audioEnabled = false;
        
        this.setupCanvas();
        this.setupControls();
        this.setupAudio();
        this.connect();
    }

    setupCanvas() {
        this.canvas.width = 256;
        this.canvas.height = 224;
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    setupAudio() {
        try {
            // Initialize AudioContext (use webkit prefix for Safari compatibility)
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) {
                console.warn('Web Audio API not supported');
                return;
            }
            
            // Try to create AudioContext with desired sample rate
            // Note: browser may use a different rate if not supported
            try {
                this.audioContext = new AudioContextClass({
                    sampleRate: this.snesSampleRate
                });
            } catch (e) {
                // Fallback to default sample rate if custom rate not supported
                this.audioContext = new AudioContextClass();
            }
            
            // Store actual sample rate from AudioContext (may differ from SNES rate)
            this.audioSampleRate = this.audioContext.sampleRate;
            
            // Audio will be enabled via button click (required for user interaction)
            console.log('Audio context initialized at', this.audioContext.sampleRate, 'Hz');
            this.updateAudioButton();
        } catch (error) {
            console.error('Failed to initialize audio context:', error);
        }
    }

    setupControls() {
        // Button handlers
        document.querySelectorAll('.snes-button, .dpad button').forEach(btn => {
            const buttonName = btn.dataset.button;
            if (!buttonName) return;

            btn.addEventListener('mousedown', () => this.pressButton(buttonName));
            btn.addEventListener('mouseup', () => this.releaseButton(buttonName));
            btn.addEventListener('mouseleave', () => this.releaseButton(buttonName));
        });

        // Keyboard handlers
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // File input
        document.getElementById('romFile').addEventListener('change', (e) => {
            this.loadROM(e.target.files[0]);
        });

        // Control buttons
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.sendControl({ type: 'reset' });
        });

        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.sendControl({ type: 'pause', paused: true });
        });

        document.getElementById('enableAudioBtn').addEventListener('click', () => {
            this.enableAudio();
        });

        document.getElementById('saveStateBtn').addEventListener('click', () => {
            this.saveState(0);
        });

        document.getElementById('loadStateBtn').addEventListener('click', () => {
            this.loadState(0);
        });

        document.getElementById('saveStateToFileBtn').addEventListener('click', () => {
            this.saveStateToFile();
        });

        document.getElementById('loadStateFromFileBtn').addEventListener('click', () => {
            this.loadStateFromFile();
        });

        // Player selection
        document.querySelectorAll('input[name="player"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.selectedPlayer = parseInt(e.target.value);
                // Clear current button states when switching players
                this.buttons = {};
                this.sendButtonState();
                console.log(`Switched to Player ${this.selectedPlayer + 1}`);
            });
        });
    }

    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;

        // Connect control WebSocket
        this.controlWS = new WebSocket(`${protocol}//${host}/control`);
        this.controlWS.onopen = () => {
            console.log('Control WebSocket connected');
            this.updateStatus(true);
        };
        this.controlWS.onerror = (error) => {
            console.error('Control WebSocket error:', error);
            this.updateStatus(false);
        };
        this.controlWS.onclose = () => {
            console.log('Control WebSocket closed');
            this.updateStatus(false);
            setTimeout(() => this.connect(), 1000);
        };

        // Connect video WebSocket
        this.videoWS = new WebSocket(`${protocol}//${host}/video`);
        this.videoWS.binaryType = 'arraybuffer';
        this.videoWS.onopen = () => {
            console.log('Video WebSocket connected');
        };
        this.videoWS.onmessage = (event) => {
            this.handleVideoFrame(event.data);
        };
        this.videoWS.onerror = (error) => {
            console.error('Video WebSocket error:', error);
        };
        this.videoWS.onclose = () => {
            console.log('Video WebSocket closed');
            setTimeout(() => this.connect(), 1000);
        };

        // Audio WebSocket will be connected when user enables audio
    }

    connectAudio() {
        if (this.audioWS && (this.audioWS.readyState === WebSocket.OPEN || this.audioWS.readyState === WebSocket.CONNECTING)) {
            return; // Already connected or connecting
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;

        // Connect audio WebSocket
        this.audioWS = new WebSocket(`${protocol}//${host}/audio`);
        this.audioWS.binaryType = 'arraybuffer';
        this.audioWS.onopen = () => {
            console.log('Audio WebSocket connected');
        };
        this.audioWS.onmessage = (event) => {
            this.handleAudioData(event.data);
        };
        this.audioWS.onerror = (error) => {
            console.error('Audio WebSocket error:', error);
        };
        this.audioWS.onclose = () => {
            console.log('Audio WebSocket closed');
            // Only reconnect if audio is still enabled
            if (this.audioEnabled) {
                setTimeout(() => this.connectAudio(), 1000);
            }
        };
    }

    handleVideoFrame(data) {
        const view = new DataView(data);
        const type = view.getUint8(0);
        
        if (type === 0x01) { // Video frame
            const width = view.getUint32(1, true);
            const height = view.getUint32(5, true);
            const rgb24Data = new Uint8Array(data, 9);
            
            // Update canvas size
            if (this.canvas.width !== width || this.canvas.height !== height) {
                this.canvas.width = width;
                this.canvas.height = height;
            }
            
            // Create ImageData and draw
            const imageData = this.ctx.createImageData(width, height);
            for (let i = 0; i < rgb24Data.length; i += 3) {
                const idx = (i / 3) * 4;
                imageData.data[idx] = rgb24Data[i];         // R
                imageData.data[idx + 1] = rgb24Data[i + 1];   // G
                imageData.data[idx + 2] = rgb24Data[i + 2];  // B
                imageData.data[idx + 3] = 255;               // A
            }
            
            this.ctx.putImageData(imageData, 0, 0);
            
            // Update FPS
            this.frameCount++;
            const now = Date.now();
            if (now - this.lastFpsTime >= 1000) {
                document.getElementById('fps').textContent = this.frameCount;
                this.frameCount = 0;
                this.lastFpsTime = now;
            }
            
            document.getElementById('width').textContent = width;
            document.getElementById('height').textContent = height;
        }
    }

    handleAudioData(data) {
        if (!this.audioContext || this.audioContext.state === 'closed' || !this.audioEnabled) {
            return;
        }

        const view = new DataView(data);
        const type = view.getUint8(0);
        
        if (type === 0x02) { // Audio data
            // Parse audio message: [type(1)] [samples(4)] [audio_data(...)]
            const samples = view.getUint32(1, true); // Little-endian
            const audioDataOffset = 5; // 1 byte type + 4 bytes samples count
            const audioDataSize = samples * 2 * 2; // samples * 2 channels * 2 bytes per sample
            
            if (samples === 0 || data.byteLength < audioDataOffset + audioDataSize) {
                return; // Invalid data
            }
            
            // Copy audio data to a new aligned buffer (Int16Array requires 2-byte alignment)
            // We need to copy to ensure proper alignment since offset 5 is not aligned
            const audioDataBuffer = new Uint8Array(data, audioDataOffset, audioDataSize);
            const alignedBuffer = new Uint8Array(audioDataSize);
            alignedBuffer.set(audioDataBuffer);
            const int16Data = new Int16Array(alignedBuffer.buffer);
            
            // Create AudioBuffer (stereo) at SNES sample rate
            // Browser will resample automatically if AudioContext uses different rate
            const audioBuffer = this.audioContext.createBuffer(2, samples, this.snesSampleRate);
            
            // Deinterleave stereo data into left and right channels
            // Convert int16 to float32 (-1.0 to 1.0 range) during deinterleaving
            const leftChannel = audioBuffer.getChannelData(0);
            const rightChannel = audioBuffer.getChannelData(1);
            for (let i = 0; i < samples; i++) {
                leftChannel[i] = int16Data[i * 2] / 32768.0;     // Left
                rightChannel[i] = int16Data[i * 2 + 1] / 32768.0; // Right
            }
            
            // Queue audio buffer for playback
            this.queueAudioBuffer(audioBuffer);
        }
    }

    queueAudioBuffer(audioBuffer) {
        if (!this.audioContext || this.audioContext.state === 'closed') {
            return;
        }

        // Resume audio context if suspended
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        try {
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.audioContext.destination);
            
            // Schedule playback with precise timing to avoid gaps
            const currentTime = this.audioContext.currentTime;
            const scheduleTime = Math.max(currentTime, this.nextPlayTime);
            
            source.start(scheduleTime);
            
            // Update next play time for seamless playback
            this.nextPlayTime = scheduleTime + audioBuffer.duration;
            
            // Clean up old scheduled sources if queue gets too large
            if (this.audioQueue.length > 10) {
                const oldSource = this.audioQueue.shift();
                try {
                    oldSource.stop();
                } catch (e) {
                    // Source may have already finished
                }
            }
            
            this.audioQueue.push(source);
            
            // Clean up finished sources
            source.onended = () => {
                const index = this.audioQueue.indexOf(source);
                if (index > -1) {
                    this.audioQueue.splice(index, 1);
                }
            };
        } catch (error) {
            console.error('Error playing audio buffer:', error);
        }
    }

    pressButton(buttonName) {
        this.buttons[buttonName] = true;
        this.sendButtonState();
        this.updateButtonUI(buttonName, true);
    }

    releaseButton(buttonName) {
        this.buttons[buttonName] = false;
        this.sendButtonState();
        this.updateButtonUI(buttonName, false);
    }

    sendButtonState() {
        this.sendControl({
            type: 'input',
            port: this.selectedPlayer,
            buttons: { ...this.buttons }
        });
    }

    updateButtonUI(buttonName, pressed) {
        const btn = document.querySelector(`[data-button="${buttonName}"]`);
        if (btn) {
            if (pressed) {
                btn.classList.add('pressed');
            } else {
                btn.classList.remove('pressed');
            }
        }
    }

    handleKeyDown(e) {
        const keyMap = {
            'KeyZ': 'a',
            'KeyX': 'b',
            'KeyA': 'x',
            'KeyS': 'y',
            'KeyQ': 'l',
            'KeyW': 'r',
            'Enter': 'start',
            'Shift': 'select',
            'ArrowUp': 'up',
            'ArrowDown': 'down',
            'ArrowLeft': 'left',
            'ArrowRight': 'right'
        };

        const button = keyMap[e.code];
        if (button && !this.buttons[button]) {
            this.pressButton(button);
            e.preventDefault();
        }
    }

    handleKeyUp(e) {
        const keyMap = {
            'KeyZ': 'a',
            'KeyX': 'b',
            'KeyA': 'x',
            'KeyS': 'y',
            'KeyQ': 'l',
            'KeyW': 'r',
            'Enter': 'start',
            'Shift': 'select',
            'ArrowUp': 'up',
            'ArrowDown': 'down',
            'ArrowLeft': 'left',
            'ArrowRight': 'right'
        };

        const button = keyMap[e.code];
        if (button) {
            this.releaseButton(button);
            e.preventDefault();
        }
    }

    sendControl(data) {
        if (this.controlWS && this.controlWS.readyState === WebSocket.OPEN) {
            this.controlWS.send(JSON.stringify(data));
        }
    }

    async loadROM(file) {
        if (!file) return;

        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Send ROM to server via API
        try {
            const formData = new FormData();
            formData.append('rom', file);

            const response = await fetch('/api/load-rom', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ filename: file.name })
            });

            if (response.ok) {
                console.log('ROM loaded successfully');
            } else {
                console.error('Failed to load ROM');
            }
        } catch (error) {
            console.error('Error loading ROM:', error);
        }
    }

    async enableAudio() {
        if (!this.audioContext) {
            console.warn('Audio context not initialized');
            return;
        }

        if (this.audioContext.state === 'closed') {
            console.warn('Audio context is closed');
            return;
        }

        try {
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
                console.log('Audio context resumed');
            }
            
            this.audioEnabled = true;
            
            // Connect audio WebSocket now that user has enabled audio
            this.connectAudio();
            
            this.updateAudioButton();
        } catch (error) {
            console.error('Failed to enable audio:', error);
        }
    }

    updateAudioButton() {
        const btn = document.getElementById('enableAudioBtn');
        if (!btn) return;

        if (this.audioEnabled && this.audioContext && this.audioContext.state === 'running') {
            btn.textContent = '🔊 Audio Enabled';
            btn.style.background = '#0a0';
            btn.style.borderColor = '#0f0';
            btn.disabled = true;
        } else {
            btn.textContent = '🔇 Enable Audio';
            btn.style.background = '';
            btn.style.borderColor = '';
            btn.disabled = false;
        }
    }

    updateStatus(connected) {
        const indicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        
        if (connected) {
            indicator.classList.add('connected');
            statusText.textContent = 'Connected';
        } else {
            indicator.classList.remove('connected');
            statusText.textContent = 'Disconnected';
        }
    }

    async saveState(slot) {
        try {
            const response = await fetch(`/api/save-state/${slot}`, {
                method: 'POST'
            });

            const data = await response.json();
            if (data.success) {
                console.log(`State saved to slot ${slot}`);
            } else {
                console.error(`Failed to save state to slot ${slot}`);
            }
        } catch (error) {
            console.error('Error saving state:', error);
        }
    }

    async loadState(slot) {
        try {
            const response = await fetch(`/api/load-state/${slot}`, {
                method: 'POST'
            });

            const data = await response.json();
            if (data.success) {
                console.log(`State loaded from slot ${slot}`);
            } else {
                console.error(`Failed to load state from slot ${slot}`);
            }
        } catch (error) {
            console.error('Error loading state:', error);
        }
    }

    async saveStateToFile() {
        try {
            const response = await fetch('/api/save-state-to-file', {
                method: 'POST'
            });

            const data = await response.json();
            if (data.success) {
                console.log('State saved to file');
            } else {
                console.error('Failed to save state to file');
            }
        } catch (error) {
            console.error('Error saving state to file:', error);
        }
    }

    async loadStateFromFile() {
        try {
            const response = await fetch('/api/load-state-from-file', {
                method: 'POST'
            });

            const data = await response.json();
            if (data.success) {
                console.log('State loaded from file');
            } else {
                console.error('Failed to load state from file');
            }
        } catch (error) {
            console.error('Error loading state from file:', error);
        }
    }
}

// Initialize client when page loads
window.addEventListener('DOMContentLoaded', () => {
    new Snes9xClient();
});


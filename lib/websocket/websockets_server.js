
const WebSocket = require('ws');
const { WS_PATHS } = require('./ws_consts');
const wsPathSet = new Set(Object.values(WS_PATHS));
class WebSocketServer {
    constructor(server, consumers, publisherFactory) {
        this.clients = Object.fromEntries(Object.values(WS_PATHS).map(path => [path, new Set()]));
        this.wss = new WebSocket.Server({ server });
        this.wss.on('error', (error) => {
            console.error('WebSocket error:', error);
        });

        this.wss.on('connection', (ws, req) => {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const pathname = url.pathname;
            console.log(`New WebSocket connection: ${pathname}`);
            ws.on('message', consumers[pathname] ? consumers[pathname] : () => {});
            if (wsPathSet.has(pathname)) {
                this.clients[pathname] ??= new Set();
                this.clients[pathname].add(ws);
                ws.on('close', () => {
                    this.clients[pathname].delete(ws);
                });
            }

        });
        this.publishers = publisherFactory((path, ...message) => {
            this.clients[path].forEach(ws => {
                ws.send(...message);
            });
        });
    }

}

module.exports = WebSocketServer;
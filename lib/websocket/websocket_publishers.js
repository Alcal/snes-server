const { WS_PATHS } = require('./ws_consts');
const webSocketPublishersFactory = (send) => ({
    [WS_PATHS.VIDEO]: ({rgb24, width, height, frameRate}) => {
        send(WS_PATHS.VIDEO, Buffer.concat([
            Buffer.from([0x01]), // Frame type
            Buffer.from(new Uint32Array([width, height]).buffer),
            rgb24
        ]), { binary: true });
    },

    [WS_PATHS.AUDIO]: ({buffer, samples}) => {
        send(WS_PATHS.AUDIO, Buffer.concat([
            Buffer.from([0x02]), // Audio type
            Buffer.from(new Uint32Array([samples]).buffer),
            buffer
        ]), { binary: true });
    },

    [WS_PATHS.ROM_LOADED]: () => {
        send(WS_PATHS.ROM_LOADED, JSON.stringify({type: 'romLoaded'}));
    },
})

module.exports = webSocketPublishersFactory;
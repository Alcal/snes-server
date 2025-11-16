const webSocketConsumers = {
    '/control': (message) => {
        try {
            const data = JSON.parse(message);
            this.handleControlInput(data);
        } catch (error) {
            console.error('Error parsing control message:', error);
        }
    }
}

module.exports = webSocketConsumers;
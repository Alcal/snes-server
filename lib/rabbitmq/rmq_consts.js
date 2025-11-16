const RMQ_CONSUMERS_CONFIG = {
    "control": {
        QUEUE: 'control_queue',
        EXCHANGE: 'control_exchange',
        EXCHANGE_TYPE: 'topic',
        ROUTING_KEY: 'control',
        DURABLE: true
    }
}

module.exports = { RMQ_CONSUMERS_CONFIG };


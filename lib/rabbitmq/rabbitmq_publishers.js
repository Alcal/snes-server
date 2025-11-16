// RabbitMQ publishers factory
// Currently empty as we only consume messages, but can be extended in the future
const rabbitmqPublishersFactory = (publish) => ({
    // Add publishers here as needed
    // Example:
    // publishToControl: (data) => {
    //     publish(RMQ_CONFIG.EXCHANGE, RMQ_CONFIG.ROUTING_KEY, JSON.stringify(data));
    // }
})

module.exports = rabbitmqPublishersFactory;


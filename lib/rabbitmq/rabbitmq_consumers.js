const { RMQ_CONFIG } = require('./rmq_consts');

const rabbitmqConsumers = {
    [RMQ_CONFIG.ROUTING_KEY]: (msg, handleControlInput) => {
        try {
            // Parse the message content
            const messageContent = msg.body.toString();
            const data = JSON.parse(messageContent);
            
            console.log('Received control message from RabbitMQ:', data);
            
            // Forward to handleControlInput
            handleControlInput(data);
            
            // Return ACK status (message will be acknowledged)
            return 0; // ConsumerStatus.ACK
        } catch (error) {
            console.error('Error processing RabbitMQ message:', error);
            // Return REQUEUE status to retry the message
            return 1; // ConsumerStatus.REQUEUE
        }
    }
}

module.exports = rabbitmqConsumers;


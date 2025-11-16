const RabbitMQConnection = require('./rabbitmq_connection');

let rabbitmqConnection = null;

async function startRabbitMQConsumer(consumerCallbacks) {
    rabbitmqConnection = new RabbitMQConnection(consumerCallbacks);
    await rabbitmqConnection.start();
}

function stopRabbitMQConsumer() {
    if (rabbitmqConnection) {
        rabbitmqConnection.stop();
        rabbitmqConnection = null;
    }
}

module.exports = { startRabbitMQConsumer, stopRabbitMQConsumer };


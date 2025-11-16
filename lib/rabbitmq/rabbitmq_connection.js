const { Connection } = require('rabbitmq-client');
const { RMQ_CONFIG } = require('./rmq_consts');
const rabbitmqConsumers = require('./rabbitmq_consumers');

const DEFAULT_CONSUMER_CALLBACK = () => 0;

class RabbitMQConnection {
    constructor(consumerCallbacks) {
        this.connection = null;
        this.consumers = {};
        this.consumerCallbacks = consumerCallbacks;
    }

    async start() {
        const cloudamqpUrl = process.env.CLOUDAMQP_URL;
        
        if (!cloudamqpUrl) {
            console.error('CLOUDAMQP_URL environment variable is not set');
            return;
        }

        try {
            // Create connection
            this.connection = new Connection(cloudamqpUrl);
            
            this.connection.on('error', (err) => {
                console.error('RabbitMQ connection error:', err);
            });

            this.connection.on('connection', () => {
                console.log('RabbitMQ connection established');
            });

            // Wait for connection to be ready
            await this.connection.onConnect();

            // Create a consumer for the control topic
            for (const [consumerName, consumerConfig] of Object.entries(RMQ_CONSUMERS_CONFIG)) {
                this.consumers[consumerName] = this.connection.createConsumer({
                        queue: consumerConfig.QUEUE,
                        exchanges: [
                            {
                                exchange: consumerConfig.EXCHANGE,
                                type: consumerConfig.EXCHANGE_TYPE,
                                durable: consumerConfig.DURABLE
                            }
                        ],
                        queueBindings: [
                            {
                                exchange: consumerConfig.EXCHANGE,
                                queue: consumerConfig.QUEUE,
                                routingKey: consumerConfig.ROUTING_KEY
                            }
                        ]
                    },
                    async (msg) => {
                        return await rabbitmqConsumers[consumerConfig.ROUTING_KEY](msg, this.consumerCallbacks[consumerName] ?? DEFAULT_CONSUMER_CALLBACK);
                    }
                );

                this.consumers[consumerName].on('error', (err) => {
                    console.error(`RabbitMQ ${consumerName} consumer error:`, err);
                });

                this.consumers[consumerName].on('ready', () => {
                    console.log(`RabbitMQ ${consumerName} consumer ready, listening for messages on ${consumerConfig.QUEUE}`);
                });
            }

        } catch (error) {
            console.error(`Error setting up RabbitMQ ${consumerName} consumer:`, error);
        }
    }

    stop() {
        for (const consumer of Object.values(this.consumers)) {
            consumer.close();
            consumer = null;
        }
        if (this.connection) {
            this.connection.close();
            this.connection = null;
        }
    }
}

module.exports = RabbitMQConnection;


const amqp = require('amqplib');
const { EXCHANGE, BINDINGS } = require('./events');

let connection = null;
let channel = null;

/**
 * Establish a RabbitMQ connection and create a topic exchange.
 * Retries up to maxRetries times with exponential backoff.
 */
const connect = async (maxRetries = 10, delay = 3000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
      connection = await amqp.connect(url);
      channel = await connection.createChannel();

      // Declare a durable topic exchange
      await channel.assertExchange(EXCHANGE, 'topic', { durable: true });

      console.log(`[RabbitMQ] Connected to ${url}, exchange: ${EXCHANGE}`);

      connection.on('error', (err) => {
        console.error('[RabbitMQ] Connection error:', err.message);
        reconnect();
      });

      connection.on('close', () => {
        console.warn('[RabbitMQ] Connection closed. Reconnecting...');
        reconnect();
      });

      return channel;
    } catch (err) {
      console.error(`[RabbitMQ] Connection attempt ${attempt}/${maxRetries} failed: ${err.message}`);
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, delay));
      } else {
        console.error('[RabbitMQ] Max retries reached. Running without message queue.');
      }
    }
  }
  return null;
};

const reconnect = async () => {
  channel = null;
  connection = null;
  await new Promise((r) => setTimeout(r, 5000));
  await connect();
};

/**
 * Publish a message to the exchange with a routing key.
 * @param {string} routingKey - e.g. 'incident.created'
 * @param {object} payload - JSON-serializable object
 */
const publish = (routingKey, payload) => {
  if (!channel) {
    console.warn(`[RabbitMQ] Channel not ready. Skipping publish: ${routingKey}`);
    return false;
  }
  try {
    const content = Buffer.from(JSON.stringify(payload));
    channel.publish(EXCHANGE, routingKey, content, {
      persistent: true,
      contentType: 'application/json',
      timestamp: Date.now()
    });
    return true;
  } catch (err) {
    console.error(`[RabbitMQ] Publish error (${routingKey}):`, err.message);
    return false;
  }
};

/**
 * Subscribe a queue to one or more routing key patterns, then consume messages.
 * @param {string} queueName - Queue to create/assert
 * @param {string[]} bindingKeys - Routing key patterns, e.g. ['incident.*']
 * @param {function} handler - async (msg, payload) => void
 */
const subscribe = async (queueName, bindingKeys, handler) => {
  if (!channel) {
    console.warn(`[RabbitMQ] Channel not ready. Cannot subscribe to ${queueName}`);
    return;
  }
  try {
    await channel.assertQueue(queueName, { durable: true });

    for (const key of bindingKeys) {
      await channel.bindQueue(queueName, EXCHANGE, key);
    }

    channel.prefetch(10);

    channel.consume(queueName, async (msg) => {
      if (!msg) return;
      try {
        const payload = JSON.parse(msg.content.toString());
        await handler(msg.fields.routingKey, payload);
        channel.ack(msg);
      } catch (err) {
        console.error(`[RabbitMQ] Handler error on ${queueName}:`, err.message);
        channel.nack(msg, false, false); // discard on error
      }
    });

    console.log(`[RabbitMQ] Subscribed queue "${queueName}" to [${bindingKeys.join(', ')}]`);
  } catch (err) {
    console.error(`[RabbitMQ] Subscribe error (${queueName}):`, err.message);
  }
};

const getChannel = () => channel;

module.exports = { connect, publish, subscribe, getChannel };

require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });
const express = require('express');
const cors = require('cors');
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const connectDB = require('./config/database');
const incidentRoutes = require('./routes/incidents');
const errorHandler = require('../../../common/middleware/errorHandler');
const { connect: connectRabbitMQ, subscribe } = require('../../../common/messaging/rabbitmq');
const { QUEUES, BINDINGS } = require('../../../common/messaging/events');

const app = express();
const PORT = process.env.INCIDENT_SERVICE_PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Incident Service API',
      version: '1.0.0',
      description: 'Emergency Incident Management and Dispatch Microservice'
    },
    servers: [{ url: `http://localhost:${PORT}`, description: 'Development server' }],
    components: {
      securitySchemes: {
        BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      }
    }
  },
  apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/incidents', incidentRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'Incident Service is running', port: PORT });
});

// Error handling
app.use(errorHandler);

// Startup
const start = async () => {
  await connectDB();

  // Connect to RabbitMQ and subscribe to vehicle status changes
  await connectRabbitMQ();
  await subscribe(
    QUEUES.INCIDENT_VEHICLES,
    BINDINGS[QUEUES.INCIDENT_VEHICLES],
    async (routingKey, payload) => {
      // vehicle.status.changed — used to keep availability state if needed
      console.log(`[Incident] Received ${routingKey}:`, payload.vehicleId, '->', payload.status);
    }
  );

  app.listen(PORT, () => {
    console.log(`Incident Service running on port ${PORT}`);
    console.log(`Swagger docs: http://localhost:${PORT}/api-docs`);
  });
};

start().catch((err) => {
  console.error('Incident Service failed to start:', err);
  process.exit(1);
});

module.exports = app;

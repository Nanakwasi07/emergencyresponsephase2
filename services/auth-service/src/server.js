require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });
const express = require('express');
const cors = require('cors');
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const connectDB = require('./config/database');
const authRoutes = require('./routes/auth');
const errorHandler = require('../../../common/middleware/errorHandler');
const { connect: connectRabbitMQ } = require('../../../common/messaging/rabbitmq');

const app = express();
const PORT = process.env.PORT || process.env.AUTH_SERVICE_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Auth Service API',
      version: '1.0.0',
      description: 'Identity and Authentication Microservice'
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
app.use('/auth', authRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'Auth Service is running', port: PORT });
});

// Error handling
app.use(errorHandler);

// Startup
const start = async () => {
  await connectDB();
  await connectRabbitMQ();

  app.listen(PORT, () => {
    console.log(`Auth Service running on port ${PORT}`);
    console.log(`Swagger docs: http://localhost:${PORT}/api-docs`);
  });
};

start().catch((err) => {
  console.error('Auth Service failed to start:', err);
  process.exit(1);
});

module.exports = app;

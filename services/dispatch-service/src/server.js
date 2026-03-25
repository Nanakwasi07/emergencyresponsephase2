require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server: SocketIOServer } = require('socket.io');
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const connectDB = require('./config/database');
const { router: vehicleRoutes, setIO } = require('./routes/vehicles');
const stationRoutes = require('./routes/stations');
const errorHandler = require('../../../common/middleware/errorHandler');
const { connect: connectRabbitMQ, subscribe } = require('../../../common/messaging/rabbitmq');
const { QUEUES, BINDINGS } = require('../../../common/messaging/events');
const { Vehicle } = require('./models/Vehicle');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || process.env.DISPATCH_SERVICE_PORT || 3003;

// Socket.IO for real-time vehicle tracking
const io = new SocketIOServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Inject io into vehicle routes so location updates can be broadcast
setIO(io);

// Middleware
app.use(cors());
app.use(express.json());

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Dispatch Tracking Service API',
      version: '1.0.0',
      description: 'Real-time Vehicle Location Tracking, Dispatch Management, and Station Registry'
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
app.use('/vehicles', vehicleRoutes);
app.use('/stations', stationRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'Dispatch Service is running', port: PORT, websocket: true });
});

// Error handling
app.use(errorHandler);

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Startup
const start = async () => {
  await connectDB();

  // Connect to RabbitMQ and consume incident.dispatched events
  await connectRabbitMQ();
  await subscribe(
    QUEUES.DISPATCH_INCIDENTS,
    BINDINGS[QUEUES.DISPATCH_INCIDENTS],
    async (_routingKey, payload) => {
      // Mark the dispatched vehicle as busy
      if (payload.vehicleId) {
        await Vehicle.findByIdAndUpdate(payload.vehicleId, {
          status: 'dispatched',
          currentIncidentId: payload.incidentId
        });
        console.log(`[Dispatch] Vehicle ${payload.vehicleId} marked dispatched for incident ${payload.incidentId}`);

        // Notify connected clients
        io.emit('vehicle:dispatched', {
          vehicleId: payload.vehicleId,
          incidentId: payload.incidentId,
          vehicleType: payload.vehicleType,
          distanceKm: payload.distanceKm
        });
      }
    }
  );

  server.listen(PORT, () => {
    console.log(`Dispatch Service running on port ${PORT}`);
    console.log(`Swagger docs: http://localhost:${PORT}/api-docs`);
    console.log(`Socket.IO ready for real-time connections`);
  });
};

start().catch((err) => {
  console.error('Dispatch Service failed to start:', err);
  process.exit(1);
});

module.exports = { app, io };

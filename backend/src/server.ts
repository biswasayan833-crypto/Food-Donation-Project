import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import {
  ApiResponse,
  ApiErrorResponse,
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  DONATION_STATUS_TRANSITIONS,
} from './types';

// Load environment variables
dotenv.config();

const PORT = parseInt(process.env.PORT || '5000', 10);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/foodrescue';
const NODE_ENV = process.env.NODE_ENV || 'development';

// ----------------------------------------------------
// 1. Initialize Express App & HTTP Server
// ----------------------------------------------------
const app = express();
const server = http.createServer(app);

// ----------------------------------------------------
// 2. Configure CORS
// ----------------------------------------------------
// Allow requests from frontend client and local dev variants
const allowedOrigins = [
  CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy does not allow access from origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ----------------------------------------------------
// 3. Configure Socket.IO
// ----------------------------------------------------
const io = new SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 30000,
  pingInterval: 25000,
});

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.on('join:room', (roomId: string) => {
    socket.join(roomId);
    console.log(`[Socket.IO] Client ${socket.id} joined room: ${roomId}`);
  });

  socket.on('leave:room', (roomId: string) => {
    socket.leave(roomId);
    console.log(`[Socket.IO] Client ${socket.id} left room: ${roomId}`);
  });

  socket.on('volunteer:update_location', ({ donationId, location }) => {
    io.to(`donation:${donationId}`).emit('volunteer:location_update', {
      volunteerId: socket.data.userId || socket.id,
      donationId,
      location,
    });
  });

  socket.on('disconnect', (reason) => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}, reason: ${reason}`);
  });
});

// ----------------------------------------------------
// 4. API Endpoints
// ----------------------------------------------------

// Root route
app.get('/', (_req: Request, res: Response<ApiResponse<{ message: string; version: string }>>) => {
  res.json({
    success: true,
    message: 'Welcome to FoodRescue API',
    data: {
      message: 'Real-time food rescue platform backend service',
      version: '1.0.0',
    },
    timestamp: new Date().toISOString(),
  });
});

// Health check route
app.get('/api/health', (_req: Request, res: Response<ApiResponse<{
  status: string;
  uptime: number;
  environment: string;
  database: string;
  activeSockets: number;
}>>) => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  res.json({
    success: true,
    message: 'FoodRescue API is operational',
    data: {
      status: 'healthy',
      uptime: process.uptime(),
      environment: NODE_ENV,
      database: dbStatusMap[dbState] || 'unknown',
      activeSockets: io.engine.clientsCount,
    },
    timestamp: new Date().toISOString(),
  });
});

// FSM definition endpoint for clients
app.get('/api/fsm', (_req: Request, res: Response<ApiResponse<{ transitions: typeof DONATION_STATUS_TRANSITIONS }>>) => {
  res.json({
    success: true,
    data: {
      transitions: DONATION_STATUS_TRANSITIONS,
    },
    timestamp: new Date().toISOString(),
  });
});

// ----------------------------------------------------
// 5. Error Handling Middleware
// ----------------------------------------------------
app.use((err: any, _req: Request, res: Response<ApiErrorResponse>, _next: NextFunction) => {
  console.error('[Error]:', err);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    statusCode,
    timestamp: new Date().toISOString(),
  });
});

// ----------------------------------------------------
// 6. Database Connection & Server Startup
// ----------------------------------------------------
async function startServer() {
  try {
    // Attempt Mongoose connection (non-blocking in dev if local mongo is offline)
    if (MONGODB_URI) {
      mongoose
        .connect(MONGODB_URI)
        .then(() => console.log('✓ Connected to MongoDB database'))
        .catch((err) => {
          console.warn(`! MongoDB connection deferred or offline (${err.message}). API running in standalone mode.`);
        });
    }

    server.listen(PORT, () => {
      console.log('====================================================');
      console.log(`🚀 FoodRescue API Server running on port ${PORT}`);
      console.log(`🌐 HTTP URL:      http://localhost:${PORT}`);
      console.log(`⚡ Socket.IO URL: ws://localhost:${PORT}`);
      console.log(`🔗 Allowed CORS:  ${CLIENT_URL}`);
      console.log('====================================================');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful Shutdown
const shutdown = () => {
  console.log('\nShutting down gracefully...');
  server.close(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    console.log('Server and database connections closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Export app and server for testing
export { app, server, io };

// Start server
if (require.main === module) {
  startServer();
}

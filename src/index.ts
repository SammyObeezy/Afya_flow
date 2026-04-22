import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import routes from './routes';
import { errorHandler, notFound } from './middleware/errorHandler';

const app = express();

// Security & parsing middleware
app.use(cors({
  origin: env.CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  message: { success: false, error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'healthy', timestamp: new Date().toISOString() } });
});

// API routes
app.use('/api/v1', routes);

// Error handlers
app.use(notFound);
app.use(errorHandler);

const start = async () => {
  try {
    app.listen(env.PORT, () => {
      console.log(`CHW Backend running on port ${env.PORT} [${env.NODE_ENV}]`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();

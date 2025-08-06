/**
 * MB Script - HealthKart Product Monitoring API Server
 * Main entry point for the Vercel-deployed API
 * 
 * Architecture:
 * - GitHub Actions: Handles scheduling and calls this API every 30 minutes
 * - Vercel (India server): Handles HealthKart API calls + Telegram alerts
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { getLogger, initializeLogger } from './shared/utils/logger.js';
import { ServiceFactory } from './infrastructure/factories/ServiceFactory.js';
import { 
  isApiConfigurationError,
  isApiTimeoutError,
  isProductFetchError,
  isTelegramServiceError,
  isProductProcessingError
} from './shared/errors/index.js';

// Load environment variables
config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['*'], // Allow GitHub Actions to call this API
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize logger
initializeLogger({ level: 'info', enableConsole: true });
const logger = getLogger().createChild({ service: 'ApiServer' });

// Initialize service factory
const serviceFactory = new ServiceFactory();

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'MB Script API',
    version: '1.0.0'
  });
});

// API endpoint to fetch deals and send Telegram alerts
app.post('/api/send-alert', async (req: Request, res: Response) => {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    logger.info('Processing send alert request', { requestId, source: req.body?.source || 'unknown' });
    
    const sendAlertUseCase = serviceFactory.createSendAlertUseCase();
    const result = await sendAlertUseCase.execute(requestId);
    
    logger.info('Send alert request completed successfully', { requestId, result });
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: result,
      requestId
    });
    
  } catch (error) {
    const errorResponse = handleError(error, requestId);
    logger.error('Send alert request failed', { requestId, error: errorResponse });
    res.status(errorResponse.statusCode).json(errorResponse);
  }
});

// Error handling middleware
app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error:', { error: error.message, stack: error.stack });
  res.status(500).json({
    success: false,
    timestamp: new Date().toISOString(),
    error: 'Internal server error'
  });
});

// 404 handler
app.use('*', (_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    timestamp: new Date().toISOString(),
    error: 'Endpoint not found'
  });
});

/**
 * Handles errors and creates appropriate response
 */
function handleError(error: unknown, requestId: string) {
  let statusCode = 500;
  let errorMessage = 'Internal server error';
  
  if (isApiConfigurationError(error)) {
    statusCode = 500;
    errorMessage = 'Configuration error';
  } else if (isApiTimeoutError(error)) {
    statusCode = 504;
    errorMessage = 'Request timeout';
  } else if (isProductFetchError(error)) {
    statusCode = error.statusCode || 502;
    errorMessage = 'Failed to fetch products';
  } else if (isTelegramServiceError(error)) {
    statusCode = 502;
    errorMessage = 'Failed to send Telegram alert';
  } else if (isProductProcessingError(error)) {
    statusCode = 422;
    errorMessage = 'Failed to process product data';
  }
  
  const safeError = {
    message: error instanceof Error ? error.message : String(error),
    type: error instanceof Error ? error.name : 'UnknownError',
    timestamp: new Date().toISOString(),
  };
  
  return {
    success: false,
    timestamp: new Date().toISOString(),
    statusCode,
    error: errorMessage,
    details: process.env.NODE_ENV === 'development' ? safeError : undefined,
    requestId
  };
}

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`🚀 MB Script API Server running on port ${PORT}`);
    logger.info(`📡 Health check: http://localhost:${PORT}/health`);
    logger.info(`🔔 Send Alert: POST http://localhost:${PORT}/api/send-alert`);
  });
}

// Export as default for Vercel
export default app;

// Named export for compatibility
export { app };

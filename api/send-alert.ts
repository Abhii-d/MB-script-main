/**
 * Send Alert API Endpoint for Vercel
 * Main functionality for triggering supplement deal alerts
 */

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Import the service factory and dependencies
    const { ServiceFactory } = await import('../src/infrastructure/factories/ServiceFactory.js');
    const { getLogger, initializeLogger } = await import('../src/shared/utils/logger.js');
    
    // Initialize logging for serverless environment
    initializeLogger({
      level: (process.env.LOG_LEVEL as any) || 'info',
      enableConsole: true,
    });

    const logger = getLogger();
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info('Processing send alert request', { requestId });
    
    const serviceFactory = new ServiceFactory();
    const sendAlertUseCase = serviceFactory.createSendAlertUseCase();
    const result = await sendAlertUseCase.execute(requestId);
    
    logger.info('Send alert request completed successfully', { requestId, result });
    
    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: result,
      requestId
    });
    
  } catch (error) {
    console.error('Send alert request failed:', error);
    
    return res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
} 
/**
 * Main API Endpoint for Vercel
 * Provides API information and available endpoints
 */

export default function handler(req: any, res: any) {
  return res.status(200).json({
    name: 'MB Script API',
    description: 'HealthKart Product Monitoring API with Telegram Alerts',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: {
        method: 'GET',
        url: '/api/health',
        description: 'Health check endpoint'
      },
      sendAlert: {
        method: 'POST',
        url: '/api/send-alert',
        description: 'Trigger supplement deal alert'
      }
    },
    region: process.env.VERCEL_REGION || 'unknown',
    environment: process.env.NODE_ENV || 'development'
  });
} 
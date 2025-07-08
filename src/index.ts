/**
 * MB Script - HealthKart Product Monitoring API Server
 * Main entry point for the Vercel-deployed API
 * 
 * Architecture:
 * - Vercel (India server): Handles HealthKart API calls + Telegram alerts
 * - GitHub Pages: Handles scheduling and calls this API
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { HealthKartApiClient } from './infrastructure/external/HealthKartApiClient.js';
import { HealthKartTransformService } from './infrastructure/external/HealthKartTransformService.js';
import { TelegramService } from './infrastructure/external/TelegramService.js';
// import { MonitorProductDealsUseCase } from './application/use-cases/MonitorProductDeals.js';
import { getLogger, initializeLogger } from './shared/utils/logger.js';
// import { getDemoConfiguration } from './shared/config/demoConfig.js';
// import { formatConsolidatedDealAlert } from './shared/utils/messageFormatter.js';
// import { Product } from './domain/entities/Product.js';

// Load environment variables


// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;


config();

// Middleware
app.use(cors({
  origin: ['https://your-github-pages-domain.github.io', 'http://localhost:3000'],
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize logger
initializeLogger({ level: 'info', enableConsole: true });
const logger = getLogger().createChild({ service: 'ApiServer' });

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
app.post('/api/send-alert', async (_req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    logger.info('🚀 Starting HealthKart deal monitoring and alert process');

    // Initialize services
    const { healthKartClient, telegramService} = await initializeServices();
    // const config = getDemoConfiguration();

    // Fetch products from HealthKart API
    // logger.info('📡 Fetching products from HealthKart API...');
    // const fetchResult = await fetchHealthKartProducts(
    //   dependencies,
    //   config.prototype.healthkart.categoryCodes.wheyProtein
    //   // config.healthkart.categoryCodes.wheyProtein
    // );
    const fetchResult = await healthKartClient.fetchFilteredProducts('SCT-snt-pt-wp', {
      minDiscount: 10,
      inStockOnly: true,
      minReviews: 1,
      minRating: 3.5,
      maxPrice: 10000,
      brands: ['muscleblaze', 'optimum nutrition', 'dymatize', 'gnc', 'ON', 'Fuel One'],
      categories: ['wheyProtein', 'Whey Proteins', 'Whey Protein'],
    });

    // if (!fetchResult.success) {
    //   throw new Error(`Failed to fetch products: ${fetchResult.error}`);
    // }
    logger.info(`🔄 Fetched ${fetchResult.length} products...`);
    // Transform and filter products
    // logger.info(`🔄 Processing ${fetchResult.length} products...`);
    // const analysisResult = await analyzeProducts(dependencies, fetchResult);

    // if (!analysisResult.success) {
    //   throw new Error(`Failed to analyze products: ${analysisResult.error}`);
    // }

   const healthKartTransformService = new HealthKartTransformService();
   const transformedProducts = healthKartTransformService.transformToProducts(fetchResult);


   // send telegram alert
   const telegramResult = await telegramService.sendDealAlerts(transformedProducts, process.env.TELEGRAM_CHAT_ID);

    // Send Telegram alerts if deals found
    // let telegramResult = null;
    // if (analysisResult.filteredProducts.length > 0) {
    //   logger.info(`📱 Sending Telegram alert for ${analysisResult.filteredProducts.length} deals...`);
    //   telegramResult = await sendTelegramAlert(dependencies, analysisResult.filteredProducts);
    // } else {
    //   logger.info('ℹ️ No qualifying deals found, skipping Telegram alert');
    // }

    const executionTime = Date.now() - startTime;
    
    // Return success response
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      executionTimeMs: executionTime,
      data: {
        totalProductsFetched: fetchResult.length,
        // qualifyingDeals: analysisResult.filteredProducts.length,
        telegramSent: telegramResult || false,
        // deals: analysisResult.filteredProducts.map(product => ({
        //   name: product.name,
        //   brand: product.brand,
        //   currentPrice: product.currentPrice,
        //   originalPrice: product.originalPrice,
        //   discountPercentage: product.discountPercentage,
        //   rating: product.rating,
        //   url: product.url
        // }))
      }
    });

    logger.info(`✅ Alert process completed successfully in ${executionTime}ms`);

  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error('❌ Alert process failed:', { error: errorMessage, executionTime });
    
    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      executionTimeMs: executionTime,
      error: errorMessage
    });
  }
});

// Get current deals without sending alerts (for testing)
// app.get('/api/deals', async (_req: Request, res: Response) => {
//   try {
//     logger.info('📊 Fetching current deals (no alerts)');

//     const dependencies = await initializeServices();
//     // const config = getDemoConfiguration();

//     const fetchResult = await fetchHealthKartProducts(
//       dependencies,
//       config.healthkart.categoryCodes.wheyProtein
//     );

//     if (!fetchResult.success) {
//       throw new Error(`Failed to fetch products: ${fetchResult.error}`);
//     }

//     const analysisResult = await analyzeProducts(dependencies, fetchResult.products);

//     if (!analysisResult.success) {
//       throw new Error(`Failed to analyze products: ${analysisResult.error}`);
//     }

//     res.json({
//       success: true,
//       timestamp: new Date().toISOString(),
//       data: {
//         totalProducts: fetchResult.products.length,
//         qualifyingDeals: analysisResult.filteredProducts.length,
//         deals: analysisResult.filteredProducts.map(product => ({
//           name: product.name,
//           brand: product.brand,
//           currentPrice: product.currentPrice,
//           originalPrice: product.originalPrice,
//           discountPercentage: product.discountPercentage,
//           rating: product.rating,
//           url: product.url
//         }))
//       }
//     });

//   } catch (error) {
//     const errorMessage = error instanceof Error ? error.message : String(error);
//     logger.error('❌ Failed to fetch deals:', { error: errorMessage });
    
//     res.status(500).json({
//       success: false,
//       timestamp: new Date().toISOString(),
//       error: errorMessage
//     });
//   }
// });

// // Error handling middleware
// app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
//   logger.error('Unhandled error:', { error: error.message, stack: error.stack });
//   res.status(500).json({
//     success: false,
//     timestamp: new Date().toISOString(),
//     error: 'Internal server error'
//   });
// });

// // 404 handler
// app.use('*', (_req: Request, res: Response) => {
//   res.status(404).json({
//     success: false,
//     timestamp: new Date().toISOString(),
//     error: 'Endpoint not found'
//   });
// });

// Helper functions
async function initializeServices() {
  const healthKartConfig = {
    baseUrl: process.env.HEALTHKART_BASE_URL!,
    requestDelayMs: parseInt(process.env.HEALTHKART_REQUEST_DELAY_MS!, 10),
    maxRetries: parseInt(process.env.HEALTHKART_MAX_RETRIES!, 10)
  };

  // const monitoringConfig = {
  //   discountThreshold: parseInt(process.env.DISCOUNT_THRESHOLD!, 10),
  //   priceDropThreshold: parseInt(process.env.PRICE_DROP_THRESHOLD!, 10),
  //   brands: process.env.BRANDS!.split(','),
  //   categories: process.env.CATEGORIES!.split(','),
  //   flavors: process.env.FLAVORS!.split(','),
  //   weightBuckets: process.env.WEIGHT_BUCKETS!.split(','),
  //   maxPrice: parseInt(process.env.MAX_PRICE!, 10),
  //   minRating: parseInt(process.env.MIN_RATING!, 10)
  // };

  const healthKartClient = new HealthKartApiClient(
    healthKartConfig.baseUrl,
    healthKartConfig.requestDelayMs,
    healthKartConfig.maxRetries
  );

  // const transformService = new HealthKartTransformService();
  
  const telegramService = new TelegramService({
    botToken: process.env.TELEGRAM_BOT_TOKEN!,
    defaultChatId: process.env.TELEGRAM_CHAT_ID!,
    maxRetries: 3,
    retryDelay: 1000
  });

  // const monitorUseCase = new MonitorProductDealsUseCase({
  //   apiClient: healthKartClient,
  //   transformService,
  //   telegramService
  // });

  return {
    healthKartClient,
    // transformService,
    telegramService,
    // monitorUseCase,
    // logger: getLogger().createChild({ service: 'ApiServices' })
  };
}

// async function fetchHealthKartProducts(dependencies: any, categoryCode: string) {
//   try {
//     const products = await dependencies.healthKartClient.getProductsByCategory(
//       categoryCode,
//       { pageNo: 1, perPage: 100 }
//     );
    
//     return {
//       success: true,
//       products,
//       count: products.length
//     };
//   } catch (error) {
//     return {
//       success: false,
//       products: [],
//       count: 0,
//       error: error instanceof Error ? error.message : String(error)
//     };
//   }
// }

// async function analyzeProducts(dependencies: any, products: any[]) {
//   try {
//     const transformedProducts = products.map(product => 
//       dependencies.transformService.transformToProduct(product)
//     );

//     const config = getDemoConfiguration();
//     const filteredProducts = transformedProducts.filter(product => {
//       return product.discountPercentage >= config.monitoring.alertConfig.discountThreshold &&
//              product.currentPrice <= config.monitoring.alertConfig.maxPrice &&
//              product.rating >= config.monitoring.alertConfig.minRating;
//     });

//     return {
//       success: true,
//       allProducts: transformedProducts,
//       filteredProducts,
//       totalCount: transformedProducts.length,
//       filteredCount: filteredProducts.length
//     };
//   } catch (error) {
//     return {
//       success: false,
//       allProducts: [],
//       filteredProducts: [],
//       totalCount: 0,
//       filteredCount: 0,
//       error: error instanceof Error ? error.message : String(error)
//     };
//   }
// }

// async function sendTelegramAlert(dependencies: any, products: Product[]) {
//   try {
//     const message = formatConsolidatedDealAlert({
//       products,
//       timestamp: new Date()
//     });

//     await dependencies.telegramService.sendMessage(message);
    
//     return {
//       success: true,
//       message: 'Telegram alert sent successfully'
//     };
//   } catch (error) {
//     return {
//       success: false,
//       error: error instanceof Error ? error.message : String(error)
//     };
//   }
// }

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`🚀 MB Script API Server running on port ${PORT}`);
    logger.info(`📡 Health check: http://localhost:${PORT}/health`);
    logger.info(`🔔 Send Alert: POST http://localhost:${PORT}/api/send-alert`);
    logger.info(`📊 Get Deals: GET http://localhost:${PORT}/api/deals`);
  });
}

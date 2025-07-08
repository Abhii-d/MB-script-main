// /**
//  * Demo script to showcase HealthKart data fetching and analysis
//  * Follows Clean Architecture and TypeScript best practices from copilot-instructions.md
//  */

// import { config } from 'dotenv';
// import { HealthKartApiClient } from '../../infrastructure/external/HealthKartApiClient.js';
// import { HealthKartTransformService } from '../../infrastructure/external/HealthKartTransformService.js';
// import { TelegramService } from '../../infrastructure/external/TelegramService.js';
// import { MonitorProductDealsUseCase } from '../../application/use-cases/MonitorProductDeals.js';
// import { getLogger, initializeLogger } from '../../shared/utils/logger.js';
// import { getDemoConfiguration, DemoConfiguration } from '../../shared/config/demoConfig.js';
// import { formatConsolidatedDealAlert } from '../../shared/utils/messageFormatter.js';
// import { 
//   DemoServiceDependencies, 
//   ProductFetchResult, 
//   ProductAnalysisResult, 
//   TelegramAlertResult,
//   DemoExecutionResult,
//   isDemoServiceDependencies 
// } from './types.js';
// import { Product } from '../../domain/entities/Product.js';

// // Load environment variables
// config();

// /**
//  * Main demo function following the requested structure:
//  * 1. Initialize all required models
//  * 2. Get all products based on result
//  * 3. Restructure data in our format
//  * 4. Send Telegram alerts with consolidated message
//  * 
//  * @returns Promise resolving to demo execution result
//  * @throws {Error} When demo execution fails
//  */
// export async function runDemo(): Promise<DemoExecutionResult> {
//   const startTime = Date.now();
  
//   try {
//     // Step 1: Initialize all required models
//     const dependencies = await initializeModels();
//     const config = getDemoConfiguration();
    
//     dependencies.logger.info('🚀 Starting HealthKart Product Monitoring Demo');

//     // Step 2: Get all products based on our result
//     const fetchResult = await fetchProducts(
//       dependencies, 
//       config.healthkart.categoryCodes.wheyProtein
//     );

//     // Step 3: Restructure data in our format
//     const analysisResult = await restructureProductData(
//       dependencies,
//       fetchResult.products,
//       config.monitoring.alertConfig
//     );

//     // Step 4: Send Telegram alerts with consolidated message
//     const alertResult = await sendTelegramAlerts(
//       dependencies,
//       analysisResult.matchingProducts
//     );

//     // Log final results
//     logDemoResults(dependencies, fetchResult, analysisResult, alertResult);

//     const executionDuration = Date.now() - startTime;
    
//     return createDemoExecutionResult(
//       fetchResult,
//       analysisResult,
//       alertResult,
//       executionDuration
//     );

//   } catch (error) {
//     const logger = getLogger();
//     const executionDuration = Date.now() - startTime;
    
//     logger.logError(error as Error, {
//       operation: 'runDemo',
//       duration: `${executionDuration}ms`,
//     });

//     throw error;
//   }
// }

// /**
//  * Initializes all required service models with dependency injection
//  * 
//  * @returns Promise resolving to demo service dependencies
//  * @throws {Error} When model initialization fails
//  */
// async function initializeModels(): Promise<DemoServiceDependencies> {
//   try {
//     // Initialize logger
//     initializeLogger({
//       level: 'info',
//       enableConsole: true,
//     });

//     const logger = getLogger().createChild({ service: 'Demo' });
//     const config = getDemoConfiguration();

//     // Initialize API client
//     const apiClient = new HealthKartApiClient(
//       config.healthkart.baseUrl,
//       config.healthkart.requestDelayMs,
//       config.healthkart.maxRetries
//     );

//     // Initialize transform service
//     const transformService = new HealthKartTransformService();

//     // Initialize optional Telegram service
//     const telegramService = await initializeTelegramService(logger);

//     // Initialize monitoring use case
//     const monitoringUseCase = new MonitorProductDealsUseCase({
//       apiClient,
//       transformService,
//       telegramService,
//     });

//     const dependencies: DemoServiceDependencies = {
//       apiClient,
//       transformService,
//       telegramService,
//       monitoringUseCase,
//       logger,
//     };

//     // Validate dependencies
//     if (!isDemoServiceDependencies(dependencies)) {
//       throw new Error('Failed to initialize valid service dependencies');
//     }

//     logger.info('✅ All service models initialized successfully');
//     return dependencies;

//   } catch (error) {
//     throw new Error(`Model initialization failed: ${error instanceof Error ? error.message : String(error)}`);
//   }
// }

// /**
//  * Initializes Telegram service if credentials are available
//  * 
//  * @param logger - Logger instance for structured logging
//  * @returns Promise resolving to Telegram service or undefined
//  */
// async function initializeTelegramService(logger: ReturnType<typeof getLogger>): Promise<TelegramService | undefined> {
//   const botToken = process.env.TELEGRAM_BOT_TOKEN;
//   const chatId = process.env.TELEGRAM_CHAT_ID;

//   if (!botToken || !chatId) {
//     logger.info('ℹ️ No Telegram credentials - running in demo mode only');
//     return undefined;
//   }

//   try {
//     logger.info('🤖 Telegram credentials found - enabling real alerts');
    
//     const telegramService = new TelegramService({
//       botToken,
//       defaultChatId: chatId,
//       maxRetries: 3,
//       retryDelay: 2000,
//     });

//     // Test connection
//     const connectionTest = await telegramService.testConnection();
//     if (connectionTest.success) {
//       logger.info('✅ Telegram bot connection successful', {
//         botName: connectionTest.botInfo?.username,
//       });
//       return telegramService;
//     } else {
//       logger.warn('❌ Telegram connection failed', {
//         error: connectionTest.error,
//       });
//       return undefined;
//     }

//   } catch (error) {
//     logger.logError(error as Error, {
//       operation: 'initializeTelegramService',
//     });
//     return undefined;
//   }
// }

// /**
//  * Fetches products from HealthKart API
//  * 
//  * @param dependencies - Service dependencies
//  * @param categoryCode - HealthKart category code
//  * @returns Promise resolving to product fetch result
//  */
// async function fetchProducts(
//   dependencies: DemoServiceDependencies,
//   categoryCode: string
// ): Promise<ProductFetchResult> {
//   const startTime = Date.now();
  
//   try {
//     dependencies.logger.info('📊 Fetching products from HealthKart...', {
//       categoryCode,
//     });

//     const result = await dependencies.monitoringUseCase.execute(
//       categoryCode,
//       getDemoConfiguration().monitoring.alertConfig
//     );

//     const fetchDuration = Date.now() - startTime;

//     dependencies.logger.info('✅ Products fetched successfully', {
//       totalProducts: result.totalProducts,
//       matchingProducts: result.matchingProducts.length,
//       duration: `${fetchDuration}ms`,
//     });

//     return {
//       products: result.matchingProducts,
//       totalCount: result.totalProducts,
//       fetchDuration,
//       errors: result.errors,
//     };

//   } catch (error) {
//     const fetchDuration = Date.now() - startTime;
//     dependencies.logger.logError(error as Error, {
//       operation: 'fetchProducts',
//       categoryCode,
//       duration: `${fetchDuration}ms`,
//     });
//     throw error;
//   }
// }

// /**
//  * Restructures product data and performs analysis
//  * 
//  * @param dependencies - Service dependencies
//  * @param products - Raw products to analyze
//  * @param alertConfig - Alert configuration for filtering
//  * @returns Promise resolving to product analysis result
//  */
// async function restructureProductData(
//   dependencies: DemoServiceDependencies,
//   products: readonly Product[],
//   alertConfig: ReturnType<typeof getDemoConfiguration>['monitoring']['alertConfig']
// ): Promise<ProductAnalysisResult> {
//   try {
//     dependencies.logger.info('🔄 Restructuring and analyzing product data', {
//       productCount: products.length,
//     });

//     // Get top deals
//     const topDeals = dependencies.monitoringUseCase.getTopDeals(
//       { matchingProducts: products } as Parameters<typeof dependencies.monitoringUseCase.getTopDeals>[0],
//       5
//     );

//     // Analyze deals
//     const dealAnalysis = dependencies.monitoringUseCase.analyzeDeals(products);

//     // Get statistics
//     const statistics = dependencies.monitoringUseCase.getMonitoringStats(
//       { totalProducts: products.length, matchingProducts: products } as Parameters<typeof dependencies.monitoringUseCase.getMonitoringStats>[0]
//     );

//     // Get distribution
//     const distribution = dependencies.monitoringUseCase.analyzeProductDistribution(products);

//     dependencies.logger.info('✅ Product data restructured successfully', {
//       topDeals: topDeals.length,
//       hotDeals: dealAnalysis.hotDeals.length,
//       goodDeals: dealAnalysis.goodDeals.length,
//     });

//     return {
//       matchingProducts: products,
//       topDeals,
//       dealAnalysis,
//       statistics,
//       distribution,
//     };

//   } catch (error) {
//     dependencies.logger.logError(error as Error, {
//       operation: 'restructureProductData',
//       productCount: products.length,
//     });
//     throw error;
//   }
// }

// /**
//  * Sends consolidated Telegram alerts for matching products
//  * 
//  * @param dependencies - Service dependencies
//  * @param products - Products to send alerts for
//  * @returns Promise resolving to Telegram alert result
//  */
// async function sendTelegramAlerts(
//   dependencies: DemoServiceDependencies,
//   products: readonly Product[]
// ): Promise<TelegramAlertResult> {
//   const startTime = Date.now();
  
//   if (!dependencies.telegramService || products.length === 0) {
//     dependencies.logger.info('ℹ️ Skipping Telegram alerts', {
//       reason: !dependencies.telegramService ? 'No Telegram service' : 'No products',
//       productCount: products.length,
//     });
    
//     return {
//       alertsSent: 0,
//       alertsFailed: 0,
//       alertDuration: Date.now() - startTime,
//       success: true,
//       errors: [],
//     };
//   }

//   try {
//     dependencies.logger.info('📤 Sending consolidated Telegram alert', {
//       productCount: products.length,
//     });

//     // Format consolidated message
//     const consolidatedMessage = formatConsolidatedDealAlert({
//       products,
//       timestamp: new Date(),
//     });

//     // Send single consolidated message
//     const alertResult = await dependencies.telegramService.sendMessage({
//       chatId: process.env.TELEGRAM_CHAT_ID!,
//       message: consolidatedMessage,
//       parseMode: 'Markdown',
//       disablePreview: true,
//     });

//     const alertDuration = Date.now() - startTime;

//     if (alertResult) {
//       dependencies.logger.info('✅ Consolidated alert sent successfully', {
//         productCount: products.length,
//         duration: `${alertDuration}ms`,
//       });

//       return {
//         alertsSent: 1,
//         alertsFailed: 0,
//         alertDuration,
//         success: true,
//         errors: [],
//       };
//     } else {
//       dependencies.logger.warn('❌ Consolidated alert failed to send');

//       return {
//         alertsSent: 0,
//         alertsFailed: 1,
//         alertDuration,
//         success: false,
//         errors: ['Failed to send consolidated alert'],
//       };
//     }

//   } catch (error) {
//     const alertDuration = Date.now() - startTime;
//     const errorMessage = error instanceof Error ? error.message : String(error);
    
//     dependencies.logger.logError(error as Error, {
//       operation: 'sendTelegramAlerts',
//       productCount: products.length,
//       duration: `${alertDuration}ms`,
//     });

//     return {
//       alertsSent: 0,
//       alertsFailed: 1,
//       alertDuration,
//       success: false,
//       errors: [errorMessage],
//     };
//   }
// }

// /**
//  * Logs comprehensive demo results
//  * 
//  * @param dependencies - Service dependencies
//  * @param fetchResult - Product fetch result
//  * @param analysisResult - Product analysis result
//  * @param alertResult - Telegram alert result
//  */
// function logDemoResults(
//   dependencies: DemoServiceDependencies,
//   fetchResult: ProductFetchResult,
//   analysisResult: ProductAnalysisResult,
//   alertResult: TelegramAlertResult
// ): void {
//   dependencies.logger.info('📊 Demo Results Summary', {
//     fetch: {
//       totalProducts: fetchResult.totalCount,
//       matchingProducts: analysisResult.matchingProducts.length,
//       fetchDuration: `${fetchResult.fetchDuration}ms`,
//     },
//     analysis: {
//       topDeals: analysisResult.topDeals.length,
//       hotDeals: analysisResult.dealAnalysis.hotDeals.length,
//       goodDeals: analysisResult.dealAnalysis.goodDeals.length,
//     },
//     alerts: {
//       sent: alertResult.alertsSent,
//       failed: alertResult.alertsFailed,
//       duration: `${alertResult.alertDuration}ms`,
//       success: alertResult.success,
//     },
//   });
// }

// /**
//  * Creates demo execution result from individual results
//  * 
//  * @param fetchResult - Product fetch result
//  * @param analysisResult - Product analysis result
//  * @param alertResult - Telegram alert result
//  * @param executionDuration - Total execution duration in milliseconds
//  * @returns Demo execution result
//  */
// function createDemoExecutionResult(
//   fetchResult: ProductFetchResult,
//   analysisResult: ProductAnalysisResult,
//   alertResult: TelegramAlertResult,
//   executionDuration: number
// ): DemoExecutionResult {
//   return {
//     totalProducts: fetchResult.totalCount,
//     matchingProducts: analysisResult.matchingProducts.length,
//     alertsTriggered: analysisResult.matchingProducts.length > 0,
//     alertsSent: alertResult.alertsSent,
//     alertsFailed: alertResult.alertsFailed,
//     executionDuration,
//     timestamp: new Date(),
//     errors: [...fetchResult.errors, ...alertResult.errors],
//   };
// }

// /**
//  * Displays usage instructions for the demo
//  */
// function displayUsage(): void {
//   console.log(`
// 🎯 HealthKart Product Monitoring Demo

// This demo showcases:
// • ✅ Fetching products from HealthKart API
// • ✅ Data transformation and validation
// • ✅ Discount-based filtering and analysis
// • ✅ Brand, flavor, and weight filtering
// • ✅ Product analysis and categorization  
// • ✅ Real Telegram alert integration
// • ✅ Consolidated alert message formatting
// • ✅ Comprehensive error handling
// • ✅ Performance monitoring and logging

// 🚀 To run the demo:
// npm run build && node dist/interfaces/cli/demo.js

// 📱 Telegram Integration:
// • Copy env.example to .env
// • Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID
// • Demo runs in display-only mode without credentials
// • With credentials: sends real consolidated alerts

// 📊 Expected Output:
// • Product fetching and filtering results
// • Top deals with discount percentages
// • Deal analysis and monitoring statistics
// • Telegram alert sending results
// • Consolidated message with all product details
//   `);
// }

// // Run demo if called directly
// if (import.meta.url === `file://${process.argv[1]}`) {
//   const args = process.argv.slice(2);
  
//   if (args.includes('--help') || args.includes('-h')) {
//     displayUsage();
//   } else {
//     runDemo()
//       .then((result) => {
//         console.log('✨ Demo completed successfully!', {
//           totalProducts: result.totalProducts,
//           matchingProducts: result.matchingProducts,
//           alertsSent: result.alertsSent,
//           duration: `${result.executionDuration}ms`,
//         });
//       })
//       .catch((error) => {
//         console.error('❌ Demo execution failed:', error instanceof Error ? error.message : String(error));
//         process.exit(1);
//       });
//   }
// }

// // export { runDemo };
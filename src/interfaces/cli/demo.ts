/**
 * Demo script to showcase HealthKart data fetching and analysis
 * Following the guideline: Use dependency injection and proper error handling
 */

import { HealthKartApiClient } from '../../infrastructure/external/HealthKartApiClient.js';
import { HealthKartTransformService } from '../../infrastructure/external/HealthKartTransformService.js';
import { MonitorProductDealsUseCase } from '../../application/use-cases/MonitorProductDeals.js';

import { getLogger, initializeLogger } from '../../shared/utils/logger.js';

/**
 * Demo configuration for testing without environment variables
 */
const DEMO_CONFIG = {
  healthkart: {
    baseUrl: 'https://www.healthkart.com',
    categoryCodes: {
      wheyProtein: 'SCT-snt-pt-wp',
      massGainer: 'SCT-snt-pt-mg',
      creatine: 'SCT-snt-pt-cr',
    },
    requestDelayMs: 1000,
    maxRetries: 3,
  },
  monitoring: {
    alertConfig: {
      discountThreshold: 40,
      priceDropThreshold: 5,
      brands: ['muscleblaze', 'optimum nutrition', 'dymatize', 'gnc'],
      categories: ['wheyProtein'],
      maxPrice: 8000,
      minRating: 3.5,
    },
  },
};

async function runDemo(): Promise<void> {
  try {
    // Initialize logger for demo
    initializeLogger({
      level: 'info',
      enableConsole: true,
    });

    const logger = getLogger().createChild({ service: 'Demo' });
    
    logger.info('🚀 Starting HealthKart Product Monitoring Demo');

    // Step 1: Create dependencies
    const apiClient = new HealthKartApiClient(
      DEMO_CONFIG.healthkart.baseUrl,
      DEMO_CONFIG.healthkart.requestDelayMs,
      DEMO_CONFIG.healthkart.maxRetries
    );

    const transformService = new HealthKartTransformService();

    // Step 2: Create use case with dependencies
    const monitoringUseCase = new MonitorProductDealsUseCase({
      apiClient,
      transformService,
    });

    logger.info('📊 Fetching whey protein products from HealthKart...');

    // Step 3: Execute monitoring for whey proteins
    const result = await monitoringUseCase.execute(
      DEMO_CONFIG.healthkart.categoryCodes.wheyProtein,
      DEMO_CONFIG.monitoring.alertConfig
    );

    // Step 4: Display results
    logger.info('✅ Monitoring completed successfully!', {
      totalProducts: result.totalProducts,
      matchingProducts: result.matchingProducts.length,
      alertTriggered: result.alertTriggered,
      duration: `${Date.now() - result.timestamp.getTime()}ms`,
    });

    // Step 5: Analyze and display top deals
    const topDeals = monitoringUseCase.getTopDeals(result, 5);
    
    if (topDeals.length > 0) {
      logger.info('🔥 Top 5 Deals Found:');
      
      topDeals.forEach((product, index) => {
        logger.info(`${index + 1}. ${product.getDisplayName()}`, {
          discount: `${product.discountPercentage}%`,
          originalPrice: `₹${product.originalPrice}`,
          currentPrice: `₹${product.currentPrice}`,
          savings: `₹${product.getSavingsAmount()}`,
          rating: `${product.rating}/5 (${product.reviewCount} reviews)`,
          pricePerGramProtein: `₹${product.getPricePerGramProtein().toFixed(2)}/g protein`,
        });
      });

      // Step 6: Analyze deal categories
      const dealAnalysis = monitoringUseCase.analyzeDeals(result.matchingProducts);
      
      logger.info('📈 Deal Analysis:', {
        hotDeals: dealAnalysis.hotDeals.length,
        goodDeals: dealAnalysis.goodDeals.length,
        premiumDeals: dealAnalysis.premiumDeals.length,
        valueDeals: dealAnalysis.valueDeals.length,
      });

      // Step 7: Display monitoring statistics
      const stats = monitoringUseCase.getMonitoringStats(result);
      
      logger.info('📊 Monitoring Statistics:', {
        totalProducts: stats.totalProducts,
        matchingProducts: stats.matchingProducts,
        matchRate: `${stats.matchRate}%`,
        avgDiscount: `${stats.avgDiscount}%`,
        maxDiscount: `${stats.maxDiscount}%`,
        avgRating: `${stats.avgRating}/5`,
        topBrands: stats.topBrands,
      });

      // Step 8: Show sample alert message format
      const sampleProduct = topDeals[0];
      const alertMessage = formatAlertMessage(sampleProduct);
      
      logger.info('💬 Sample Alert Message:');
      console.log('\n' + alertMessage + '\n');

    } else {
      logger.info('ℹ️ No products found matching the criteria', {
        criteria: DEMO_CONFIG.monitoring.alertConfig,
      });
    }

    // Step 9: Demonstrate error handling and transformation stats
    const healthKartProducts = await apiClient.fetchAllCategoryProducts(
      DEMO_CONFIG.healthkart.categoryCodes.wheyProtein
    );
    
    const transformedProducts = transformService.transformToProducts(healthKartProducts);
    const transformStats = transformService.getTransformationStats(healthKartProducts, transformedProducts);
    
    logger.info('🔄 Data Transformation Statistics:', transformStats);

    logger.info('✨ Demo completed successfully!');

  } catch (error) {
    const logger = getLogger();
    logger.logError(error as Error, {
      operation: 'runDemo',
      demoConfig: DEMO_CONFIG,
    });

    console.error('❌ Demo failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Format a product for alert message (Telegram-ready format)
 */
function formatAlertMessage(product: any): string {
  const discountEmoji = product.discountPercentage >= 50 ? '🔥' : '💰';
  const ratingStars = '⭐'.repeat(Math.floor(product.rating));
  
  return `${discountEmoji} **SUPPLEMENT DEAL ALERT** ${discountEmoji}

🏷️ **${product.getDisplayName()}**

💸 **${product.discountPercentage}% OFF**
~~₹${product.originalPrice}~~ → **₹${product.currentPrice}**
💰 Save ₹${product.getSavingsAmount()}

${ratingStars} ${product.rating}/5 (${product.reviewCount} reviews)

📊 **Specifications:**
• Weight: ${product.specifications.weight}
• Protein: ${product.specifications.proteinPerServing} per serving
• Servings: ${product.specifications.servingsPerContainer}
• Value: ₹${product.getPricePerGramProtein().toFixed(2)} per gram protein

🛒 **Order Now**: ${product.url}

#SupplementDeals #WheyProtein #${product.brand.replace(/\s+/g, '')}`;
}

/**
 * Display usage instructions
 */
function displayUsage(): void {
  console.log(`
🎯 HealthKart Product Monitoring Demo

This demo showcases:
• ✅ Fetching products from HealthKart API
• ✅ Data transformation and validation
• ✅ Discount-based filtering (40%+ deals)
• ✅ Product analysis and categorization  
• ✅ Alert message formatting
• ✅ Comprehensive error handling
• ✅ Performance monitoring and logging

🚀 To run the demo:
npm run build && node dist/interfaces/cli/demo.js

🔧 Configuration:
The demo uses hardcoded configuration for testing.
For production, set up environment variables as per README.md

📊 Expected Output:
• Product fetching and filtering results
• Top deals with discount percentages
• Deal analysis (hot/good/premium/value deals)
• Monitoring statistics and performance metrics
• Sample Telegram alert message format
  `);
}

// Run demo if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    displayUsage();
  } else {
    runDemo().catch(error => {
      console.error('Demo execution failed:', error);
      process.exit(1);
    });
  }
}

export { runDemo, formatAlertMessage }; 
/**
 * Monitor Product Deals Use Case
 * Following the guideline: Use service layer for business logic and dependency injection
 */

import { Product } from '../../domain/entities/Product.js';
import { HealthKartApiClient } from '../../infrastructure/external/HealthKartApiClient.js';
import { HealthKartTransformService } from '../../infrastructure/external/HealthKartTransformService.js';
import { TelegramService } from '../../infrastructure/external/TelegramService.js';
import { ProductFilter, AlertConfiguration } from '../../shared/types/index.js';
import { MonitoringError } from '../../shared/errors/index.js';
import { getLogger } from '../../shared/utils/logger.js';

export interface MonitoringResult {
  totalProducts: number;
  matchingProducts: Product[];
  alertTriggered: boolean;
  alertsSent: number;
  alertsFailed: number;
  timestamp: Date;
  errors: string[];
}

export interface ProductMonitoringDependencies {
  apiClient: HealthKartApiClient;
  transformService: HealthKartTransformService;
  telegramService?: TelegramService; // Optional for demo mode
}

export class MonitorProductDealsUseCase {
  private readonly logger = getLogger().createChild({ service: 'MonitorProductDealsUseCase' });

  constructor(
    private readonly dependencies: ProductMonitoringDependencies
  ) {}

  /**
   * Monitor products for deals based on configuration
   */
  public async execute(
    categoryCode: string,
    alertConfig: AlertConfiguration
  ): Promise<MonitoringResult> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Starting product monitoring', {
        categoryCode,
        alertConfig,
        operation: 'MonitorProductDeals',
      });

      // Step 1: Build product filter from alert configuration
      const productFilter = this.buildProductFilter(alertConfig);

      // Step 2: Fetch and filter products from HealthKart
      const healthKartProducts = await this.dependencies.apiClient.fetchFilteredProducts(
        categoryCode,
        productFilter
      );

      this.logger.info('Fetched products from HealthKart', {
        categoryCode,
        totalProducts: healthKartProducts.length,
      });

      // Step 3: Transform to domain models
      const products = this.dependencies.transformService.transformToProducts(healthKartProducts);

      // Step 4: Apply domain-level filtering and analysis
      const matchingProducts = this.findMatchingProducts(products, alertConfig);

      // Step 5: Send Telegram alerts if service is available
      let alertsSent = 0;
      let alertsFailed = 0;
      
      if (this.dependencies.telegramService && matchingProducts.length > 0) {
        try {
          const alertResults = await this.dependencies.telegramService.sendDealAlerts(matchingProducts);
          alertsSent = alertResults.sent;
          alertsFailed = alertResults.failed;
          
          this.logger.info('Telegram alerts sent', {
            totalAlerts: matchingProducts.length,
            sent: alertsSent,
            failed: alertsFailed,
          });
        } catch (error) {
          this.logger.logError(error as Error, {
            operation: 'sendTelegramAlerts',
            productCount: matchingProducts.length,
          });
          alertsFailed = matchingProducts.length;
        }
      }

      // Step 6: Determine if alerts were triggered
      const alertTriggered = matchingProducts.length > 0;

      // Step 7: Build monitoring result
      const result: MonitoringResult = {
        totalProducts: products.length,
        matchingProducts,
        alertTriggered,
        alertsSent,
        alertsFailed,
        timestamp: new Date(),
        errors: [],
      };

      const duration = Date.now() - startTime;
      
      this.logger.logMonitoringResult(
        result.totalProducts,
        result.matchingProducts.length,
        alertTriggered ? 1 : 0,
        duration
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.logError(error as Error, {
        operation: 'MonitorProductDeals',
        categoryCode,
        alertConfig,
        duration: `${duration}ms`,
      });

      throw new MonitoringError('Failed to monitor product deals', {
        cause: error,
        context: { categoryCode, alertConfig },
        operation: 'MonitorProductDeals',
      });
    }
  }

  /**
   * Monitor multiple categories simultaneously
   */
  public async executeMultiCategory(
    categoryCodes: string[],
    alertConfig: AlertConfiguration
  ): Promise<MonitoringResult> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Starting multi-category monitoring', {
        categoryCodes,
        categoryCount: categoryCodes.length,
        alertConfig,
      });

      const allResults = await Promise.allSettled(
        categoryCodes.map(categoryCode => 
          this.execute(categoryCode, alertConfig)
        )
      );

      // Aggregate results
      const aggregatedResult = this.aggregateResults(allResults);

      const duration = Date.now() - startTime;
      
      this.logger.logMonitoringResult(
        aggregatedResult.totalProducts,
        aggregatedResult.matchingProducts.length,
        aggregatedResult.alertTriggered ? 1 : 0,
        duration
      );

      return aggregatedResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.logError(error as Error, {
        operation: 'executeMultiCategory',
        categoryCodes,
        duration: `${duration}ms`,
      });

      throw new MonitoringError('Failed to monitor multiple categories', {
        cause: error,
        context: { categoryCodes, alertConfig },
        operation: 'executeMultiCategory',
      });
    }
  }

  /**
   * Get top deals from monitoring results
   */
  public getTopDeals(
    monitoringResult: MonitoringResult,
    limit: number = 10
  ): Product[] {
    return monitoringResult.matchingProducts
      .sort((a, b) => {
        // Sort by discount percentage (descending) then by rating (descending)
        if (b.discountPercentage !== a.discountPercentage) {
          return b.discountPercentage - a.discountPercentage;
        }
        return b.rating - a.rating;
      })
      .slice(0, limit);
  }

  /**
   * Analyze deal quality and categorize products
   */
  public analyzeDeals(products: Product[]): {
    hotDeals: Product[];      // >50% discount
    goodDeals: Product[];     // 40-50% discount
    premiumDeals: Product[];  // High-end brands with any discount
    valueDeals: Product[];    // Best protein per rupee ratio
  } {
    const hotDeals = products.filter(p => p.discountPercentage >= 50);
    const goodDeals = products.filter(p => p.discountPercentage >= 40 && p.discountPercentage < 50);
    
    const premiumBrands = ['optimum nutrition', 'dymatize', 'muscletech', 'bsn'];
    const premiumDeals = products.filter(p => 
      premiumBrands.some(brand => p.brand.toLowerCase().includes(brand.toLowerCase()))
    );

    const valueDeals = products
      .filter(p => p.getPricePerGramProtein() > 0)
      .sort((a, b) => a.getPricePerGramProtein() - b.getPricePerGramProtein())
      .slice(0, 10);

    return {
      hotDeals,
      goodDeals,
      premiumDeals,
      valueDeals,
    };
  }

  /**
   * Analyze flavor and weight distribution in deals
   */
  public analyzeProductDistribution(products: Product[]): {
    flavorDistribution: Array<{ flavor: string; count: number; avgDiscount: number }>;
    weightDistribution: Array<{ weight: string; count: number; avgDiscount: number }>;
    flavorBaseDistribution: Array<{ flavorBase: string; count: number; avgDiscount: number }>;
  } {
    // Analyze flavor distribution
    const flavorCounts = products.reduce((acc, product) => {
      const flavor = product.specifications.flavor || 'Unknown';
      if (!acc[flavor]) {
        acc[flavor] = { count: 0, totalDiscount: 0 };
      }
      acc[flavor].count++;
      acc[flavor].totalDiscount += product.discountPercentage;
      return acc;
    }, {} as Record<string, { count: number; totalDiscount: number }>);

    const flavorDistribution = Object.entries(flavorCounts)
      .map(([flavor, data]) => ({
        flavor,
        count: data.count,
        avgDiscount: Math.round((data.totalDiscount / data.count) * 100) / 100,
      }))
      .sort((a, b) => b.count - a.count);

    // Analyze weight distribution
    const weightCounts = products.reduce((acc, product) => {
      const weight = product.specifications.weightBucket || product.specifications.weight || 'Unknown';
      if (!acc[weight]) {
        acc[weight] = { count: 0, totalDiscount: 0 };
      }
      acc[weight].count++;
      acc[weight].totalDiscount += product.discountPercentage;
      return acc;
    }, {} as Record<string, { count: number; totalDiscount: number }>);

    const weightDistribution = Object.entries(weightCounts)
      .map(([weight, data]) => ({
        weight,
        count: data.count,
        avgDiscount: Math.round((data.totalDiscount / data.count) * 100) / 100,
      }))
      .sort((a, b) => b.count - a.count);

    // Analyze flavor base distribution
    const flavorBaseCounts = products.reduce((acc, product) => {
      const flavorBase = product.specifications.flavorBase || 'Unknown';
      if (!acc[flavorBase]) {
        acc[flavorBase] = { count: 0, totalDiscount: 0 };
      }
      acc[flavorBase].count++;
      acc[flavorBase].totalDiscount += product.discountPercentage;
      return acc;
    }, {} as Record<string, { count: number; totalDiscount: number }>);

    const flavorBaseDistribution = Object.entries(flavorBaseCounts)
      .map(([flavorBase, data]) => ({
        flavorBase,
        count: data.count,
        avgDiscount: Math.round((data.totalDiscount / data.count) * 100) / 100,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      flavorDistribution,
      weightDistribution,
      flavorBaseDistribution,
    };
  }

  /**
   * Build product filter from alert configuration
   */
  private buildProductFilter(alertConfig: AlertConfiguration): ProductFilter {
    return {
      minDiscount: alertConfig.discountThreshold,
      maxPrice: alertConfig.maxPrice,
      minRating: alertConfig.minRating,
      brands: alertConfig.brands,
      categories: alertConfig.categories,
      flavors: alertConfig.flavors,
      weightBuckets: alertConfig.weightBuckets,
      inStockOnly: true,
      minReviews: 1, // At least 1 review for credibility
    };
  }

  /**
   * Find products that match alert criteria using domain logic
   */
  private findMatchingProducts(
    products: Product[],
    alertConfig: AlertConfiguration
  ): Product[] {
    const criteria = {
      minDiscount: alertConfig.discountThreshold,
      maxPrice: alertConfig.maxPrice,
      minRating: alertConfig.minRating,
      minReviews: 1,
      preferredBrands: alertConfig.brands,
    };

    const matchingProducts = products.filter(product => 
      product.meetsAlertCriteria(criteria)
    );

    // Log analysis results
    this.logger.info('Product analysis completed', {
      totalProducts: products.length,
      matchingProducts: matchingProducts.length,
      criteria,
    });

    // Log top deals for debugging
    if (matchingProducts.length > 0) {
      const topDeals = matchingProducts
        .slice(0, 5)
        .map(p => ({
          name: p.getDisplayName(),
          discount: `${p.discountPercentage}%`,
          price: `₹${p.currentPrice}`,
          rating: p.rating,
        }));

      this.logger.info('Top matching deals found', { topDeals });
    }

    return matchingProducts;
  }

  /**
   * Aggregate results from multiple category monitoring
   */
  private aggregateResults(
    results: PromiseSettledResult<MonitoringResult>[]
  ): MonitoringResult {
    const aggregated: MonitoringResult = {
      totalProducts: 0,
      matchingProducts: [],
      alertTriggered: false,
      alertsSent: 0,
      alertsFailed: 0,
      timestamp: new Date(),
      errors: [],
    };

    for (const result of results) {
      if (result.status === 'fulfilled') {
        aggregated.totalProducts += result.value.totalProducts;
        aggregated.matchingProducts.push(...result.value.matchingProducts);
        aggregated.alertTriggered = aggregated.alertTriggered || result.value.alertTriggered;
        aggregated.alertsSent += result.value.alertsSent;
        aggregated.alertsFailed += result.value.alertsFailed;
        aggregated.errors.push(...result.value.errors);
      } else {
        const errorMessage = result.reason instanceof Error 
          ? result.reason.message 
          : String(result.reason);
        aggregated.errors.push(errorMessage);
        
        this.logger.warn('Category monitoring failed', {
          error: errorMessage,
        });
      }
    }

    return aggregated;
  }

  /**
   * Get monitoring statistics
   */
  public getMonitoringStats(result: MonitoringResult): {
    totalProducts: number;
    matchingProducts: number;
    matchRate: number;
    avgDiscount: number;
    maxDiscount: number;
    avgRating: number;
    topBrands: Array<{ brand: string; count: number }>;
  } {
    const { totalProducts, matchingProducts } = result;
    const matchRate = totalProducts > 0 ? (matchingProducts.length / totalProducts) * 100 : 0;

    const discounts = matchingProducts.map(p => p.discountPercentage);
    const avgDiscount = discounts.length > 0 
      ? discounts.reduce((a, b) => a + b, 0) / discounts.length 
      : 0;
    const maxDiscount = discounts.length > 0 ? Math.max(...discounts) : 0;

    const ratings = matchingProducts.map(p => p.rating);
    const avgRating = ratings.length > 0 
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
      : 0;

    // Count products by brand
    const brandCounts = matchingProducts.reduce((acc, product) => {
      acc[product.brand] = (acc[product.brand] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topBrands = Object.entries(brandCounts)
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalProducts,
      matchingProducts: matchingProducts.length,
      matchRate: Math.round(matchRate * 100) / 100,
      avgDiscount: Math.round(avgDiscount * 100) / 100,
      maxDiscount,
      avgRating: Math.round(avgRating * 100) / 100,
      topBrands,
    };
  }
} 
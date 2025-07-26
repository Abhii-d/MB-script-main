/**
 * Send Alert Use Case
 * Orchestrates the process of fetching products and sending Telegram alerts
 * Follows Clean Architecture and SOLID principles
 */

import { Logger } from '../../shared/utils/logger.js';
import { Product } from '../../domain/entities/Product.js';
import { ApiConfiguration } from '../../shared/config/apiConfig.js';
import { formatConsolidatedDealAlert } from '../../shared/utils/messageFormatter.js';
import { 
  ProductFetchError, 
  ProductProcessingError, 
  TelegramServiceError 
} from '../../shared/errors/index.js';
import { HealthKartProduct, ProductFilter } from '../../shared/types/index.js';
import { TelegramMessage } from '../../infrastructure/external/TelegramService.js';

/**
 * Interface for alert use case dependencies
 */
export interface SendAlertUseCaseDependencies {
  readonly healthKartClient: HealthKartClient;
  readonly transformService: TransformService;
  readonly telegramService: TelegramService;
  readonly logger: Logger;
  readonly config: ApiConfiguration;
}

/**
 * Interface for HealthKart client
 */
export interface HealthKartClient {
  fetchFilteredProducts(categoryCode: string, filters: ProductFilter): Promise<HealthKartProduct[]>;
}

/**
 * Interface for transform service
 */
export interface TransformService {
  transformToProducts(rawProducts: HealthKartProduct[]): Product[];
}

/**
 * Interface for Telegram service
 */
export interface TelegramService {
  sendMessage(messageData: TelegramMessage): Promise<boolean>;
}



/**
 * Interface for alert execution result
 */
export interface AlertExecutionResult {
  readonly totalProductsFetched: number;
  readonly qualifyingDeals: number;
  readonly telegramSent: boolean;
  readonly deals: readonly ProductSummary[];
}

/**
 * Interface for product summary
 */
export interface ProductSummary {
  readonly name: string;
  readonly brand: string;
  readonly currentPrice: number;
  readonly originalPrice: number;
  readonly discountPercentage: number;
  readonly rating: number;
  readonly url: string;
}

/**
 * Send Alert Use Case implementation
 * Coordinates product fetching, filtering, and alert sending
 */
export class SendAlertUseCase {
  constructor(private readonly dependencies: SendAlertUseCaseDependencies) {}

  /**
   * Executes the alert workflow
   * 
   * @param requestId - Unique request identifier for tracking
   * @returns Promise with execution result
   */
  async execute(requestId: string): Promise<AlertExecutionResult> {
    const { logger, config } = this.dependencies;
    
    try {
      logger.info('Starting alert execution workflow', { requestId });
      
      // Step 1: Fetch products from HealthKart
      const rawProducts = await this.fetchProducts(requestId);
      
      // Step 2: Transform and filter products
      const qualifyingDeals = await this.processProducts(rawProducts, requestId);
      
      // Step 3: Send Telegram alert if deals found
      const telegramSent = await this.sendAlert(qualifyingDeals, requestId);
      
      const result: AlertExecutionResult = {
        totalProductsFetched: rawProducts.length,
        qualifyingDeals: qualifyingDeals.length,
        telegramSent,
        deals: this.createProductSummaries(qualifyingDeals, config.endpoint.maxProductsInAlert)
      };
      
      logger.info('Alert execution completed successfully', { requestId, result });
      return result;
      
    } catch (error) {
      logger.error('Alert execution failed', { requestId, error });
      throw error;
    }
  }

  /**
   * Fetches products from HealthKart API
   */
  private async fetchProducts(requestId: string): Promise<HealthKartProduct[]> {
    const { healthKartClient, config, logger } = this.dependencies;
    
    try {
      logger.info('Fetching products from HealthKart', { requestId });
      
      const products = await healthKartClient.fetchFilteredProducts(
        config.healthkart.defaultCategoryCode,
        config.productFilter
      );
      
      if (!products || products.length === 0) {
        throw new ProductFetchError('No products returned from HealthKart API');
      }
      
      logger.info('Products fetched successfully', { 
        requestId, 
        count: products.length 
      });
      
      return products;
      
    } catch (error) {
      throw new ProductFetchError(
        'Failed to fetch products from HealthKart',
        undefined,
        { cause: error, requestId }
      );
    }
  }

  /**
   * Processes and filters products
   */
  private async processProducts(rawProducts: HealthKartProduct[], requestId: string): Promise<Product[]> {
    const { transformService, config, logger } = this.dependencies;
    
    try {
      logger.info('Processing products', { requestId, count: rawProducts.length });
      
      // Transform to domain entities
      const transformedProducts = transformService.transformToProducts(rawProducts);
      
      // Apply business rules for filtering
      const qualifyingDeals = this.filterQualifyingDeals(transformedProducts, config);
      
      logger.info('Products processed successfully', { 
        requestId, 
        totalProducts: transformedProducts.length,
        qualifyingDeals: qualifyingDeals.length 
      });
      
      return qualifyingDeals;
      
    } catch (error) {
      throw new ProductProcessingError(
        'Failed to process products',
        rawProducts.length,
        { cause: error, requestId }
      );
    }
  }

  /**
   * Sends Telegram alert for qualifying deals
   */
  private async sendAlert(products: Product[], requestId: string): Promise<boolean> {
    const { telegramService, config, logger } = this.dependencies;
    
    if (products.length === 0) {
      logger.info('No qualifying deals found, skipping alert', { requestId });
      return false;
    }
    
    try {
      logger.info('Sending Telegram alert', { requestId, dealCount: products.length });
      
      const message = formatConsolidatedDealAlert({
        products,
        timestamp: new Date()
      });
      
      const success = await telegramService.sendMessage({
        chatId: config.telegram.defaultChatId,
        message,
        parseMode: 'Markdown',
        disablePreview: true
      });
      
      logger.info('Telegram alert sent successfully', { requestId, success });
      return success;
      
    } catch (error) {
      throw new TelegramServiceError(
        'Failed to send Telegram alert',
        config.telegram.defaultChatId,
        { cause: error, requestId }
      );
    }
  }

  /**
   * Filters products based on business rules
   */
  private filterQualifyingDeals(products: Product[], config: ApiConfiguration): Product[] {
    return products.filter(product => {
      return product.discountPercentage >= config.productFilter.minDiscount &&
             product.currentPrice <= config.productFilter.maxPrice &&
             product.rating >= config.productFilter.minRating &&
             product.reviewCount >= config.productFilter.minReviews &&
             (config.productFilter.inStockOnly ? product.isInStock : true);
    });
  }

  /**
   * Creates product summaries for API response
   */
  private createProductSummaries(products: Product[], maxCount: number): ProductSummary[] {
    return products.slice(0, maxCount).map(product => ({
      name: product.name,
      brand: product.brand,
      currentPrice: product.currentPrice,
      originalPrice: product.originalPrice,
      discountPercentage: product.discountPercentage,
      rating: product.rating,
      url: product.url
    }));
  }
} 
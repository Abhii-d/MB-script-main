/**
 * HealthKart API Client with retry logic and rate limiting
 * Following the guideline: Implement retry logic for external calls
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  HealthKartApiResponse, 
  HealthKartProduct, 
  ProductFilter, 
  ApiRequestOptions 
} from '../../shared/types/index.js';
import { 
  HealthKartApiError, 
  RetryExhaustedError, 
  DataParsingError 
} from '../../shared/errors/index.js';
import { getLogger } from '../../shared/utils/logger.js';

interface CategoryRequestParams {
  categoryCode: string;
  pageNo: number;
  perPage: number;
  excludeOOS: boolean;
  plt: number;
  st: number;
}

export class HealthKartApiClient {
  private readonly httpClient: AxiosInstance;
  private readonly logger = getLogger().createChild({ service: 'HealthKartApiClient' });
  private lastRequestTime = 0;

  constructor(
    private readonly baseUrl: string,
    private readonly requestDelayMs: number,
    private readonly maxRetries: number
  ) {
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Fetch products from a specific category with pagination
   */
  public async fetchCategoryProducts(
    categoryCode: string,
    pageNo: number = 1,
    perPage: number = 24
  ): Promise<HealthKartApiResponse> {
    const startTime = Date.now();
    
    try {
      await this.enforceRateLimit();

      const params: CategoryRequestParams = {
        categoryCode,
        pageNo,
        perPage,
        excludeOOS: true,
        plt: 1,
        st: 1,
      };

      const endpoint = `/veronica/catalog/best-seller/results`;
      const response = await this.executeWithRetry(
        () => this.httpClient.get<HealthKartApiResponse>(endpoint, {
          params: {
            nKey: params.categoryCode,
            pageNo: params.pageNo,
            perPage: params.perPage,
            excludeOOS: params.excludeOOS,
            plt: params.plt,
            st: params.st,
          },
        }),
        {
          timeout: 30000,
          retries: this.maxRetries,
          retryDelay: 2000,
        }
      );

      const duration = Date.now() - startTime;
      
      this.logger.logApiRequest(endpoint, 'GET', response.status, duration);
      this.validateApiResponse(response.data);

      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.logError(error as Error, {
        operation: 'fetchCategoryProducts',
        categoryCode,
        pageNo,
        perPage,
        duration: `${duration}ms`,
      });

      if (error instanceof HealthKartApiError || error instanceof RetryExhaustedError) {
        throw error;
      }

      throw new HealthKartApiError('Failed to fetch category products', {
        cause: error,
        context: { categoryCode, pageNo, perPage },
        endpoint: '/veronica/catalog/best-seller/results',
      });
    }
  }

  /**
   * Fetch all products from a category (handles pagination automatically)
   */
  public async fetchAllCategoryProducts(categoryCode: string): Promise<HealthKartProduct[]> {
    const startTime = Date.now();
    const allProducts: HealthKartProduct[] = [];
    let currentPage = 1;
    let totalPages = 1;

    try {
      this.logger.info('Starting to fetch all products from category', {
        categoryCode,
        operation: 'fetchAllCategoryProducts',
      });

      do {
        const response = await this.fetchCategoryProducts(categoryCode, currentPage);
        
        if (!response.results.variants || response.results.variants.length === 0) {
          break;
        }

        allProducts.push(...response.results.variants);
        
        // Calculate total pages based on response
        const totalVariants = response.results.total_variants;
        const perPage = response.results.perPage;
        totalPages = Math.ceil(totalVariants / perPage);

        this.logger.debug('Fetched page of products', {
          currentPage,
          totalPages,
          productsOnPage: response.results.variants.length,
          totalProductsSoFar: allProducts.length,
        });

        currentPage++;
      } while (currentPage <= totalPages);

      const duration = Date.now() - startTime;
      
      this.logger.logPerformance('fetchAllCategoryProducts', duration, true, {
        categoryCode,
        totalProducts: allProducts.length,
        totalPages: totalPages,
      });

      return allProducts;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.logPerformance('fetchAllCategoryProducts', duration, false, {
        categoryCode,
        currentPage,
        totalPages,
        productsRetrieved: allProducts.length,
      });

      throw error;
    }
  }

  /**
   * Fetch products with filtering applied
   */
  public async fetchFilteredProducts(
    categoryCode: string,
    filter: ProductFilter
  ): Promise<HealthKartProduct[]> {
    const startTime = Date.now();

    try {
      const allProducts = await this.fetchAllCategoryProducts(categoryCode);
      const filteredProducts = this.applyProductFilter(allProducts, filter);

      const duration = Date.now() - startTime;
      
      this.logger.info('Product filtering completed', {
        categoryCode,
        totalProducts: allProducts.length,
        filteredProducts: filteredProducts.length,
        filter,
        duration: `${duration}ms`,
      });

      return filteredProducts;
    } catch (error) {
      this.logger.logError(error as Error, {
        operation: 'fetchFilteredProducts',
        categoryCode,
        filter,
      });

      throw error;
    }
  }

  /**
   * Apply product filtering logic
   */
  private applyProductFilter(products: HealthKartProduct[], filter: ProductFilter): HealthKartProduct[] {
    return products.filter(product => {
      // Check minimum discount
      if (product.discount < filter.minDiscount) {
        return false;
      }

      // Check maximum price
      if (filter.maxPrice && product.offer_pr > filter.maxPrice) {
        return false;
      }

      // Check minimum rating
      if (filter.minRating && product.rating < filter.minRating) {
        return false;
      }

      // Check stock status
      if (filter.inStockOnly && product.oos) {
        return false;
      }

      // Check minimum reviews
      if (filter.minReviews && product.nrvw < filter.minReviews) {
        return false;
      }

      // Check preferred brands
      if (filter.brands && filter.brands.length > 0) {
        const brandMatches = filter.brands.some(brand => product.brName.toLowerCase()===(brand.toLowerCase()));
        if (!brandMatches) {
          return false;
        }
      }

      // Check categories
      if (filter.categories && filter.categories.length > 0) {
        const categoryMatches = filter.categories.some(category =>
          product.catName.toLowerCase().includes(category.toLowerCase())
        );
        if (!categoryMatches) {
          return false;
        }
      }

      // Check flavors (we'll need to extract from product groups for filtering)
      if (filter.flavors && filter.flavors.length > 0) {
        const flavorMatches = this.checkProductFlavor(product, filter.flavors);
        if (!flavorMatches) {
          return false;
        }
      }

      // Check weight buckets - COMMENTED OUT (not filtering by weight for now)
      // if (filter.weightBuckets && filter.weightBuckets.length > 0) {
      //   const weightMatches = this.checkProductWeight(product, filter.weightBuckets);
      //   if (!weightMatches) {
      //     return false;
      //   }
      // }

      return true;
    });
  }

  /**
   * Execute HTTP request with retry logic
   */
  private async executeWithRetry<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    options: ApiRequestOptions
  ): Promise<AxiosResponse<T>> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= options.retries + 1; attempt++) {
      try {
        const response = await requestFn();
        return response;
      } catch (error) {
        lastError = error;

        if (attempt === options.retries + 1) {
          break;
        }

        const shouldRetry = this.shouldRetry(error);
        if (!shouldRetry) {
          throw error;
        }

        const delay = this.calculateRetryDelay(attempt, options.retryDelay);
        
        this.logger.warn(`Request failed, retrying in ${delay}ms`, {
          attempt,
          maxRetries: options.retries,
          error: error instanceof Error ? error.message : String(error),
        });

        await this.delay(delay);
      }
    }

    throw new RetryExhaustedError(
      `Request failed after ${options.retries + 1} attempts`,
      options.retries + 1,
      lastError
    );
  }

  /**
   * Determine if an error should trigger a retry
   */
  private shouldRetry(error: unknown): boolean {
    if (axios.isAxiosError(error)) {
      // Retry on network errors
      if (!error.response) {
        return true;
      }

      // Retry on server errors (5xx) and rate limiting (429)
      const status = error.response.status;
      return status >= 500 || status === 429;
    }

    return false;
  }

  /**
   * Calculate delay for retry with exponential backoff
   */
  private calculateRetryDelay(attempt: number, baseDelay: number): number {
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
  }

  /**
   * Enforce rate limiting between requests
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.requestDelayMs) {
      const delay = this.requestDelayMs - timeSinceLastRequest;
      this.logger.debug('Rate limiting: waiting before next request', { delay });
      await this.delay(delay);
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Validate API response structure
   */
  private validateApiResponse(response: HealthKartApiResponse): void {
    if (!response.results) {
      throw new DataParsingError('Invalid API response: missing results', {
        expectedSchema: 'HealthKartApiResponse',
        invalidData: response,
      });
    }

    if (response.results.exception) {
      throw new HealthKartApiError('API returned exception status', {
        context: { apiResponse: response },
      });
    }

    if (!Array.isArray(response.results.variants)) {
      throw new DataParsingError('Invalid API response: variants is not an array', {
        expectedSchema: 'HealthKartProduct[]',
        invalidData: response.results.variants,
      });
    }
  }

  /**
   * Setup axios interceptors for logging and error handling
   */
  private setupInterceptors(): void {
    // Request interceptor for logging
    this.httpClient.interceptors.request.use(
      (config) => {
        this.logger.debug('Making API request', {
          url: config.url,
          method: config.method?.toUpperCase(),
          params: config.params,
        });
        return config;
      },
      (error) => {
        this.logger.logError(error, { interceptor: 'request' });
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (axios.isAxiosError(error)) {
          const apiError = new HealthKartApiError(
            error.message,
            {
              cause: error,
              statusCode: error.response?.status,
              endpoint: error.config?.url,
              context: {
                method: error.config?.method,
                params: error.config?.params,
                responseData: error.response?.data,
              },
            }
          );
          return Promise.reject(apiError);
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Check if product matches flavor preferences
   */
  private checkProductFlavor(product: HealthKartProduct, flavors: readonly string[]): boolean {
    for (const group of product.grps || []) {
      for (const attribute of group.values || []) {
        if (attribute.nm === 'gen-sn-flv' || attribute.nm === 'Flavor-base' || 
            attribute.dis_nm?.toLowerCase().includes('flavour')) {
          const flavorMatches = flavors.some(flavor =>
            attribute.val.toLowerCase().includes(flavor.toLowerCase())
          );
          if (flavorMatches) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Check if product matches weight bucket preferences - COMMENTED OUT (not filtering by weight for now)
   */
  // private checkProductWeight(product: HealthKartProduct, weightBuckets: string[]): boolean {
  //   for (const group of product.grps || []) {
  //     for (const attribute of group.values || []) {
  //       if (attribute.nm === 'gen-pro-siz' || attribute.nm === 'sn-drv-wt' || 
  //           attribute.dis_nm?.toLowerCase().includes('weight')) {
  //         const weightMatches = weightBuckets.some(weight =>
  //           attribute.val.toLowerCase().includes(weight.toLowerCase())
  //         );
  //         if (weightMatches) {
  //           return true;
  //         }
  //       }
  //     }
  //   }
  //   return false;
  // }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 
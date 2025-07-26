/**
 * API configuration for send-alert endpoint
 * Centralizes all configuration values with environment variable support
 * Follows Clean Architecture and TypeScript best practices
 */

/**
 * Interface for HealthKart API configuration
 */
export interface HealthKartApiConfig {
  readonly baseUrl: string;
  readonly requestDelayMs: number;
  readonly maxRetries: number;
  readonly defaultCategoryCode: string;
}

/**
 * Interface for product filtering configuration
 */
export interface ProductFilterConfig {
  readonly minDiscount: number;
  readonly inStockOnly: boolean;
  readonly minReviews: number;
  readonly minRating: number;
  readonly maxPrice: number;
  readonly brands: readonly string[];
  readonly categories: readonly string[];
}

/**
 * Interface for Telegram configuration
 */
export interface TelegramApiConfig {
  readonly botToken: string;
  readonly defaultChatId: string;
  readonly maxRetries: number;
  readonly retryDelay: number;
}

/**
 * Interface for API endpoint configuration
 */
export interface ApiEndpointConfig {
  readonly requestTimeoutMs: number;
  readonly maxProductsToProcess: number;
  readonly maxProductsInAlert: number;
  readonly enableDryRun: boolean;
}

/**
 * Complete API configuration interface
 */
export interface ApiConfiguration {
  readonly healthkart: HealthKartApiConfig;
  readonly productFilter: ProductFilterConfig;
  readonly telegram: TelegramApiConfig;
  readonly endpoint: ApiEndpointConfig;
}

/**
 * Default configuration values
 */
const DEFAULT_API_CONFIG: ApiConfiguration = {
  healthkart: {
    baseUrl: 'https://www.healthkart.com',
    requestDelayMs: 1000,
    maxRetries: 3,
    defaultCategoryCode: 'SCT-snt-pt-wp',
  },
  productFilter: {
    minDiscount: 10,
    inStockOnly: true,
    minReviews: 1,
    minRating: 3.5,
    maxPrice: 10000,
    brands: [
      'muscleblaze',
      'optimum nutrition',
      'dymatize',
      'gnc',
      'ON',
      'Fuel One',
      'bsn',
      'muscletech',
    ],
    categories: ['wheyProtein', 'Whey Proteins', 'Whey Protein'],
  },
  telegram: {
    botToken: '',
    defaultChatId: '',
    maxRetries: 3,
    retryDelay: 1000,
  },
  endpoint: {
    requestTimeoutMs: 30000, // 30 seconds
    maxProductsToProcess: 100,
    maxProductsInAlert: 5,
    enableDryRun: false,
  },
} as const;

/**
 * Validates environment variables and returns API configuration
 * 
 * @returns Validated API configuration
 * @throws {Error} When required environment variables are missing or invalid
 */
export function getApiConfiguration(): ApiConfiguration {
  try {
    const config: ApiConfiguration = {
      healthkart: {
        baseUrl: getEnvVar('HEALTHKART_BASE_URL', DEFAULT_API_CONFIG.healthkart.baseUrl),
        requestDelayMs: getEnvNumber('HEALTHKART_REQUEST_DELAY_MS', DEFAULT_API_CONFIG.healthkart.requestDelayMs),
        maxRetries: getEnvNumber('HEALTHKART_MAX_RETRIES', DEFAULT_API_CONFIG.healthkart.maxRetries),
        defaultCategoryCode: getEnvVar('HEALTHKART_DEFAULT_CATEGORY', DEFAULT_API_CONFIG.healthkart.defaultCategoryCode),
      },
      productFilter: {
        minDiscount: getEnvNumber('PRODUCT_MIN_DISCOUNT', DEFAULT_API_CONFIG.productFilter.minDiscount),
        inStockOnly: getEnvBoolean('PRODUCT_IN_STOCK_ONLY', DEFAULT_API_CONFIG.productFilter.inStockOnly),
        minReviews: getEnvNumber('PRODUCT_MIN_REVIEWS', DEFAULT_API_CONFIG.productFilter.minReviews),
        minRating: getEnvNumber('PRODUCT_MIN_RATING', DEFAULT_API_CONFIG.productFilter.minRating),
        maxPrice: getEnvNumber('PRODUCT_MAX_PRICE', DEFAULT_API_CONFIG.productFilter.maxPrice),
        brands: getEnvArray('PRODUCT_BRANDS', DEFAULT_API_CONFIG.productFilter.brands),
        categories: getEnvArray('PRODUCT_CATEGORIES', DEFAULT_API_CONFIG.productFilter.categories),
      },
      telegram: {
        botToken: requireEnvVar('TELEGRAM_BOT_TOKEN'),
        defaultChatId: requireEnvVar('TELEGRAM_CHAT_ID'),
        maxRetries: getEnvNumber('TELEGRAM_MAX_RETRIES', DEFAULT_API_CONFIG.telegram.maxRetries),
        retryDelay: getEnvNumber('TELEGRAM_RETRY_DELAY', DEFAULT_API_CONFIG.telegram.retryDelay),
      },
      endpoint: {
        requestTimeoutMs: getEnvNumber('API_REQUEST_TIMEOUT_MS', DEFAULT_API_CONFIG.endpoint.requestTimeoutMs),
        maxProductsToProcess: getEnvNumber('API_MAX_PRODUCTS_PROCESS', DEFAULT_API_CONFIG.endpoint.maxProductsToProcess),
        maxProductsInAlert: getEnvNumber('API_MAX_PRODUCTS_ALERT', DEFAULT_API_CONFIG.endpoint.maxProductsInAlert),
        enableDryRun: getEnvBoolean('API_ENABLE_DRY_RUN', DEFAULT_API_CONFIG.endpoint.enableDryRun),
      },
    };

    // Validate configuration
    validateApiConfiguration(config);
    
    return config;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`API configuration validation failed: ${errorMessage}`);
  }
}

/**
 * Validates the complete API configuration
 * 
 * @param config - Configuration to validate
 * @throws {Error} When configuration is invalid
 */
function validateApiConfiguration(config: ApiConfiguration): void {
  // Validate HealthKart config
  if (!config.healthkart.baseUrl || !isValidUrl(config.healthkart.baseUrl)) {
    throw new Error('Invalid HealthKart base URL');
  }

  if (config.healthkart.requestDelayMs < 0) {
    throw new Error('HealthKart request delay must be non-negative');
  }

  if (config.healthkart.maxRetries < 1) {
    throw new Error('HealthKart max retries must be at least 1');
  }

  // Validate product filter config
  if (config.productFilter.minDiscount < 0 || config.productFilter.minDiscount > 100) {
    throw new Error('Product min discount must be between 0 and 100');
  }

  if (config.productFilter.minRating < 1 || config.productFilter.minRating > 5) {
    throw new Error('Product min rating must be between 1 and 5');
  }

  if (config.productFilter.maxPrice <= 0) {
    throw new Error('Product max price must be positive');
  }

  if (config.productFilter.brands.length === 0) {
    throw new Error('At least one brand must be specified');
  }

  // Validate Telegram config
  if (!config.telegram.botToken || !isValidTelegramBotToken(config.telegram.botToken)) {
    throw new Error('Invalid Telegram bot token format');
  }

  if (!config.telegram.defaultChatId) {
    throw new Error('Telegram chat ID is required');
  }

  // Validate endpoint config
  if (config.endpoint.requestTimeoutMs < 1000) {
    throw new Error('Request timeout must be at least 1000ms');
  }

  if (config.endpoint.maxProductsToProcess < 1) {
    throw new Error('Max products to process must be at least 1');
  }

  if (config.endpoint.maxProductsInAlert < 1) {
    throw new Error('Max products in alert must be at least 1');
  }
}

/**
 * Gets a required environment variable
 * 
 * @param key - Environment variable key
 * @returns Environment variable value
 * @throws {Error} When environment variable is missing
 */
function requireEnvVar(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value.trim();
}

/**
 * Gets an optional environment variable with default value
 * 
 * @param key - Environment variable key
 * @param defaultValue - Default value if not set
 * @returns Environment variable value or default
 */
function getEnvVar(key: string, defaultValue: string): string {
  const value = process.env[key];
  return value && value.trim() !== '' ? value.trim() : defaultValue;
}

/**
 * Gets a numeric environment variable with validation
 * 
 * @param key - Environment variable key
 * @param defaultValue - Default value if not set
 * @returns Parsed number value
 * @throws {Error} When value is not a valid number
 */
function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    return defaultValue;
  }

  const parsed = parseFloat(value);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid number, got: ${value}`);
  }

  return parsed;
}

/**
 * Gets a boolean environment variable with validation
 * 
 * @param key - Environment variable key
 * @param defaultValue - Default value if not set
 * @returns Boolean value
 */
function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    return defaultValue;
  }

  const lowerValue = value.toLowerCase().trim();
  if (['true', '1', 'yes', 'on'].includes(lowerValue)) {
    return true;
  }
  if (['false', '0', 'no', 'off'].includes(lowerValue)) {
    return false;
  }

  throw new Error(`Environment variable ${key} must be a boolean value, got: ${value}`);
}

/**
 * Gets an array environment variable from comma-separated string
 * 
 * @param key - Environment variable key
 * @param defaultValue - Default array if not set
 * @returns Array of trimmed string values
 */
function getEnvArray(key: string, defaultValue: readonly string[]): readonly string[] {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    return defaultValue;
  }

  return value
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0);
}

/**
 * Validates if a string is a valid URL
 * 
 * @param url - URL string to validate
 * @returns True if valid URL
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates Telegram bot token format
 * 
 * @param token - Bot token to validate
 * @returns True if valid format
 */
function isValidTelegramBotToken(token: string): boolean {
  // Telegram bot token format: number:alphanumeric_string
  return /^\d+:[A-Za-z0-9_-]+$/.test(token);
}

/**
 * Type guard to check if object is valid API configuration
 * 
 * @param obj - Object to check
 * @returns True if valid API configuration
 */
export function isApiConfiguration(obj: unknown): obj is ApiConfiguration {
  try {
    if (!obj || typeof obj !== 'object') {
      return false;
    }

    const config = obj as Record<string, unknown>;
    
    return (
      typeof config.healthkart === 'object' &&
      typeof config.productFilter === 'object' &&
      typeof config.telegram === 'object' &&
      typeof config.endpoint === 'object'
    );
  } catch {
    return false;
  }
} 
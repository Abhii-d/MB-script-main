/**
 * Custom error classes for the MB Script project
 * Following the guideline: Use custom error classes with meaningful messages and context
 */

export abstract class BaseError extends Error {
  public readonly timestamp: Date;
  public readonly context: Record<string, unknown>;

  constructor(
    message: string,
    options: {
      cause?: unknown;
      context?: Record<string, unknown>;
    } = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    this.context = options.context || {};
    
    if (options.cause) {
      this.cause = options.cause;
    }

    // Ensure proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      stack: this.stack,
    };
  }
}

/**
 * Error thrown when HealthKart API requests fail
 */
export class HealthKartApiError extends BaseError {
  public readonly statusCode?: number;
  public readonly endpoint?: string;

  constructor(
    message: string,
    options: {
      cause?: unknown;
      context?: Record<string, unknown>;
      statusCode?: number;
      endpoint?: string;
    } = {}
  ) {
    super(message, options);
    this.statusCode = options.statusCode;
    this.endpoint = options.endpoint;
  }
}

/**
 * Error thrown when data parsing or validation fails
 */
export class DataParsingError extends BaseError {
  public readonly invalidData?: unknown;
  public readonly expectedSchema?: string;

  constructor(
    message: string,
    options: {
      cause?: unknown;
      context?: Record<string, unknown>;
      invalidData?: unknown;
      expectedSchema?: string;
    } = {}
  ) {
    super(message, options);
    this.invalidData = options.invalidData;
    this.expectedSchema = options.expectedSchema;
  }
}

/**
 * Error thrown when configuration is invalid or missing
 */
export class ConfigurationError extends BaseError {
  public readonly configKey?: string;
  public readonly expectedType?: string;

  constructor(
    message: string,
    options: {
      cause?: unknown;
      context?: Record<string, unknown>;
      configKey?: string;
      expectedType?: string;
    } = {}
  ) {
    super(message, options);
    this.configKey = options.configKey;
    this.expectedType = options.expectedType;
  }
}

/**
 * Error thrown when Telegram API operations fail
 */
export class TelegramApiError extends BaseError {
  public readonly botToken?: string;
  public readonly chatId?: string;
  public readonly apiResponse?: unknown;

  constructor(
    message: string,
    options: {
      cause?: unknown;
      context?: Record<string, unknown>;
      botToken?: string;
      chatId?: string;
      apiResponse?: unknown;
    } = {}
  ) {
    super(message, options);
    this.botToken = options.botToken ? '***masked***' : undefined;
    this.chatId = options.chatId;
    this.apiResponse = options.apiResponse;
  }
}

/**
 * Error thrown when monitoring operations fail
 */
export class MonitoringError extends BaseError {
  public readonly operation?: string;
  public readonly productCount?: number;

  constructor(
    message: string,
    options: {
      cause?: unknown;
      context?: Record<string, unknown>;
      operation?: string;
      productCount?: number;
    } = {}
  ) {
    super(message, options);
    this.operation = options.operation;
    this.productCount = options.productCount;
  }
}

/**
 * Error thrown when retry attempts are exhausted
 */
export class RetryExhaustedError extends BaseError {
  public readonly attempts: number;
  public readonly lastError: unknown;

  constructor(
    message: string,
    attempts: number,
    lastError: unknown,
    options: {
      context?: Record<string, unknown>;
    } = {}
  ) {
    super(message, options);
    this.attempts = attempts;
    this.lastError = lastError;
  }
}

/**
 * Error thrown when API configuration is invalid
 */
export class ApiConfigurationError extends Error {
  public readonly code = 'API_CONFIG_ERROR';
  
  constructor(message: string, public readonly details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiConfigurationError';
    
    // Maintain proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiConfigurationError);
    }
  }
}

/**
 * Error thrown when API endpoint times out
 */
export class ApiTimeoutError extends Error {
  public readonly code = 'API_TIMEOUT_ERROR';
  
  constructor(message: string, public readonly timeoutMs: number) {
    super(message);
    this.name = 'ApiTimeoutError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiTimeoutError);
    }
  }
}

/**
 * Error thrown when product fetching fails
 */
export class ProductFetchError extends Error {
  public readonly code = 'PRODUCT_FETCH_ERROR';
  
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ProductFetchError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ProductFetchError);
    }
  }
}

/**
 * Error thrown when Telegram service fails
 */
export class TelegramServiceError extends Error {
  public readonly code = 'TELEGRAM_SERVICE_ERROR';
  
  constructor(
    message: string,
    public readonly chatId?: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'TelegramServiceError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TelegramServiceError);
    }
  }
}

/**
 * Error thrown when product processing fails
 */
export class ProductProcessingError extends Error {
  public readonly code = 'PRODUCT_PROCESSING_ERROR';
  
  constructor(
    message: string,
    public readonly productCount?: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ProductProcessingError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ProductProcessingError);
    }
  }
}

/**
 * Error thrown when API rate limit is exceeded
 */
export class RateLimitError extends Error {
  public readonly code = 'RATE_LIMIT_ERROR';
  
  constructor(
    message: string,
    public readonly retryAfter?: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'RateLimitError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RateLimitError);
    }
  }
}

/**
 * Type guard to check if an error is one of our custom errors
 */
export function isCustomError(error: unknown): error is BaseError {
  return error instanceof BaseError;
}

/**
 * Utility function to safely extract error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}

/**
 * Utility function to safely extract error context
 */
export function getErrorContext(error: unknown): Record<string, unknown> {
  if (isCustomError(error)) {
    return error.context;
  }
  return {};
}

/**
 * Type guard to check if error is an API configuration error
 */
export function isApiConfigurationError(error: unknown): error is ApiConfigurationError {
  return error instanceof ApiConfigurationError;
}

/**
 * Type guard to check if error is an API timeout error
 */
export function isApiTimeoutError(error: unknown): error is ApiTimeoutError {
  return error instanceof ApiTimeoutError;
}

/**
 * Type guard to check if error is a product fetch error
 */
export function isProductFetchError(error: unknown): error is ProductFetchError {
  return error instanceof ProductFetchError;
}

/**
 * Type guard to check if error is a Telegram service error
 */
export function isTelegramServiceError(error: unknown): error is TelegramServiceError {
  return error instanceof TelegramServiceError;
}

/**
 * Type guard to check if error is a product processing error
 */
export function isProductProcessingError(error: unknown): error is ProductProcessingError {
  return error instanceof ProductProcessingError;
}

/**
 * Type guard to check if error is a rate limit error
 */
export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
} 
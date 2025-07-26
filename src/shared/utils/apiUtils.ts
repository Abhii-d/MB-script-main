/**
 * Utility functions for API endpoint operations
 * Centralizes common API functionality with proper error handling
 * Follows Clean Architecture and TypeScript best practices
 */

import { Logger } from './logger.js';
import { 
  ApiTimeoutError, 
  ProductFetchError, 
  TelegramServiceError,
  ProductProcessingError,
  RateLimitError,
} from '../errors/index.js';

/**
 * Interface for retry configuration
 */
export interface RetryConfig {
  readonly maxRetries: number;
  readonly delayMs: number;
  readonly backoffMultiplier: number;
}

/**
 * Interface for timeout configuration
 */
export interface TimeoutConfig {
  readonly timeoutMs: number;
}

/**
 * Interface for API response with status tracking
 */
export interface ApiResponse<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly statusCode?: number;
  readonly retryCount?: number;
  readonly executionTimeMs?: number;
}

/**
 * Creates a promise that rejects after a specified timeout
 * 
 * @param timeoutMs - Timeout in milliseconds
 * @returns Promise that rejects with ApiTimeoutError
 */
export function createTimeoutPromise(timeoutMs: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new ApiTimeoutError(`Operation timed out after ${timeoutMs}ms`, timeoutMs));
    }, timeoutMs);
  });
}

/**
 * Wraps a promise with timeout functionality
 * 
 * @param promise - Promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @returns Promise that resolves with original result or rejects with timeout error
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    promise,
    createTimeoutPromise(timeoutMs),
  ]);
}

/**
 * Executes a function with retry logic and exponential backoff
 * 
 * @param fn - Function to execute
 * @param config - Retry configuration
 * @param logger - Logger instance
 * @returns Promise with result or throws error after max retries
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig,
  logger: Logger
): Promise<T> {
  const { maxRetries, delayMs, backoffMultiplier } = config;
  let lastError: Error | undefined;
  let currentDelay = delayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      
      if (attempt > 0) {
        logger.info('Operation succeeded after retry', {
          attempt,
          totalAttempts: attempt + 1,
          maxRetries,
        });
      }
      
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on certain error types
      if (isNonRetryableError(error)) {
        logger.error('Non-retryable error encountered', {
          error: lastError.message,
          errorType: lastError.name,
          attempt,
        });
        throw lastError;
      }

      if (attempt === maxRetries) {
        logger.error('Max retries exceeded', {
          error: lastError.message,
          errorType: lastError.name,
          totalAttempts: attempt + 1,
          maxRetries,
        });
        break;
      }

      logger.warn('Operation failed, retrying', {
        error: lastError.message,
        errorType: lastError.name,
        attempt,
        nextRetryDelayMs: currentDelay,
        remainingRetries: maxRetries - attempt,
      });

      // Wait before retry
      await sleep(currentDelay);
      currentDelay *= backoffMultiplier;
    }
  }

  throw lastError || new Error('Unknown error during retry operation');
}

/**
 * Checks if an error should not be retried
 * 
 * @param error - Error to check
 * @returns True if error should not be retried
 */
function isNonRetryableError(error: unknown): boolean {
  if (error instanceof ApiTimeoutError) {
    return false; // Timeout errors can be retried
  }
  
  if (error instanceof ProductFetchError) {
    // Don't retry on client errors (4xx)
    return error.statusCode ? error.statusCode >= 400 && error.statusCode < 500 : false;
  }
  
  if (error instanceof TelegramServiceError) {
    return false; // Telegram errors can be retried
  }
  
  if (error instanceof RateLimitError) {
    return false; // Rate limit errors can be retried
  }
  
  return false; // Default to retryable
}

/**
 * Creates a sleep promise for the specified duration
 * 
 * @param ms - Duration in milliseconds
 * @returns Promise that resolves after the delay
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Measures execution time of a function
 * 
 * @param fn - Function to measure
 * @returns Promise with result and execution time
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; executionTimeMs: number }> {
  const startTime = Date.now();
  
  try {
    const result = await fn();
    const executionTimeMs = Date.now() - startTime;
    
    return { result, executionTimeMs };
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;
    
    // Add execution time to error if it's one of our custom errors
    if (error instanceof ProductFetchError || 
        error instanceof TelegramServiceError || 
        error instanceof ProductProcessingError) {
      (error as any).executionTimeMs = executionTimeMs;
    }
    
    throw error;
  }
}

/**
 * Creates a standardized API response object
 * 
 * @param success - Whether the operation was successful
 * @param data - Response data (if successful)
 * @param error - Error message (if failed)
 * @param statusCode - HTTP status code
 * @param retryCount - Number of retries attempted
 * @param executionTimeMs - Execution time in milliseconds
 * @returns Standardized API response
 */
export function createApiResponse<T>(
  success: boolean,
  data?: T,
  error?: string,
  statusCode?: number,
  retryCount?: number,
  executionTimeMs?: number
): ApiResponse<T> {
  return {
    success,
    data,
    error,
    statusCode,
    retryCount,
    executionTimeMs,
  };
}

/**
 * Validates that an object has the required properties
 * 
 * @param obj - Object to validate
 * @param requiredProps - Array of required property names
 * @param objectName - Name of the object for error messages
 * @throws {Error} When required properties are missing
 */
export function validateRequiredProperties(
  obj: Record<string, unknown>,
  requiredProps: string[],
  objectName: string
): void {
  const missingProps = requiredProps.filter(prop => 
    obj[prop] === undefined || obj[prop] === null
  );

  if (missingProps.length > 0) {
    throw new Error(
      `${objectName} is missing required properties: ${missingProps.join(', ')}`
    );
  }
}

/**
 * Sanitizes error message for safe logging and API responses
 * 
 * @param error - Error to sanitize
 * @returns Sanitized error message
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Remove potentially sensitive information
    return error.message
      .replace(/token[=:]\s*[^\s]+/gi, 'token=***')
      .replace(/password[=:]\s*[^\s]+/gi, 'password=***')
      .replace(/key[=:]\s*[^\s]+/gi, 'key=***')
      .replace(/secret[=:]\s*[^\s]+/gi, 'secret=***');
  }
  
  return String(error);
}

/**
 * Creates a safe error object for API responses
 * 
 * @param error - Original error
 * @param includeStack - Whether to include stack trace (only in development)
 * @returns Safe error object
 */
export function createSafeErrorObject(
  error: unknown,
  includeStack: boolean = false
): Record<string, unknown> {
  const safeError: Record<string, unknown> = {
    message: sanitizeErrorMessage(error),
    type: error instanceof Error ? error.name : 'UnknownError',
    timestamp: new Date().toISOString(),
  };

  if (includeStack && error instanceof Error && error.stack) {
    safeError.stack = error.stack;
  }

  // Add specific error properties for our custom errors
  if (error instanceof ApiTimeoutError) {
    safeError.timeoutMs = error.timeoutMs;
  } else if (error instanceof ProductFetchError) {
    safeError.statusCode = error.statusCode;
  } else if (error instanceof TelegramServiceError) {
    safeError.chatId = error.chatId;
  } else if (error instanceof RateLimitError) {
    safeError.retryAfter = error.retryAfter;
  }

  return safeError;
}

/**
 * Type guard to check if an object is a valid API response
 * 
 * @param obj - Object to check
 * @returns True if valid API response
 */
export function isApiResponse<T>(obj: unknown): obj is ApiResponse<T> {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const response = obj as Record<string, unknown>;
  
  return (
    typeof response.success === 'boolean' &&
    (response.data === undefined || response.data !== null) &&
    (response.error === undefined || typeof response.error === 'string') &&
    (response.statusCode === undefined || typeof response.statusCode === 'number') &&
    (response.retryCount === undefined || typeof response.retryCount === 'number') &&
    (response.executionTimeMs === undefined || typeof response.executionTimeMs === 'number')
  );
} 
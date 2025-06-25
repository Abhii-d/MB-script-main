/**
 * Structured logging utility using Winston
 * Following the guideline: Use structured logging with context
 */

import winston from 'winston';
import { LogLevel, LogContext } from '../types/index.js';

interface LoggerConfig {
  level: LogLevel;
  filePath?: string;
  enableConsole: boolean;
}

class Logger {
  private winston: winston.Logger;

  constructor(config: LoggerConfig) {
    const formats = [
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS',
      }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ];

    const transports: winston.transport[] = [];

    // Console transport for development
    if (config.enableConsole) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
              return `${timestamp} [${level}]: ${message} ${metaStr}`;
            })
          ),
        })
      );
    }

    // File transport for production
    if (config.filePath) {
      transports.push(
        new winston.transports.File({
          filename: config.filePath,
          format: winston.format.combine(...formats),
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
          tailable: true,
        })
      );
    }

    this.winston = winston.createLogger({
      level: config.level,
      format: winston.format.combine(...formats),
      transports,
      exitOnError: false,
    });
  }

  /**
   * Log an error message with context
   */
  public error(message: string, context?: LogContext): void {
    this.winston.error(message, this.sanitizeContext(context));
  }

  /**
   * Log a warning message with context
   */
  public warn(message: string, context?: LogContext): void {
    this.winston.warn(message, this.sanitizeContext(context));
  }

  /**
   * Log an info message with context
   */
  public info(message: string, context?: LogContext): void {
    this.winston.info(message, this.sanitizeContext(context));
  }

  /**
   * Log a debug message with context
   */
  public debug(message: string, context?: LogContext): void {
    this.winston.debug(message, this.sanitizeContext(context));
  }

  /**
   * Log API request details
   */
  public logApiRequest(endpoint: string, method: string, statusCode?: number, duration?: number): void {
    this.info('API request completed', {
      endpoint,
      method,
      statusCode,
      duration: duration ? `${duration}ms` : undefined,
      category: 'api_request',
    });
  }

  /**
   * Log product monitoring results
   */
  public logMonitoringResult(
    totalProducts: number,
    matchingProducts: number,
    alertsTriggered: number,
    duration: number
  ): void {
    this.info('Monitoring cycle completed', {
      totalProducts,
      matchingProducts,
      alertsTriggered,
      duration: `${duration}ms`,
      category: 'monitoring',
    });
  }

  /**
   * Log price change detection
   */
  public logPriceChange(
    productId: string,
    productName: string,
    oldPrice: number,
    newPrice: number,
    discountPercentage: number
  ): void {
    const priceChange = ((newPrice - oldPrice) / oldPrice) * 100;
    
    this.info('Price change detected', {
      productId,
      productName,
      oldPrice,
      newPrice,
      priceChange: `${priceChange.toFixed(2)}%`,
      discountPercentage: `${discountPercentage}%`,
      category: 'price_change',
    });
  }

  /**
   * Log error with full context including stack trace
   */
  public logError(error: Error, context?: LogContext): void {
    this.error(error.message, {
      ...this.sanitizeContext(context),
      errorName: error.name,
      errorStack: error.stack,
      category: 'error',
    });
  }

  /**
   * Log performance metrics
   */
  public logPerformance(operation: string, duration: number, success: boolean, context?: LogContext): void {
    this.info(`Performance: ${operation}`, {
      operation,
      duration: `${duration}ms`,
      success,
      ...this.sanitizeContext(context),
      category: 'performance',
    });
  }

  /**
   * Create a child logger with persistent context
   */
  public createChild(persistentContext: LogContext): Logger {
    const childLogger = Object.create(this);
    childLogger.winston = this.winston.child(this.sanitizeContext(persistentContext));
    return childLogger;
  }

  /**
   * Sanitize context to remove sensitive information
   */
  private sanitizeContext(context?: LogContext): LogContext {
    if (!context) return {};

    const sanitized = { ...context };

    // Remove or mask sensitive fields
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorization'];
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***masked***';
      }
    }

    // Convert undefined values to null for JSON serialization
    Object.keys(sanitized).forEach(key => {
      if (sanitized[key] === undefined) {
        sanitized[key] = null;
      }
    });

    return sanitized;
  }
}

// Default logger instance
let defaultLogger: Logger;

/**
 * Initialize the default logger with configuration
 */
export function initializeLogger(config: LoggerConfig): void {
  defaultLogger = new Logger(config);
}

/**
 * Get the default logger instance
 */
export function getLogger(): Logger {
  if (!defaultLogger) {
    // Fallback configuration for development
    defaultLogger = new Logger({
      level: 'info',
      enableConsole: true,
    });
  }
  return defaultLogger;
}

/**
 * Create a new logger instance with custom configuration
 */
export function createLogger(config: LoggerConfig): Logger {
  return new Logger(config);
}

export { Logger }; 
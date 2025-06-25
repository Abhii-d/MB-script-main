/**
 * Configuration management with environment variable validation
 * Following the guideline: Validate environment variables at startup
 */

import { config } from 'dotenv';
import { AppConfig, LogLevel } from '../types/index.js';
import { ConfigurationError } from '../errors/index.js';

// Load environment variables
config();

/**
 * Validates that a required environment variable exists
 */
function requireEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  
  if (!value) {
    throw new ConfigurationError(`Required environment variable ${key} is not set`, {
      configKey: key,
      expectedType: 'string',
    });
  }
  
  return value;
}

/**
 * Gets an optional environment variable with a default value
 */
function getEnvVar(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Gets a numeric environment variable with validation
 */
function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  
  if (!value) {
    return defaultValue;
  }
  
  const parsed = parseInt(value, 10);
  
  if (isNaN(parsed)) {
    throw new ConfigurationError(`Environment variable ${key} must be a valid number`, {
      configKey: key,
      expectedType: 'number',
      context: { providedValue: value },
    });
  }
  
  return parsed;
}



/**
 * Validates log level
 */
function getValidLogLevel(key: string, defaultValue: LogLevel): LogLevel {
  const value = getEnvVar(key, defaultValue) as LogLevel;
  const validLevels: LogLevel[] = ['error', 'warn', 'info', 'debug'];
  
  if (!validLevels.includes(value)) {
    throw new ConfigurationError(`Invalid log level: ${value}. Must be one of: ${validLevels.join(', ')}`, {
      configKey: key,
      expectedType: 'LogLevel',
      context: { validValues: validLevels, providedValue: value },
    });
  }
  
  return value;
}

/**
 * Parses comma-separated string into array
 */
function getEnvArray(key: string, defaultValue: string[] = []): string[] {
  const value = process.env[key];
  
  if (!value || value.trim() === '') {
    return defaultValue;
  }
  
  return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
}

/**
 * Loads and validates application configuration
 */
function loadConfiguration(): AppConfig {
  try {
    const config: AppConfig = {
      healthkart: {
        baseUrl: getEnvVar('HEALTHKART_BASE_URL', 'https://www.healthkart.com'),
        categoryCodes: {
          wheyProtein: getEnvVar('HEALTHKART_WHEY_PROTEIN_CODE', 'SCT-snt-pt-wp'),
          massGainer: getEnvVar('HEALTHKART_MASS_GAINER_CODE', 'SCT-snt-pt-mg'),
          creatine: getEnvVar('HEALTHKART_CREATINE_CODE', 'SCT-snt-pt-cr'),
          preworkout: getEnvVar('HEALTHKART_PREWORKOUT_CODE', 'SCT-snt-pt-pw'),
        },
        requestDelayMs: getEnvNumber('HEALTHKART_REQUEST_DELAY_MS', 1000),
        maxRetries: getEnvNumber('HEALTHKART_MAX_RETRIES', 3),
      },
      telegram: {
        botToken: requireEnvVar('TELEGRAM_BOT_TOKEN'),
        chatId: requireEnvVar('TELEGRAM_CHAT_ID'),
      },
      monitoring: {
        intervalMinutes: getEnvNumber('MONITORING_INTERVAL_MINUTES', 15),
        alertConfig: {
          discountThreshold: getEnvNumber('ALERT_DISCOUNT_THRESHOLD', 40),
          priceDropThreshold: getEnvNumber('ALERT_PRICE_DROP_THRESHOLD', 5),
          brands: getEnvArray('ALERT_PREFERRED_BRANDS', ['muscleblaze', 'optimum nutrition', 'dymatize', 'gnc']),
          categories: getEnvArray('ALERT_CATEGORIES', ['wheyProtein']),
          maxPrice: getEnvNumber('ALERT_MAX_PRICE', 10000),
          minRating: getEnvNumber('ALERT_MIN_RATING', 3.5),
        },
      },
      logging: {
        level: getValidLogLevel('LOG_LEVEL', 'info'),
        filePath: getEnvVar('LOG_FILE_PATH', './logs/mb-script.log'),
      },
    };

    // Validate configuration
    validateConfiguration(config);
    
    return config;
  } catch (error) {
    if (error instanceof ConfigurationError) {
      throw error;
    }
    
    throw new ConfigurationError('Failed to load configuration', {
      cause: error,
    });
  }
}

/**
 * Performs additional validation on the loaded configuration
 */
function validateConfiguration(config: AppConfig): void {
  // Validate Telegram bot token format (should start with a number followed by colon)
  if (!/^\d+:/.test(config.telegram.botToken)) {
    throw new ConfigurationError('Invalid Telegram bot token format', {
      configKey: 'TELEGRAM_BOT_TOKEN',
      context: { expectedFormat: 'number:string' },
    });
  }

  // Validate monitoring interval (should be at least 1 minute)
  if (config.monitoring.intervalMinutes < 1) {
    throw new ConfigurationError('Monitoring interval must be at least 1 minute', {
      configKey: 'MONITORING_INTERVAL_MINUTES',
      context: { minimumValue: 1, providedValue: config.monitoring.intervalMinutes },
    });
  }

  // Validate discount threshold (should be between 1 and 100)
  const discountThreshold = config.monitoring.alertConfig.discountThreshold;
  if (discountThreshold < 1 || discountThreshold > 100) {
    throw new ConfigurationError('Discount threshold must be between 1 and 100', {
      configKey: 'ALERT_DISCOUNT_THRESHOLD',
      context: { validRange: '1-100', providedValue: discountThreshold },
    });
  }

  // Validate rating threshold (should be between 1 and 5)
  const minRating = config.monitoring.alertConfig.minRating;
  if (minRating < 1 || minRating > 5) {
    throw new ConfigurationError('Minimum rating must be between 1 and 5', {
      configKey: 'ALERT_MIN_RATING',
      context: { validRange: '1-5', providedValue: minRating },
    });
  }
}

// Load configuration on module initialization
let appConfig: AppConfig;

try {
  appConfig = loadConfiguration();
} catch (error) {
  // Re-throw with additional context
  if (error instanceof ConfigurationError) {
    throw error;
  }
  
  throw new ConfigurationError('Critical configuration error during application startup', {
    cause: error,
  });
}

/**
 * Get the application configuration
 */
export function getConfig(): AppConfig {
  return appConfig;
}

/**
 * Get configuration for a specific section
 */
export function getHealthKartConfig() {
  return appConfig.healthkart;
}

export function getTelegramConfig() {
  return appConfig.telegram;
}

export function getMonitoringConfig() {
  return appConfig.monitoring;
}

export function getLoggingConfig() {
  return appConfig.logging;
}

/**
 * Utility to check if we're in development mode
 */
export function isDevelopment(): boolean {
  return getEnvVar('NODE_ENV', 'development') === 'development';
}

/**
 * Utility to check if we're in production mode
 */
export function isProduction(): boolean {
  return getEnvVar('NODE_ENV', 'development') === 'production';
}

export { AppConfig }; 
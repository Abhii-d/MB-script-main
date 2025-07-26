/**
 * Configuration management with environment variable validation
 * Centralizes configuration exports for clean imports
 */

// API configuration exports
export {
  getApiConfiguration,
  isApiConfiguration,
} from './apiConfig.js';
export type {
  ApiConfiguration,
  HealthKartApiConfig,
  ProductFilterConfig,
  TelegramApiConfig,
  ApiEndpointConfig,
} from './apiConfig.js'; 
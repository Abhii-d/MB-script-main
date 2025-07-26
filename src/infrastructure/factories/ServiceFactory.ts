/**
 * Service Factory
 * Handles dependency injection and service initialization
 * Follows Clean Architecture and dependency inversion principles
 */

import { HealthKartApiClient } from '../external/HealthKartApiClient.js';
import { HealthKartTransformService } from '../external/HealthKartTransformService.js';
import { TelegramService } from '../external/TelegramService.js';
import { SendAlertUseCase, SendAlertUseCaseDependencies } from '../../application/use-cases/SendAlertUseCase.js';
import { getLogger } from '../../shared/utils/logger.js';
import { getApiConfiguration, ApiConfiguration } from '../../shared/config/apiConfig.js';
import { ApiConfigurationError } from '../../shared/errors/index.js';
import { withRetry, withTimeout } from '../../shared/utils/apiUtils.js';
import { ProductFilter } from '../../shared/types/index.js';
import { TelegramMessage } from '../external/TelegramService.js';

/**
 * Interface for service factory dependencies
 */
export interface ServiceFactoryDependencies {
  readonly config: ApiConfiguration;
  readonly logger: ReturnType<typeof getLogger>;
}

/**
 * Service factory for creating and wiring dependencies
 */
export class ServiceFactory {
  private readonly config: ApiConfiguration;
  private readonly logger: ReturnType<typeof getLogger>;

  constructor(dependencies?: Partial<ServiceFactoryDependencies>) {
    try {
      this.config = dependencies?.config || getApiConfiguration();
      this.logger = dependencies?.logger || getLogger();
    } catch (error) {
      throw new ApiConfigurationError(
        'Failed to initialize service factory',
        { cause: error }
      );
    }
  }

  /**
   * Creates HealthKart API client with retry and timeout capabilities
   */
  createHealthKartClient(): HealthKartApiClient {
    const client = new HealthKartApiClient(
      this.config.healthkart.baseUrl,
      this.config.healthkart.requestDelayMs,
      this.config.healthkart.maxRetries
    );

    // Wrap client methods with retry and timeout
    return this.wrapHealthKartClient(client);
  }

  /**
   * Creates HealthKart transform service
   */
  createTransformService(): HealthKartTransformService {
    return new HealthKartTransformService();
  }

  /**
   * Creates Telegram service with retry capabilities
   */
  createTelegramService(): TelegramService {
    const service = new TelegramService({
      botToken: this.config.telegram.botToken,
      defaultChatId: this.config.telegram.defaultChatId,
      maxRetries: this.config.telegram.maxRetries,
      retryDelay: this.config.telegram.retryDelay
    });

    return this.wrapTelegramService(service);
  }

  /**
   * Creates send alert use case with all dependencies
   */
  createSendAlertUseCase(): SendAlertUseCase {
    const dependencies: SendAlertUseCaseDependencies = {
      healthKartClient: this.createHealthKartClient(),
      transformService: this.createTransformService(),
      telegramService: this.createTelegramService(),
      logger: this.logger.createChild({ service: 'SendAlertUseCase' }),
      config: this.config
    };

    return new SendAlertUseCase(dependencies);
  }

  /**
   * Wraps HealthKart client with retry and timeout logic
   */
  private wrapHealthKartClient(client: HealthKartApiClient): HealthKartApiClient {
    const originalFetch = client.fetchFilteredProducts.bind(client);
    
    client.fetchFilteredProducts = async (categoryCode: string, filters: ProductFilter) => {
      return withRetry(
        async () => withTimeout(
          originalFetch(categoryCode, filters),
          this.config.endpoint.requestTimeoutMs
        ),
        {
          maxRetries: this.config.healthkart.maxRetries,
          delayMs: this.config.healthkart.requestDelayMs,
          backoffMultiplier: 2
        },
        this.logger
      );
    };

    return client;
  }

  /**
   * Wraps Telegram service with retry logic
   */
  private wrapTelegramService(service: TelegramService): TelegramService {
    const originalSendMessage = service.sendMessage.bind(service);
    
    service.sendMessage = async (messageData: TelegramMessage) => {
      return withRetry(
        async () => withTimeout(
          originalSendMessage(messageData),
          this.config.endpoint.requestTimeoutMs
        ),
        {
          maxRetries: this.config.telegram.maxRetries,
          delayMs: this.config.telegram.retryDelay,
          backoffMultiplier: 2
        },
        this.logger
      );
    };

    return service;
  }

  /**
   * Gets the current configuration
   */
  getConfig(): ApiConfiguration {
    return this.config;
  }

  /**
   * Gets the logger instance
   */
  getLogger(): ReturnType<typeof getLogger> {
    return this.logger;
  }
} 
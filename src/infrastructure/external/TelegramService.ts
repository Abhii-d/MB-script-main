/**
 * Telegram Service for sending real alerts
 * Following the guideline: Implement retry logic for external calls and handle bot API errors gracefully
 */

import TelegramBot from 'node-telegram-bot-api';
import { Product } from '../../domain/entities/Product.js';
import { TelegramApiError, RetryExhaustedError } from '../../shared/errors/index.js';
import { getLogger } from '../../shared/utils/logger.js';

export interface TelegramMessage {
  chatId: string;
  message: string;
  parseMode?: 'Markdown' | 'HTML';
  disablePreview?: boolean;
}

export interface TelegramConfig {
  botToken: string;
  defaultChatId: string;
  maxRetries: number;
  retryDelay: number;
}

export class TelegramService {
  private bot: TelegramBot;
  private readonly logger = getLogger().createChild({ service: 'TelegramService' });

  constructor(private readonly config: TelegramConfig) {
    this.bot = new TelegramBot(config.botToken, { polling: false });
    this.validateConfig();
  }

  /**
   * Send a deal alert message to Telegram
   */
  public async sendDealAlert(
    product: Product,
    chatId?: string
  ): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const message = this.formatDealAlert(product);
      const targetChatId = chatId || this.config.defaultChatId;

      const success = await this.sendMessage({
        chatId: targetChatId,
        message,
        parseMode: 'Markdown',
        disablePreview: true,
      });

      const duration = Date.now() - startTime;
      
      if (success) {
        this.logger.info('Deal alert sent successfully', {
          productId: product.id,
          productName: product.name,
          discount: `${product.discountPercentage}%`,
          price: `₹${product.currentPrice}`,
          chatId: targetChatId,
          duration: `${duration}ms`,
        });
      }

      return success;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.logError(error as Error, {
        operation: 'sendDealAlert',
        productId: product.id,
        productName: product.name,
        duration: `${duration}ms`,
      });

      return false;
    }
  }

  /**
   * Send multiple deal alerts in batch
   */
  public async sendDealAlerts(
    products: Product[],
    chatId: string = 'fixed_chat_id'
  ): Promise<any>{
    // const startTime = Date.now();
    
    try {
      this.logger.info('Sending batch deal alerts', {
        productCount: products.length,
        chatId: chatId || this.config.defaultChatId,
      });

      // const results: boolean[] = [];
      // let sent = 0;
      let count = 0;
      // let failed = 0;
      let message = "";
      const sortedProducts = products.sort((a, b) => b.discountPercentage - a.discountPercentage);

      // Send alerts one by one to avoid rate limiting
      for (const product of sortedProducts) {
        // message.concat(this.formatDealAlert(product));
        message = message.concat(this.formatDealAlert(product));
        count++;
        if (count > 5) {
          break;
        }
        // try {
        //   message.push(this.formatDealAlert(product));
        //   // const success = await this.sendDealAlert(product, chatId);
        //   // results.push(success);
          
        //   // if (success) {
        //   //   sent++;
        //   // } else {
        //   //   failed++;
        //   // }

        //   // // Add small delay between messages to respect rate limits
        //   // if (products.length > 1) {
        //   //   await this.delay(1000); // 1 second between messages
        //   // }
        // } catch (error) {
        //   this.logger.warn('Failed to send individual alert', {
        //     productId: product.id,
        //     error: error instanceof Error ? error.message : String(error),
        //   });
        //   results.push(false);
        //   failed++;
        // }
      }
      try {

        const success = await this.sendMessage({chatId,
          message,
          parseMode: 'Markdown',
          disablePreview: true,
        });

        if (success) {
          this.logger.info('Deal alert sent successfully', {
            // productId: product.id,
            // productName: product.name,
            // discount: `${product.discountPercentage}%`,
            // price: `₹${product.currentPrice}`,
            // chatId: targetChatId,
            // duration: `${duration}ms`,
          });
        }
  
        return success;
      }
      catch (error) {
        this.logger.logError(error as Error, {
          operation: 'sendDealAlerts',
          productCount: products.length,
        });
      }

      // const duration = Date.now() - startTime;
      
      // this.logger.info('Batch alert sending completed', {
      //   totalProducts: products.length,
      //   sent,
      //   failed,
      //   duration: `${duration}ms`,
      //   successRate: `${((sent / products.length) * 100).toFixed(1)}%`,
      // });

      // return { sent, failed, results };
    } catch (error) {
      this.logger.logError(error as Error, {
        operation: 'sendDealAlerts',
        productCount: products.length,
      });

      return {
        sent: 0,
        failed: products.length,
        results: new Array(products.length).fill(false),
      };
    }
  }

  /**
   * Send monitoring summary message
   */
  public async sendMonitoringSummary(
    totalProducts: number,
    matchingProducts: number,
    topDeals: Product[],
    chatId?: string
  ): Promise<boolean> {
    try {
      const message = this.formatMonitoringSummary(
        totalProducts,
        matchingProducts,
        topDeals
      );

      return await this.sendMessage({
        chatId: chatId || this.config.defaultChatId,
        message,
        parseMode: 'Markdown',
        disablePreview: true,
      });
    } catch (error) {
      this.logger.logError(error as Error, {
        operation: 'sendMonitoringSummary',
        totalProducts,
        matchingProducts,
      });

      return false;
    }
  }

  /**
   * Send a custom message to Telegram
   */
  public async sendMessage(messageData: TelegramMessage): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      await this.sendWithRetry(messageData);
      
      const duration = Date.now() - startTime;
      this.logger.logApiRequest('telegram/sendMessage', 'POST', 200, duration);
      
      return true;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.logError(error as Error, {
        operation: 'sendMessage',
        chatId: messageData.chatId,
        messageLength: messageData.message.length,
        duration: `${duration}ms`,
      });

      if (error instanceof TelegramApiError) {
        throw error;
      }

      throw new TelegramApiError('Failed to send Telegram message', {
        cause: error,
        chatId: messageData.chatId,
        context: {
          messageLength: messageData.message.length,
          parseMode: messageData.parseMode,
        },
      });
    }
  }

  /**
   * Test Telegram connection and bot permissions
   */
  public async testConnection(): Promise<{
    success: boolean;
    botInfo?: any;
    error?: string;
  }> {
    try {
      this.logger.info('Testing Telegram bot connection');
      
      const botInfo = await this.bot.getMe();
      
      this.logger.info('Telegram bot connection successful', {
        botName: botInfo.username,
        botId: botInfo.id,
        isBot: botInfo.is_bot,
      });

      // Test sending a simple message
      const testMessage = `🤖 *Bot Connection Test*\n\nBot is working correctly!\nTime: ${new Date().toISOString()}`;
      
      await this.sendMessage({
        chatId: this.config.defaultChatId,
        message: testMessage,
        parseMode: 'Markdown',
      });

      return {
        success: true,
        botInfo,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.logger.logError(error as Error, {
        operation: 'testConnection',
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Format a product deal alert message
   */
  private formatDealAlert(product: Product): string {
    const discountEmoji = product.discountPercentage >= 50 ? '🔥' : '💰';
    const ratingStars = '⭐'.repeat(Math.floor(product.rating));
    const specs = product.specifications;

    return `${discountEmoji} *SUPPLEMENT DEAL ALERT* ${discountEmoji}

🏷️ *${product.getDisplayName()}*

💸 *${product.discountPercentage}% OFF*
~~₹${product.originalPrice.toLocaleString()}~~ → *₹${product.currentPrice.toLocaleString()}*
💰 Save ₹${product.getSavingsAmount().toLocaleString()}

${ratingStars} ${product.rating}/5 (${product.reviewCount} reviews)

📊 *Specifications:*
• Weight: ${specs.weight} (${specs.weightBucket})
• Flavor: ${specs.flavorBase} - ${specs.flavor}
• Protein: ${specs.proteinPerServing} per serving
• Servings: ${specs.servingsPerContainer}
• Value: ₹${product.getPricePerGramProtein().toFixed(2)} per gram protein

🛒 [Order Now](${product.url})

#SupplementDeals #WheyProtein #${product.brand.replace(/\s+/g, '')}`;
  }

  /**
   * Format monitoring summary message
   */
  private formatMonitoringSummary(
    totalProducts: number,
    matchingProducts: number,
    topDeals: Product[]
  ): string {
    const percentage = ((matchingProducts / totalProducts) * 100).toFixed(1);

    let message = `📊 *Monitoring Summary*

🔍 Scanned: ${totalProducts} products
🎯 Found: ${matchingProducts} deals (${percentage}%)
⏰ Updated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

    if (topDeals.length > 0) {
      message += `\n\n🔥 *Top ${Math.min(3, topDeals.length)} Deals:*\n`;
      
      topDeals.slice(0, 3).forEach((product, index) => {
        message += `\n${index + 1}. *${product.brand}* - ${product.discountPercentage}% off
   ₹${product.currentPrice.toLocaleString()} (was ₹${product.originalPrice.toLocaleString()})`;
      });
    }

    return message;
  }

  /**
   * Send message with retry logic
   */
  private async sendWithRetry(messageData: TelegramMessage): Promise<void> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.config.maxRetries + 1; attempt++) {
      try {
        await this.bot.sendMessage(
          messageData.chatId,
          messageData.message,
          {
            parse_mode: messageData.parseMode,
            disable_web_page_preview: messageData.disablePreview,
          }
        );
        
        return; // Success
      } catch (error) {
        lastError = error;

        if (attempt === this.config.maxRetries + 1) {
          break; // Max attempts reached
        }

        const shouldRetry = this.shouldRetry(error);
        if (!shouldRetry) {
          throw error; // Don't retry for certain errors
        }

        const delay = this.calculateRetryDelay(attempt);
        
        this.logger.warn(`Telegram message failed, retrying in ${delay}ms`, {
          attempt,
          maxRetries: this.config.maxRetries,
          error: error instanceof Error ? error.message : String(error),
        });

        await this.delay(delay);
      }
    }

    throw new RetryExhaustedError(
      `Telegram message failed after ${this.config.maxRetries + 1} attempts`,
      this.config.maxRetries + 1,
      lastError
    );
  }

  /**
   * Determine if error should trigger a retry
   */
  private shouldRetry(error: unknown): boolean {
    if (error && typeof error === 'object' && 'code' in error) {
      const code = (error as any).code;
      
      // Don't retry for these Telegram API errors
      const nonRetryableCodes = [
        'ETELEGRAM_400', // Bad Request
        'ETELEGRAM_401', // Unauthorized
        'ETELEGRAM_403', // Forbidden
        'ETELEGRAM_404', // Not Found
      ];
      
      if (nonRetryableCodes.includes(code)) {
        return false;
      }
    }

    // Retry for network errors and rate limiting
    return true;
  }

  /**
   * Calculate delay for retry with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    const exponentialDelay = this.config.retryDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (!this.config.botToken || this.config.botToken.trim() === '') {
      throw new TelegramApiError('Telegram bot token is required', {
        context: { configKey: 'botToken' },
      });
    }

    if (!this.config.defaultChatId || this.config.defaultChatId.trim() === '') {
      throw new TelegramApiError('Telegram chat ID is required', {
        context: { configKey: 'defaultChatId' },
      });
    }

    // Validate bot token format (should be number:string)
    if (!/^\d+:[\w-]+$/.test(this.config.botToken)) {
      throw new TelegramApiError('Invalid Telegram bot token format', {
        context: { 
          configKey: 'botToken',
          expectedFormat: 'number:string' 
        },
      });
    }
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 
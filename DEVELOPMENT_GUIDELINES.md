# Development Guidelines for MB Script Project

## 🎯 **Purpose**
This document defines coding standards, architectural patterns, and best practices for the Muscle Blaze price monitoring project. All contributors and AI tools should follow these guidelines.

## 📋 **Core Principles**

### SOLID Principles Implementation
1. **Single Responsibility**: Each class handles one specific concern
2. **Open/Closed**: Extend functionality without modifying existing code
3. **Liskov Substitution**: Subtypes must be substitutable for base types
4. **Interface Segregation**: Use specific, focused interfaces
5. **Dependency Inversion**: Depend on abstractions, not concretions

### Additional Principles
- **DRY**: Don't Repeat Yourself - extract common functionality
- **KISS**: Keep It Simple - avoid unnecessary complexity
- **YAGNI**: You Aren't Gonna Need It - implement only current requirements

## 🏗️ **Architecture Guidelines**

### Clean Architecture Structure
```
src/
├── domain/
│   ├── entities/           # Business entities
│   ├── value-objects/      # Domain value objects
│   └── repositories/       # Repository interfaces
├── application/
│   ├── use-cases/          # Business use cases
│   ├── services/           # Application services
│   └── dtos/               # Data Transfer Objects
├── infrastructure/
│   ├── repositories/       # Repository implementations
│   ├── external/           # External API integrations
│   └── persistence/        # Data persistence
├── interfaces/
│   ├── controllers/        # API controllers
│   ├── middlewares/        # Express middlewares
│   └── presenters/         # Data presentation
└── shared/
    ├── utils/              # Common utilities
    ├── types/              # Shared type definitions
    └── constants/          # Application constants
```

### Dependency Flow
- **Inward Dependencies**: All dependencies point toward the domain
- **Interface Segregation**: Use specific interfaces for each concern
- **Dependency Injection**: Inject dependencies through constructors

## 📝 **TypeScript Standards**

### Type Safety
```typescript
// ✅ Good: Strict typing
interface ProductPrice {
  readonly productId: string;
  readonly price: number;
  readonly currency: string;
  readonly timestamp: Date;
}

// ❌ Bad: Using any
function processPrice(price: any): any {
  return price;
}

// ✅ Good: Proper error handling with types
class PriceValidationError extends Error {
  constructor(
    message: string,
    public readonly productId: string,
    public readonly invalidPrice: unknown
  ) {
    super(message);
    this.name = 'PriceValidationError';
  }
}
```

### Function Design
```typescript
// ✅ Good: Pure function with clear contract
function calculatePriceChangePercentage(
  previousPrice: number,
  currentPrice: number
): number {
  if (previousPrice <= 0) {
    throw new Error('Previous price must be positive');
  }
  return ((currentPrice - previousPrice) / previousPrice) * 100;
}

// ✅ Good: Async function with proper error handling
async function sendTelegramAlert(
  message: string,
  chatId: string
): Promise<void> {
  try {
    await telegramClient.sendMessage(chatId, message);
  } catch (error) {
    logger.error('Failed to send Telegram message', { error, chatId });
    throw new TelegramDeliveryError('Alert delivery failed', { cause: error });
  }
}
```

## 🧪 **Testing Guidelines**

### Test Structure
```typescript
describe('PriceMonitorService', () => {
  describe('checkPriceChange', () => {
    it('should return true when price drops below threshold', async () => {
      // Arrange
      const mockRepository = createMockRepository();
      const service = new PriceMonitorService(mockRepository);
      
      // Act
      const result = await service.checkPriceChange('product-123');
      
      // Assert
      expect(result.isPriceDropped).toBe(true);
      expect(result.changePercentage).toBe(-15.5);
    });
  });
});
```

### Testing Principles
- **Unit Tests**: 70% - Fast, isolated, focused
- **Integration Tests**: 20% - Component interactions
- **E2E Tests**: 10% - Full system behavior
- **Test Coverage**: Minimum 90% for business logic

## 🚨 **Error Handling Standards**

### Custom Error Classes
```typescript
// Domain errors
export class ProductNotFoundError extends Error {
  constructor(productId: string) {
    super(`Product with ID ${productId} not found`);
    this.name = 'ProductNotFoundError';
  }
}

// Infrastructure errors
export class TelegramAPIError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly response?: unknown
  ) {
    super(message);
    this.name = 'TelegramAPIError';
  }
}
```

### Error Handling Patterns
```typescript
// ✅ Good: Explicit error handling
async function monitorPrice(productId: string): Promise<MonitoringResult> {
  try {
    const currentPrice = await scrapePrice(productId);
    const previousPrice = await getPreviousPrice(productId);
    
    return analyzePrice(currentPrice, previousPrice);
  } catch (error) {
    if (error instanceof ProductNotFoundError) {
      logger.warn('Product monitoring skipped', { productId, reason: error.message });
      return { status: 'skipped', reason: error.message };
    }
    
    logger.error('Price monitoring failed', { productId, error });
    throw error;
  }
}
```

## 📊 **Logging Standards**

### Structured Logging
```typescript
// ✅ Good: Structured logging with context
logger.info('Price monitoring started', {
  productId: 'whey-protein-123',
  url: 'https://muscleblaze.com/product/123',
  timestamp: new Date().toISOString(),
  monitoringInterval: 300000
});

logger.error('Scraping failed', {
  productId,
  url,
  error: error.message,
  stack: error.stack,
  retryCount: 3
});
```

### Log Levels
- **ERROR**: System errors, exceptions
- **WARN**: Recoverable issues, deprecations
- **INFO**: Business events, important state changes
- **DEBUG**: Detailed execution information

## 🔒 **Security Guidelines**

### Data Validation
```typescript
// ✅ Good: Input validation with Zod
const TelegramConfigSchema = z.object({
  botToken: z.string().min(1, 'Bot token is required'),
  chatId: z.string().min(1, 'Chat ID is required'),
  retryAttempts: z.number().int().positive().default(3)
});

function validateTelegramConfig(config: unknown): TelegramConfig {
  return TelegramConfigSchema.parse(config);
}
```

### Environment Security
- Store all secrets in environment variables
- Use `.env.example` for documentation
- Validate environment variables at startup
- Never log sensitive information

## 🚀 **Performance Guidelines**

### Optimization Strategies
- **Measure First**: Profile before optimizing
- **Cache Strategically**: Cache expensive operations
- **Rate Limiting**: Implement delays between requests
- **Memory Management**: Clean up resources properly

### Code Examples
```typescript
// ✅ Good: Efficient price caching
class PriceCache {
  private readonly cache = new Map<string, CachedPrice>();
  private readonly ttl = 5 * 60 * 1000; // 5 minutes

  get(productId: string): number | null {
    const cached = this.cache.get(productId);
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.price;
    }
    this.cache.delete(productId);
    return null;
  }
}
```

## 📚 **Documentation Requirements**

### Code Documentation
```typescript
/**
 * Monitors product price changes and triggers alerts when thresholds are met.
 * 
 * @param productId - Unique identifier for the product to monitor
 * @param thresholds - Price change thresholds for triggering alerts
 * @returns Promise resolving to monitoring result with alert status
 * 
 * @throws {ProductNotFoundError} When product doesn't exist
 * @throws {ScrapingError} When price extraction fails
 * 
 * @example
 * ```typescript
 * const result = await monitorProduct('whey-123', { dropPercentage: 10 });
 * if (result.alertTriggered) {
 *   console.log(`Alert sent: ${result.message}`);
 * }
 * ```
 */
async function monitorProduct(
  productId: string, 
  thresholds: PriceThresholds
): Promise<MonitoringResult> {
  // Implementation
}
```

## 🔄 **Git Workflow**

### Commit Standards
- Use conventional commit format
- Keep commits atomic and focused
- Write descriptive commit messages
- Include issue references when applicable

### Branch Strategy
- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - Feature development
- `fix/*` - Bug fixes

This document serves as the definitive guide for code quality and architectural decisions in the MB Script project. All AI tools and contributors should reference these guidelines when generating or reviewing code.

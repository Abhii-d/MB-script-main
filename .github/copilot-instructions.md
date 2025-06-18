# GitHub Copilot Instructions for MB Script Project

## Project Context
This is a TypeScript Node.js project for monitoring Muscle Blaze whey protein prices and sending Telegram alerts on price drops.

## Code Generation Guidelines

### TypeScript Standards
- Always use strict TypeScript settings
- Never use `any` type - use specific types or `unknown`
- Define interfaces for all data structures
- Use type guards for runtime type checking
- Prefer `const` over `let` when possible

### Architecture Patterns
- Follow Clean Architecture principles
- Use dependency injection for services
- Separate domain logic from infrastructure
- Implement repository pattern for data access
- Use service layer for business logic

### Function Design
```typescript
// Good: Pure function with clear types
function calculatePriceChange(oldPrice: number, newPrice: number): number {
  return ((newPrice - oldPrice) / oldPrice) * 100;
}

// Good: Async function with proper error handling
async function fetchProductPrice(url: string): Promise<number> {
  try {
    // implementation
  } catch (error) {
    throw new PriceScrapingError(`Failed to fetch price from ${url}`, { cause: error });
  }
}
```

### Error Handling
- Use custom error classes
- Always include error context
- Log errors with structured data
- Implement retry logic for external calls

### Testing Approach
- Write unit tests for business logic
- Use mocks for external dependencies
- Test error scenarios
- Use descriptive test names

### Logging Standards
```typescript
// Use structured logging
logger.info('Price check completed', {
  productUrl,
  currentPrice,
  previousPrice,
  priceChange: percentage
});
```

### Environment Configuration
- Use environment variables for all configuration
- Validate environment variables at startup
- Provide clear error messages for missing config

### Telegram Integration
- Format messages consistently
- Include emoji for better UX
- Handle bot API errors gracefully
- Implement message retry logic

### Web Scraping Best Practices
- Implement rate limiting
- Add random delays between requests
- Handle dynamic content loading
- Validate scraped data

## File Organization Patterns
```
src/
├── domain/          # Business logic, entities
├── application/     # Use cases, services
├── infrastructure/  # External integrations
├── interfaces/      # Controllers, DTOs
└── shared/         # Common utilities
```

## Code Quality Requirements
- Maximum cyclomatic complexity: 10
- Maximum function length: 20 lines
- Use meaningful variable names
- Add JSDoc comments for public APIs
- Follow SOLID principles

## Security Considerations
- Never hardcode secrets
- Validate all external inputs
- Sanitize data before processing
- Use secure random for sensitive operations
- Implement proper rate limiting

# MB Script - Muscle Blaze Price Monitor

🏋️‍♂️ **Automated Whey Protein Price Monitoring & Telegram Alerts**

A TypeScript-based monitoring script that tracks specific whey protein prices on Muscle Blaze website and sends instant Telegram notifications when price drops are detected.

## 📋 Features

- 🔍 **Real-time Price Monitoring** - Continuously tracks whey protein prices
- 📱 **Telegram Alerts** - Instant notifications when prices drop
- ⏰ **Scheduled Monitoring** - Runs on configurable time intervals
- 💰 **Price Drop Detection** - Smart comparison with previous prices
- 📊 **Historical Tracking** - Maintains price history for analysis
- 🛡️ **Error Handling** - Robust error handling and retry mechanisms



### Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Run the price monitoring script
- `npm run dev` - Build and run in development mode
- `npm run build:watch` - Build in watch mode for development
- `npm run type-check` - Run TypeScript type checking
- `npm run clean` - Remove build artifacts

## 📱 Telegram Setup

### 1. Create a Telegram Bot

1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Use `/newbot` command and follow instructions
3. Save the Bot Token provided

### 2. Get Chat/Channel ID

**For Personal Chat:**
1. Message your bot
2. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
3. Look for `chat.id` in the response

**For Channel:**
1. Add your bot as admin to the channel
2. Post a message mentioning the bot
3. Use the same API endpoint to get the channel ID

## 🏗️ Project Structure

```
MB-script-main/
├── src/
│   ├── index.ts              # Main entry point
│   ├── services/
│   │   ├── scraper.ts        # Web scraping logic
│   │   ├── telegram.ts       # Telegram bot integration
│   │   └── monitor.ts        # Price monitoring service
│   ├── utils/
│   │   ├── logger.ts         # Logging utilities
│   │   └── config.ts         # Configuration management
│   └── types/
│       └── index.ts          # TypeScript type definitions
├── dist/                     # Compiled JavaScript
├── logs/                     # Application logs
├── .env                      # Environment variables
├── package.json              # Dependencies and scripts
└── tsconfig.json             # TypeScript configuration
```

## ⚙️ Monitoring Configuration

### Price Thresholds

Configure when to trigger alerts:

```typescript
// In your .env file
PRICE_THRESHOLD=10    # Alert on 10% or more price drop
ABSOLUTE_THRESHOLD=100 # Alert on ₹100 or more price drop
```

### Monitoring Intervals

```typescript
// Check every 5 minutes
MONITOR_INTERVAL=300000

// Check every hour
MONITOR_INTERVAL=3600000
```

## 📊 Features in Detail

### 🕷️ Web Scraping
- Extracts current price from Muscle Blaze product pages
- Handles dynamic content and anti-bot measures
- Validates price data integrity

### 💰 Price Analysis
- Compares current price with historical data
- Calculates percentage and absolute price changes
- Maintains price history database

### 📱 Telegram Integration
- Sends formatted price drop notifications
- Includes product details and price comparison
- Supports both individual chats and channels

### ⏰ Scheduling
- Configurable monitoring intervals
- Automatic retry on failures
- Graceful shutdown handling

### Using Cron Job

```bash
# Edit crontab
crontab -e

# Add entry (runs every 5 minutes)
*/5 * * * * cd /path/to/MB-script-main && npm run start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
---

**Happy Monitoring! 🏋️‍♂️💪**

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

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Telegram Bot Token
- Telegram Chat/Channel ID

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd MB-script-main

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Configure your environment variables
nano .env
```

### Configuration

Create a `.env` file with the following variables:

```env
# Telegram Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_chat_or_channel_id_here

# Monitoring Configuration
PRODUCT_URL=https://www.muscleblaze.com/your-product-url
MONITOR_INTERVAL=300000  # 5 minutes in milliseconds
PRICE_THRESHOLD=10       # Minimum price drop percentage for alerts

# Optional
LOG_LEVEL=info
RETRY_ATTEMPTS=3
RETRY_DELAY=5000
```

## 🔧 Usage

### Development Mode

```bash
# Build and run once
npm run dev

# Run in watch mode for development
npm run build:watch
```

### Production Mode

```bash
# Build the project
npm run build

# Start monitoring
npm run start
```

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

## 🛠️ Deployment

### Using PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start npm --name "mb-monitor" -- start

# Monitor
pm2 logs mb-monitor
pm2 status
```

### Using Cron Job

```bash
# Edit crontab
crontab -e

# Add entry (runs every 5 minutes)
*/5 * * * * cd /path/to/MB-script-main && npm run start
```

## 🔍 Monitoring & Logs

- Application logs are stored in `logs/` directory
- Configure log levels via `LOG_LEVEL` environment variable
- Monitor script performance and errors through logs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This tool is for personal use only. Please respect Muscle Blaze's terms of service and implement appropriate rate limiting to avoid overwhelming their servers.

## 🆘 Support

If you encounter any issues:

1. Check the logs in `logs/` directory
2. Verify your environment variables
3. Ensure your Telegram bot has proper permissions
4. Check your internet connection and proxy settings

---

**Happy Monitoring! 🏋️‍♂️💪**

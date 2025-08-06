# 🚀 Deployment Guide - Hybrid Scheduler Architecture

This guide explains how to deploy the HealthKart monitoring system using GitHub Actions for scheduling and Vercel for API processing.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Actions                           │
│                   (Free Scheduler)                         │
│                                                             │
│  ┌─────────────────┐    HTTP POST    ┌──────────────────┐   │
│  │ Cron Schedule   │─────────────────▶│ curl API call   │   │
│  │ (every 30 min)  │                 │ to Vercel        │   │
│  └─────────────────┘                 └──────────────────┘   │
└─────────────────────────────────────────│───────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Vercel API Server                          │
│                 (Mumbai Region)                             │
│                                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │
│  │ Express API   │─▶│ HealthKart    │─▶│ Telegram Bot  │   │
│  │ /api/send-alert│  │ API Client    │  │ Service       │   │
│  └───────────────┘  └───────────────┘  └───────────────┘   │
└─────────────────────────────────────────│───────────────────┘
                                          │
                                          ▼
                                ┌───────────────┐
                                │ Telegram      │
                                │ Channel       │
                                └───────────────┘
```

**Why this architecture?**
- **GitHub Actions**: Free unlimited scheduling (no Vercel limitations)
- **Vercel Mumbai**: Indian server region for HealthKart API access  
- **Separation of Concerns**: Scheduling vs Processing
- **Cost Effective**: Free GitHub Actions + Free Vercel tier
- **Telegram**: Global notification delivery

## 📋 Prerequisites

1. **Vercel Account** - For API server deployment
2. **GitHub Repository** - For scheduler deployment
3. **Telegram Bot** - For alerts
4. **Environment Variables** - Configured properly

## 🔧 Step 1: Vercel Deployment (API Server)

### 1.1 Install Dependencies
```bash
npm install
```

### 1.2 Build the Project
```bash
npm run build
```

### 1.3 Deploy to Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (first time)
vercel --prod

# Set environment variables
vercel env add TELEGRAM_BOT_TOKEN
vercel env add TELEGRAM_CHAT_ID
vercel env add NODE_ENV production

# Redeploy with environment variables
vercel --prod
```

### 1.4 Configure Vercel Settings
- **Region**: Mumbai (bom1) - specified in `vercel.json`
- **Function Timeout**: Default (10 seconds is sufficient)
- **Environment**: Production

### 1.5 Test API Endpoints
```bash
# Health check
curl https://your-app.vercel.app/health

# Test alert endpoint
curl -X POST https://your-app.vercel.app/api/send-alert \
  -H "Content-Type: application/json" \
  -d '{"source": "manual-test"}'
```

## 📱 Step 2: Telegram Bot Setup

### 2.1 Create Bot
1. Message [@BotFather](https://t.me/botfather)
2. Use `/newbot` command
3. Save the bot token

### 2.2 Get Chat ID
```bash
# Send a message to your bot, then:
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
```

### 2.3 Test Bot
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": "<YOUR_CHAT_ID>",
    "text": "🏋️‍♂️ HealthKart monitor is now active!"
  }'
```

## 🤖 Step 3: GitHub Actions Setup

### 3.1 Repository Setup
1. Push your code to GitHub repository
2. Go to repository **Settings** → **Actions** → **General**
3. Enable "Allow all actions and reusable workflows"

### 3.2 Configure Secrets
Go to **Settings** → **Secrets and variables** → **Actions** and add:

**Required Secrets:**
```
VERCEL_API_URL = https://your-app.vercel.app
```

**Optional Secrets (for error notifications):**
```
TELEGRAM_ERROR_CHAT_ID = your_error_chat_id
TELEGRAM_BOT_TOKEN = your_bot_token
```

### 3.3 Enable Workflow
The workflow file `.github/workflows/healthkart-scheduler.yml` will:
- Run automatically every 30 minutes
- Call your Vercel API endpoint
- Log all results
- Handle errors gracefully

### 3.4 Manual Trigger
You can manually trigger the workflow:
1. Go to **Actions** tab in your repository
2. Select "HealthKart Deal Scheduler"
3. Click "Run workflow"
4. Optionally enable "test mode"

### 3.5 Monitor Workflow
- Check the **Actions** tab for workflow runs
- View logs for each execution
- Monitor success/failure rates

## ⚙️ Step 4: Configuration

### 4.1 Environment Variables (.env for local, Vercel env for production)
```env
# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Monitoring
ALERT_DISCOUNT_THRESHOLD=40
ALERT_MAX_PRICE=10000
ALERT_MIN_RATING=3.5
ALERT_PREFERRED_BRANDS=muscleblaze,optimum nutrition,dymatize

# API Settings
HEALTHKART_REQUEST_DELAY_MS=1000
HEALTHKART_MAX_RETRIES=3

# Logging
LOG_LEVEL=info
NODE_ENV=production
```

### 4.2 Monitoring Configuration
Edit `src/shared/config/demoConfig.ts` to adjust:
- Discount thresholds
- Price limits
- Brand preferences
- Category codes

## 🚀 Step 5: Testing the Complete System

### 5.1 Local Testing
```bash
# Test API server locally
npm run start:api

# Test in another terminal
curl http://localhost:3000/health
curl -X POST http://localhost:3000/api/send-alert
```

### 5.2 Production Testing
1. **Vercel API**: Visit `https://your-app.vercel.app/health`
2. **GitHub Pages**: Visit `https://your-username.github.io/your-repo`
3. **Manual Trigger**: Click "Trigger Alert Check" on the dashboard

### 5.3 End-to-End Test
1. Trigger alert from GitHub Pages dashboard
2. Check Vercel function logs
3. Verify Telegram message received
4. Check GitHub Actions logs

## 📊 Step 6: Monitoring & Maintenance

### 6.1 Logs and Monitoring
- **Vercel**: Check function logs in Vercel dashboard
- **GitHub**: Check Actions logs for scheduler
- **Telegram**: Monitor bot messages

### 6.2 Troubleshooting
```bash
# Check Vercel logs
vercel logs

# Test API connectivity
curl -v https://your-app.vercel.app/health

# Validate environment variables
vercel env ls
```

### 6.3 Performance Optimization
- Monitor Vercel function execution time
- Adjust request delays if needed
- Optimize product filtering logic

## 🔄 Step 7: Scheduling Options

### Option 1: GitHub Actions (Current)
- Runs every 30 minutes via cron
- Free tier: 2000 minutes/month
- Automatic deployment

### Option 2: External Cron Service
```bash
# Use services like cron-job.org
curl -X POST https://your-app.vercel.app/api/send-alert
```

### Option 3: Vercel Cron (Pro Plan)
```javascript
// api/cron.js
export default function handler(req, res) {
  // Trigger alert logic
}
```

## 🛡️ Security Considerations

1. **API Rate Limiting**: Implemented in HealthKart client
2. **CORS Configuration**: Restricted to your domains
3. **Environment Variables**: Never commit secrets
4. **Error Handling**: Graceful failure handling
5. **Logging**: No sensitive data in logs

## 💰 Cost Estimation

- **Vercel**: Free tier (100GB bandwidth, 100 function executions/day)
- **GitHub Pages**: Free
- **GitHub Actions**: Free tier (2000 minutes/month)
- **Total**: $0/month for moderate usage

## 🚨 Alerts and Notifications

The system will send Telegram alerts when:
- Deals above threshold are found
- API errors occur
- System health issues detected

## 📈 Scaling Considerations

- **Multiple Categories**: Add more category monitoring
- **Multiple Channels**: Support different Telegram channels
- **Database**: Add persistent storage for deal history
- **Analytics**: Track deal patterns and success rates

---

## 🆘 Troubleshooting

### Common Issues

1. **API not responding from India**
   - Verify Vercel region is set to Mumbai (bom1)
   - Check vercel.json configuration

2. **Telegram messages not sending**
   - Verify bot token and chat ID
   - Check bot permissions

3. **GitHub Actions failing**
   - Check repository secrets
   - Verify workflow permissions

4. **No deals found**
   - Adjust discount threshold
   - Check category codes
   - Verify API response format

### Support
- Check logs in respective platforms
- Test individual components
- Verify environment variables
- Monitor API rate limits

---

**Happy Monitoring! 🏋️‍♂️💪**

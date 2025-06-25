/**
 * MB Script - HealthKart Product Monitoring System
 * Main entry point for the application
 */

import { runDemo } from './interfaces/cli/demo.js';

console.log(`
🏋️‍♂️ MB Script - HealthKart Product Monitoring System
=====================================================

🎯 What this system does:
• Monitors HealthKart for supplement deals (40%+ discounts)
• Fetches real-time product data via API
• Analyzes deals and filters by your preferences
• Provides comprehensive product insights

🚀 Available Commands:
• npm run demo        - Run the complete demo
• npm run demo:help   - Show demo help
• npm run build       - Build the project
• npm run dev         - Build and run main entry

📊 Demo Features:
✅ Real HealthKart API integration
✅ Product data fetching and transformation
✅ Discount-based filtering (40%+ deals)
✅ Brand and rating filtering
✅ Deal categorization (hot/good/premium/value)
✅ Performance monitoring and logging
✅ Telegram-ready alert message formatting

🔧 To get started:
1. Run the demo: npm run demo
2. Check the logs in: ./logs/
3. Modify configuration in: src/interfaces/cli/demo.ts

📝 For production setup:
1. Set up environment variables (see .env.example)
2. Configure Telegram bot credentials
3. Customize monitoring preferences
4. Set up scheduling (cron jobs, PM2, etc.)

Let's run the demo to see the system in action...
`);

// Auto-run demo for demonstration
runDemo().catch(error => {
  console.error('\n❌ Demo execution failed:', error instanceof Error ? error.message : String(error));
  console.log('\n💡 Try running: npm run demo:help for more information');
  process.exit(1);
});

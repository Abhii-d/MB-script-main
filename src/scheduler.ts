/**
 * GitHub Pages Scheduler
 * This file will be deployed on GitHub Pages and will call the Vercel API
 * at regular intervals to trigger deal monitoring and alerts
 */

interface AlertResponse {
  success: boolean;
  timestamp: string;
  executionTimeMs: number;
  data?: {
    totalProductsFetched: number;
    qualifyingDeals: number;
    telegramSent: boolean;
    deals: Array<{
      name: string;
      brand: string;
      currentPrice: number;
      originalPrice: number;
      discountPercentage: number;
      rating: number;
      url: string;
    }>;
  };
  error?: string;
}

class HealthKartScheduler {
  private readonly apiUrl: string;
  private readonly intervalMinutes: number;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(apiUrl: string, intervalMinutes: number = 30) {
    this.apiUrl = apiUrl;
    this.intervalMinutes = intervalMinutes;
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) {
      console.log('⚠️ Scheduler is already running');
      return;
    }

    console.log(`🚀 Starting HealthKart deal scheduler`);
    console.log(`📡 API URL: ${this.apiUrl}`);
    console.log(`⏰ Interval: ${this.intervalMinutes} minutes`);

    // Run immediately on start
    this.triggerAlert();

    // Set up recurring schedule
    this.intervalId = setInterval(() => {
      this.triggerAlert();
    }, this.intervalMinutes * 60 * 1000);

    this.isRunning = true;
    console.log('✅ Scheduler started successfully');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('⚠️ Scheduler is not running');
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log('🛑 Scheduler stopped');
  }

  /**
   * Trigger a single alert check
   */
  private async triggerAlert(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(`\n🔍 [${new Date().toISOString()}] Triggering deal check...`);

      const response = await fetch(`${this.apiUrl}/api/send-alert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: 'github-pages-scheduler',
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json() as AlertResponse;
      const executionTime = Date.now() - startTime;

      if (result.success) {
        console.log('✅ Alert check completed successfully');
        console.log(`📊 Results: ${result.data?.totalProductsFetched || 0} products, ${result.data?.qualifyingDeals || 0} deals`);
        console.log(`📱 Telegram sent: ${result.data?.telegramSent ? 'Yes' : 'No'}`);
        console.log(`⏱️ Total time: ${executionTime}ms`);

        if (result.data?.deals && result.data.deals.length > 0) {
          console.log('\n🎯 Top deals found:');
          result.data.deals.slice(0, 3).forEach((deal, index) => {
            console.log(`${index + 1}. ${deal.name} - ₹${deal.currentPrice} (${deal.discountPercentage}% off)`);
          });
        }
      } else {
        console.error('❌ Alert check failed:', result.error);
      }

    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('❌ Failed to trigger alert:', error instanceof Error ? error.message : String(error));
      console.log(`⏱️ Failed after: ${executionTime}ms`);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): { isRunning: boolean; intervalMinutes: number; apiUrl: string } {
    return {
      isRunning: this.isRunning,
      intervalMinutes: this.intervalMinutes,
      apiUrl: this.apiUrl
    };
  }

  /**
   * Test the API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing API connection...');
      
      const response = await fetch(`${this.apiUrl}/health`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ API connection successful:', result);
      return true;

    } catch (error) {
      console.error('❌ API connection failed:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }
}

// Configuration
const VERCEL_API_URL = process.env.VERCEL_API_URL || 'https://your-vercel-app.vercel.app';
const MONITORING_INTERVAL = parseInt(process.env.MONITORING_INTERVAL_MINUTES || '30');

// Initialize and start scheduler
const scheduler = new HealthKartScheduler(VERCEL_API_URL, MONITORING_INTERVAL);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  scheduler.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  scheduler.stop();
  process.exit(0);
});

// Export for use in other modules
export { HealthKartScheduler };

// Auto-start if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`
🏋️‍♂️ HealthKart Deal Scheduler
============================

🎯 Architecture:
• GitHub Pages: Runs this scheduler
• Vercel (India): Handles HealthKart API + Telegram alerts

🚀 Starting scheduler...
`);

  // Test connection first
  scheduler.testConnection().then(connected => {
    if (connected) {
      scheduler.start();
    } else {
      console.error('❌ Cannot start scheduler - API connection failed');
      process.exit(1);
    }
  });
}

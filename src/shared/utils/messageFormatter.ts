/**
 * Telegram message formatting utilities
 * Centralizes all message formatting logic for consistency
 * Follows Clean Architecture and TypeScript best practices
 */

import { Product } from '../../domain/entities/Product.js';

/**
 * Interface for consolidated deal alert message data
 */
export interface ConsolidatedDealAlertData {
  readonly products: readonly Product[];
  readonly timestamp: Date;
}

/**
 * Interface for individual product alert message data
 */
export interface ProductAlertData {
  readonly product: Product;
  readonly timestamp: Date;
}

/**
 * Interface for monitoring summary message data
 */
export interface MonitoringSummaryData {
  readonly totalProducts: number;
  readonly matchingProducts: number;
  readonly topDeals: readonly Product[];
  readonly timestamp: Date;
}

/**
 * Formats a consolidated deal alert message with multiple products
 * 
 * @param data - Alert data containing products and timestamp
 * @returns Formatted Telegram message in Markdown format
 * 
 * @example
 * ```typescript
 * const message = formatConsolidatedDealAlert({
 *   products: [product1, product2],
 *   timestamp: new Date()
 * });
 * ```
 */
export function formatConsolidatedDealAlert(data: ConsolidatedDealAlertData): string {
  const { products, timestamp } = data;
  
  if (products.length === 0) {
    return '⚠️ No products available for alert';
  }

  console.log("timestamp", timestamp);
  // Sort products by discount percentage in descending order and take top 3
  const topProducts = [...products]
    .sort((a, b) => b.discountPercentage - a.discountPercentage)
    .slice(0, 3);

  const avgDiscount = Math.round(topProducts.reduce((sum, p) => sum + p.discountPercentage, 0) / topProducts.length);
  const totalSavings = topProducts.reduce((sum, p) => sum + p.getSavingsAmount(), 0);

  let message = `🚨 **HOT SUPPLEMENT DEALS** 🚨

🎯 **${topProducts.length} Amazing Deals Found!**
📈 Avg Discount: **${avgDiscount}%**
💸 Total Savings: **₹${totalSavings.toLocaleString()}**
🕐 ${timestamp.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

━━━━━━━━━━━━━━━━━━━━━━━━

`;

  message += formatTopProductsList(topProducts);
  
  message += `

━━━━━━━━━━━━━━━━━━━━━━━━

🛒 **Happy Shopping!** 
*Real products from HealthKart API*

#SupplementDeals #WheyProtein #HealthKart #LiveDeals`;

  return message;
}

/**
 * Formats an individual product alert message
 * 
 * @param data - Product alert data
 * @returns Formatted Telegram message in Markdown format
 */
export function formatProductAlert(data: ProductAlertData): string {
  const { product, timestamp } = data;
  const discountEmoji = getDiscountEmoji(product.discountPercentage);
  const ratingStars = getRatingStars(product.rating);
  
  return `${discountEmoji} **SUPPLEMENT DEAL ALERT** ${discountEmoji}

🏷️ **${product.getDisplayName()}**

💸 **${product.discountPercentage}% OFF**
~~₹${product.originalPrice.toLocaleString()}~~ → **₹${product.currentPrice.toLocaleString()}**
💰 Save ₹${product.getSavingsAmount().toLocaleString()}

${ratingStars} ${product.rating}/5 (${product.reviewCount} reviews)

📊 **Specifications:**
• Weight: ${product.specifications.weight} (${product.specifications.weightBucket})
• Flavor: ${product.specifications.flavorBase} - ${product.specifications.flavor}
• Protein: ${product.specifications.proteinPerServing} per serving
• Servings: ${product.specifications.servingsPerContainer}
• Value: ₹${product.getPricePerGramProtein().toFixed(2)} per gram protein

🛒 **Order Now**: ${product.url}

⏰ Updated: ${timestamp.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

#SupplementDeals #WheyProtein #${product.brand.replace(/\s+/g, '')}`;
}

/**
 * Formats a monitoring summary message
 * 
 * @param data - Monitoring summary data
 * @returns Formatted Telegram message in Markdown format
 */
export function formatMonitoringSummary(data: MonitoringSummaryData): string {
  const { totalProducts, matchingProducts, topDeals, timestamp } = data;
  const percentage = ((matchingProducts / totalProducts) * 100).toFixed(1);

  let message = `📊 *Monitoring Summary*

🔍 Scanned: ${totalProducts} products
🎯 Found: ${matchingProducts} deals (${percentage}%)
⏰ Updated: ${timestamp.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

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
 * Formats the product list section
 */
function formatTopProductsList(products: readonly Product[]): string {
  return products.map((product, index) => {
    const discountEmoji = getDiscountEmoji(product.discountPercentage);
    const specs = product.specifications;
    const originalPrice = product.originalPrice;
    const savingsAmount = product.getSavingsAmount();

    let productSection = `${discountEmoji} **${index + 1}. TOP DEAL** ${discountEmoji}

🏷️ **${product.getDisplayName()}**
🏢 *${product.brand}*
💰 **₹${product.currentPrice.toLocaleString()}** ~~₹${originalPrice.toLocaleString()}~~
🔥 **${product.discountPercentage}% OFF** • Save ₹${savingsAmount.toLocaleString()}

🍓 **Flavor:** ${specs.flavor}
⚖️ **Weight:** ${specs.weight}
💪 **Protein:** ${specs.proteinPerServing} per serving
🥄 **Servings:** ${specs.servingsPerContainer}
📊 **Protein %:** ${specs.proteinPercentage}%

🛒 [**BUY NOW** ➡️](${product.url})`;

    if (index < products.length - 1) {
      productSection += '\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
    }

    return productSection;
  }).join('');
}

/**
 * Gets appropriate emoji based on discount percentage
 */
function getDiscountEmoji(discountPercentage: number): string {
  return discountPercentage >= 50 ? '🔥' : '💰';
}

/**
 * Gets star rating representation
 */
function getRatingStars(rating: number): string {
  return '⭐'.repeat(Math.floor(rating));
} 
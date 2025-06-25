/**
 * HealthKart Data Transformation Service
 * Following the guideline: Validate all external inputs and convert to domain models
 */

import { HealthKartProduct, ProductGroup, ProductAttribute, Product as ProductInterface } from '../../shared/types/index.js';
import { Product } from '../../domain/entities/Product.js';
import { DataParsingError } from '../../shared/errors/index.js';
import { getLogger } from '../../shared/utils/logger.js';

export class HealthKartTransformService {
  private readonly logger = getLogger().createChild({ service: 'HealthKartTransformService' });

  /**
   * Transform HealthKart API product to domain Product entity
   */
  public transformToProduct(healthKartProduct: HealthKartProduct): Product {
    try {
      const productData = this.transformToProductInterface(healthKartProduct);
      return Product.create(productData);
    } catch (error) {
      this.logger.logError(error as Error, {
        operation: 'transformToProduct',
        productId: healthKartProduct.id,
        productName: healthKartProduct.nm,
      });

      throw new DataParsingError(
        `Failed to transform HealthKart product to domain model: ${healthKartProduct.nm}`,
        {
          cause: error,
          invalidData: healthKartProduct,
          expectedSchema: 'Product',
        }
      );
    }
  }

  /**
   * Transform multiple HealthKart products
   */
  public transformToProducts(healthKartProducts: HealthKartProduct[]): Product[] {
    const products: Product[] = [];
    const errors: Array<{ productId: number; error: string }> = [];

    for (const healthKartProduct of healthKartProducts) {
      try {
        const product = this.transformToProduct(healthKartProduct);
        products.push(product);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({
          productId: healthKartProduct.id,
          error: errorMessage,
        });

        this.logger.warn('Failed to transform product, skipping', {
          productId: healthKartProduct.id,
          productName: healthKartProduct.nm,
          error: errorMessage,
        });
      }
    }

    if (errors.length > 0) {
      this.logger.warn('Some products failed transformation', {
        totalProducts: healthKartProducts.length,
        successfulTransformations: products.length,
        failedTransformations: errors.length,
        errors,
      });
    }

    return products;
  }

  /**
   * Transform HealthKart product to Product interface
   */
  private transformToProductInterface(healthKartProduct: HealthKartProduct): ProductInterface {
    // Validate required fields
    this.validateHealthKartProduct(healthKartProduct);

    // Extract specifications from groups
    const specifications = this.extractSpecifications(healthKartProduct.grps);

    // Build full URL
    const fullUrl = `https://www.healthkart.com${healthKartProduct.urlFragment}`;

    // Transform to our domain interface
    const productData: ProductInterface = {
      id: String(healthKartProduct.id),
      name: this.sanitizeString(healthKartProduct.nm),
      brand: this.sanitizeString(healthKartProduct.brName),
      category: this.sanitizeString(healthKartProduct.catName),
      originalPrice: this.validatePrice(healthKartProduct.mrp, 'originalPrice'),
      currentPrice: this.validatePrice(healthKartProduct.offer_pr, 'currentPrice'),
      discountPercentage: this.validatePercentage(healthKartProduct.discount, 'discount'),
      rating: this.validateRating(healthKartProduct.rating),
      reviewCount: this.validateCount(healthKartProduct.nrvw, 'reviewCount'),
      isInStock: !healthKartProduct.oos && healthKartProduct.ordrEnbld,
      url: fullUrl,
      specifications,
      lastUpdated: new Date(),
    };

    return productData;
  }

  /**
   * Validate HealthKart product data
   */
  private validateHealthKartProduct(product: HealthKartProduct): void {
    if (!product.id || product.id <= 0) {
      throw new Error('Invalid product ID');
    }

    if (!product.nm || product.nm.trim() === '') {
      throw new Error('Product name is required');
    }

    if (!product.brName || product.brName.trim() === '') {
      throw new Error('Brand name is required');
    }

    if (!product.urlFragment || product.urlFragment.trim() === '') {
      throw new Error('URL fragment is required');
    }
  }

  /**
   * Extract product specifications from HealthKart groups
   */
  private extractSpecifications(groups: ProductGroup[]): any {
    const specs: any = {
      weight: '',
      servingSize: '',
      proteinPerServing: '',
      proteinPercentage: 0,
      servingsPerContainer: 0,
      flavor: '',
      pricePerKg: 0,
    };

    try {
      for (const group of groups) {
        if (!group.values || !Array.isArray(group.values)) {
          continue;
        }

        for (const attribute of group.values) {
          this.mapAttributeToSpec(attribute, specs);
        }
      }

      // Post-process and validate
      this.postProcessSpecifications(specs);

      return specs;
    } catch (error) {
      this.logger.warn('Failed to extract specifications, using defaults', {
        error: error instanceof Error ? error.message : String(error),
        groupsCount: groups.length,
      });

      // Return default specifications if extraction fails
      return {
        weight: 'Unknown',
        servingSize: 'Unknown',
        proteinPerServing: '0g',
        proteinPercentage: 0,
        servingsPerContainer: 0,
        flavor: 'Unknown',
        pricePerKg: 0,
      };
    }
  }

  /**
   * Map HealthKart attribute to our specification
   */
  private mapAttributeToSpec(attribute: ProductAttribute, specs: any): void {
    const key = attribute.nm;
    const value = attribute.val;
    const displayName = attribute.dis_nm;

    switch (key) {
      case 'gen-pro-siz':
        specs.weight = this.sanitizeString(value);
        break;
      case 'gen-pro-sev':
        specs.servingSize = this.sanitizeString(value);
        break;
      case 'sn-pro-sev':
        specs.proteinPerServing = this.sanitizeString(value);
        break;
      case 'gen-pro-prctn':
        specs.proteinPercentage = this.parseNumericValue(value);
        break;
      case 'gen-pro-ser-pck':
        specs.servingsPerContainer = this.parseNumericValue(value);
        break;
      case 'gen-sn-flv':
        specs.flavor = this.sanitizeString(value);
        break;
      case 'ppk-pro':
        specs.pricePerKg = this.parseNumericValue(value);
        break;
    }

    // Also check by display name as fallback
    if (!specs.weight && displayName?.toLowerCase().includes('weight')) {
      specs.weight = this.sanitizeString(value);
    }
    if (!specs.flavor && displayName?.toLowerCase().includes('flavour')) {
      specs.flavor = this.sanitizeString(value);
    }
  }

  /**
   * Post-process specifications for consistency
   */
  private postProcessSpecifications(specs: any): void {
    // Ensure numeric fields are valid numbers
    specs.proteinPercentage = this.validatePercentage(specs.proteinPercentage, 'proteinPercentage');
    specs.servingsPerContainer = Math.max(0, Math.floor(specs.servingsPerContainer));
    specs.pricePerKg = Math.max(0, specs.pricePerKg);

    // Ensure string fields are not empty
    if (!specs.weight) specs.weight = 'Unknown';
    if (!specs.servingSize) specs.servingSize = 'Unknown';
    if (!specs.proteinPerServing) specs.proteinPerServing = '0g';
    if (!specs.flavor) specs.flavor = 'Unknown';
  }

  /**
   * Validate and sanitize price values
   */
  private validatePrice(price: number, fieldName: string): number {
    if (typeof price !== 'number' || isNaN(price) || price < 0) {
      throw new Error(`Invalid ${fieldName}: ${price}`);
    }
    return Math.round(price * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Validate percentage values
   */
  private validatePercentage(percentage: number, _fieldName: string): number {
    if (typeof percentage !== 'number' || isNaN(percentage)) {
      return 0;
    }
    return Math.max(0, Math.min(100, percentage));
  }

  /**
   * Validate rating values
   */
  private validateRating(rating: number): number {
    if (typeof rating !== 'number' || isNaN(rating)) {
      return 0;
    }
    return Math.max(0, Math.min(5, rating));
  }

  /**
   * Validate count values
   */
  private validateCount(count: number, _fieldName: string): number {
    if (typeof count !== 'number' || isNaN(count) || count < 0) {
      return 0;
    }
    return Math.floor(count);
  }

  /**
   * Parse numeric value from string or number
   */
  private parseNumericValue(value: string | number): number {
    if (typeof value === 'number') {
      return isNaN(value) ? 0 : value;
    }

    if (typeof value === 'string') {
      // Remove common units and parse
      const cleanValue = value.replace(/[^\d.]/g, '');
      const parsed = parseFloat(cleanValue);
      return isNaN(parsed) ? 0 : parsed;
    }

    return 0;
  }

  /**
   * Sanitize string values
   */
  private sanitizeString(value: string): string {
    if (typeof value !== 'string') {
      return String(value || '').trim();
    }
    return value.trim();
  }

  /**
   * Get transformation statistics
   */
  public getTransformationStats(
    healthKartProducts: HealthKartProduct[],
    transformedProducts: Product[]
  ): {
    totalInput: number;
    successfulTransformations: number;
    failedTransformations: number;
    successRate: number;
  } {
    const totalInput = healthKartProducts.length;
    const successfulTransformations = transformedProducts.length;
    const failedTransformations = totalInput - successfulTransformations;
    const successRate = totalInput > 0 ? (successfulTransformations / totalInput) * 100 : 0;

    return {
      totalInput,
      successfulTransformations,
      failedTransformations,
      successRate: Math.round(successRate * 100) / 100,
    };
  }
} 
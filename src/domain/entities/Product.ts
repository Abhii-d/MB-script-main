/**
 * Product domain entity
 * Following clean architecture: Domain entities contain business logic
 */

import { Product as ProductInterface, ProductSpecifications } from '../../shared/types/index.js';

export class Product {
  private constructor(
    private readonly _id: string,
    private readonly _name: string,
    private readonly _brand: string,
    private readonly _category: string,
    private _originalPrice: number,
    private _currentPrice: number,
    private _discountPercentage: number,
    private readonly _rating: number,
    private readonly _reviewCount: number,
    private readonly _isInStock: boolean,
    private readonly _url: string,
    private readonly _specifications: ProductSpecifications,
    private _lastUpdated: Date
  ) {}

  /**
   * Factory method to create a Product instance
   */
  public static create(data: ProductInterface): Product {
    Product.validate(data);
    
    return new Product(
      data.id,
      data.name,
      data.brand,
      data.category,
      data.originalPrice,
      data.currentPrice,
      data.discountPercentage,
      data.rating,
      data.reviewCount,
      data.isInStock,
      data.url,
      data.specifications,
      data.lastUpdated
    );
  }

  /**
   * Validates product data
   */
  private static validate(data: ProductInterface): void {
    if (!data.id || data.id.trim() === '') {
      throw new Error('Product ID is required');
    }

    if (!data.name || data.name.trim() === '') {
      throw new Error('Product name is required');
    }

    if (!data.brand || data.brand.trim() === '') {
      throw new Error('Product brand is required');
    }

    if (data.originalPrice < 0) {
      throw new Error('Original price cannot be negative');
    }

    if (data.currentPrice < 0) {
      throw new Error('Current price cannot be negative');
    }

    if (data.discountPercentage < 0 || data.discountPercentage > 100) {
      throw new Error('Discount percentage must be between 0 and 100');
    }

    if (data.rating < 0 || data.rating > 5) {
      throw new Error('Rating must be between 0 and 5');
    }

    if (data.reviewCount < 0) {
      throw new Error('Review count cannot be negative');
    }
  }

  // Getters
  public get id(): string {
    return this._id;
  }

  public get name(): string {
    return this._name;
  }

  public get brand(): string {
    return this._brand;
  }

  public get category(): string {
    return this._category;
  }

  public get originalPrice(): number {
    return this._originalPrice;
  }

  public get currentPrice(): number {
    return this._currentPrice;
  }

  public get discountPercentage(): number {
    return this._discountPercentage;
  }

  public get rating(): number {
    return this._rating;
  }

  public get reviewCount(): number {
    return this._reviewCount;
  }

  public get isInStock(): boolean {
    return this._isInStock;
  }

  public get url(): string {
    return this._url;
  }

  public get specifications(): ProductSpecifications {
    return { ...this._specifications };
  }

  public get lastUpdated(): Date {
    return new Date(this._lastUpdated);
  }

  /**
   * Business logic: Calculate savings amount
   */
  public getSavingsAmount(): number {
    return this._originalPrice - this._currentPrice;
  }

  /**
   * Business logic: Calculate actual discount percentage from prices
   */
  public getCalculatedDiscountPercentage(): number {
    if (this._originalPrice === 0) return 0;
    return ((this._originalPrice - this._currentPrice) / this._originalPrice) * 100;
  }

  /**
   * Business logic: Check if discount is significant (above threshold)
   */
  public hasSignificantDiscount(threshold: number): boolean {
    return this._discountPercentage >= threshold;
  }

  /**
   * Business logic: Check if product has good rating
   */
  public hasGoodRating(minRating: number): boolean {
    return this._rating >= minRating;
  }

  /**
   * Business logic: Check if product has sufficient reviews
   */
  public hasSufficientReviews(minReviews: number): boolean {
    return this._reviewCount >= minReviews;
  }

  /**
   * Business logic: Calculate price per gram of protein
   */
  public getPricePerGramProtein(): number {
    const proteinPerServing = parseFloat(this._specifications.proteinPerServing);
    const servingsPerContainer = this._specifications.servingsPerContainer;
    
    if (isNaN(proteinPerServing) || servingsPerContainer === 0) {
      return 0;
    }
    
    const totalProtein = proteinPerServing * servingsPerContainer;
    return this._currentPrice / totalProtein;
  }

  /**
   * Business logic: Check if product meets alert criteria
   */
  public meetsAlertCriteria(criteria: {
    minDiscount: number;
    maxPrice?: number;
    minRating?: number;
    minReviews?: number;
    preferredBrands?: string[];
  }): boolean {
    // Check discount threshold
    if (!this.hasSignificantDiscount(criteria.minDiscount)) {
      return false;
    }

    // Check max price
    if (criteria.maxPrice && this._currentPrice > criteria.maxPrice) {
      return false;
    }

    // Check minimum rating
    if (criteria.minRating && !this.hasGoodRating(criteria.minRating)) {
      return false;
    }

    // Check minimum reviews
    if (criteria.minReviews && !this.hasSufficientReviews(criteria.minReviews)) {
      return false;
    }

    // Check preferred brands
    if (criteria.preferredBrands && criteria.preferredBrands.length > 0) {
      const brandMatches = criteria.preferredBrands.some(brand => 
        this._brand.toLowerCase().includes(brand.toLowerCase())
      );
      if (!brandMatches) {
        return false;
      }
    }

    // Must be in stock
    if (!this._isInStock) {
      return false;
    }

    return true;
  }

  /**
   * Business logic: Update pricing information
   */
  public updatePricing(newCurrentPrice: number, newDiscountPercentage: number): Product {
    Product.validatePricing(newCurrentPrice, newDiscountPercentage);
    
    return new Product(
      this._id,
      this._name,
      this._brand,
      this._category,
      this._originalPrice,
      newCurrentPrice,
      newDiscountPercentage,
      this._rating,
      this._reviewCount,
      this._isInStock,
      this._url,
      this._specifications,
      new Date()
    );
  }

  /**
   * Validates pricing data
   */
  private static validatePricing(currentPrice: number, discountPercentage: number): void {
    if (currentPrice < 0) {
      throw new Error('Current price cannot be negative');
    }

    if (discountPercentage < 0 || discountPercentage > 100) {
      throw new Error('Discount percentage must be between 0 and 100');
    }
  }

  /**
   * Convert to plain object for serialization
   */
  public toJSON(): ProductInterface {
    return {
      id: this._id,
      name: this._name,
      brand: this._brand,
      category: this._category,
      originalPrice: this._originalPrice,
      currentPrice: this._currentPrice,
      discountPercentage: this._discountPercentage,
      rating: this._rating,
      reviewCount: this._reviewCount,
      isInStock: this._isInStock,
      url: this._url,
      specifications: { ...this._specifications },
      lastUpdated: new Date(this._lastUpdated),
    };
  }

  /**
   * Create a formatted display name
   */
  public getDisplayName(): string {
    return `${this._brand} ${this._name}`;
  }

  /**
   * Get short description for alerts
   */
  public getShortDescription(): string {
    const specs = this._specifications;
    return `${this.getDisplayName()} - ${specs.weight} (${specs.proteinPerServing} protein/serving)`;
  }
} 
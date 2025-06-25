/**
 * Core types and interfaces for the MB Script project
 */

// HealthKart API Response Types
export interface HealthKartApiResponse {
  results: {
    exception: boolean;
    total_variants: number;
    perPage: number;
    pageNo: number;
    variants: HealthKartProduct[];
  };
  statusCode: number;
}

export interface HealthKartProduct {
  id: number;
  nm: string; // Product name
  brName: string; // Brand name
  spName: string; // Supplement name
  mrp: number; // Maximum retail price
  offer_pr: number; // Offer price
  discount: number; // Discount percentage
  rating: number;
  nrvw: number; // Number of reviews
  ttl_rtng: number; // Total ratings
  oos: boolean; // Out of stock
  ordrEnbld: boolean; // Order enabled
  catName: string; // Category name
  goal: string; // Fitness goal
  urlFragment: string; // Product URL fragment
  grps: ProductGroup[]; // Product specifications
  activeQuantityLeft: number;
  vendorName: string;
  secondary_category: string;
}

export interface ProductGroup {
  dis_nm: string; // Display name
  nm: string; // Name
  do: number; // Display order
  type: number | null;
  values: ProductAttribute[];
}

export interface ProductAttribute {
  val: string; // Value
  dis_nm: string; // Display name
  nm: string; // Name
  valType: number;
  unt: string | null; // Unit
  do: number; // Display order
  mandatory: boolean;
}

// Domain Types
export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  originalPrice: number;
  currentPrice: number;
  discountPercentage: number;
  rating: number;
  reviewCount: number;
  isInStock: boolean;
  url: string;
  specifications: ProductSpecifications;
  lastUpdated: Date;
}

export interface ProductSpecifications {
  weight: string;
  servingSize: string;
  proteinPerServing: string;
  proteinPercentage: number;
  servingsPerContainer: number;
  flavor: string;
  pricePerKg: number;
}

export interface ProductFilter {
  minDiscount: number;
  maxPrice?: number;
  minRating?: number;
  brands?: string[];
  categories?: string[];
  inStockOnly: boolean;
  minReviews?: number;
}

export interface AlertConfiguration {
  discountThreshold: number;
  priceDropThreshold: number;
  brands: string[];
  categories: string[];
  maxPrice: number;
  minRating: number;
}



// Configuration Types
export interface AppConfig {
  healthkart: {
    baseUrl: string;
    categoryCodes: Record<string, string>;
    requestDelayMs: number;
    maxRetries: number;
  };
  telegram: {
    botToken: string;
    chatId: string;
  };
  monitoring: {
    intervalMinutes: number;
    alertConfig: AlertConfiguration;
  };
  logging: {
    level: string;
    filePath: string;
  };
}

// Utility Types
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogContext {
  [key: string]: unknown;
}

export interface ApiRequestOptions {
  timeout: number;
  retries: number;
  retryDelay: number;
} 
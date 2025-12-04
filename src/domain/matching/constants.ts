/**
 * Influencer Matching Algorithm Constants
 * 
 * These values control the scoring behavior of the matching algorithm.
 * Modify these to tune how influencers are ranked and selected.
 */

import type { MatchingConfig, AvgRange } from './types';

/**
 * Default matching configuration.
 * Content type weights are additive, reach score is computed separately.
 * Max possible score = foodReviewsWeight (40) + maxReachScore (60) = 100
 */
export const DEFAULT_MATCHING_CONFIG: MatchingConfig = {
  // Content type scoring (max 40 points)
  foodReviewsWeight: 40,
  lifestyleWeight: 15,
  travelWeight: 5,
  
  // Reach scoring (max 60 points)
  maxReachScore: 60,
  
  // Hospitality bonus
  hospitalityBonusSlots: 5,
};

/**
 * Maps the avg_views enum ranges to approximate numeric values.
 * These are midpoint estimates for each range.
 */
export const VIEWS_RANGE_TO_VALUE: Record<AvgRange, number> = {
  '0-10k': 5000,
  '10k-50k': 30000,
  '50k-100k': 75000,
  '100k-500k': 300000,
  '500k+': 750000,
};

/**
 * Default views value when no data is available.
 */
export const DEFAULT_VIEWS_VALUE = 5000;

/**
 * Content type keywords for scoring.
 * Used to identify content type from free-form strings.
 */
export const CONTENT_TYPE_KEYWORDS = {
  food: ['food', 'food_reviews', 'طعام', 'مراجعات', 'أكل', 'مطاعم'],
  lifestyle: ['lifestyle', 'نمط حياة', 'لايف ستايل'],
  travel: ['travel', 'سفر', 'سياحة'],
} as const;

/**
 * City name normalizations for Arabic cities.
 * Maps common variations to canonical names.
 */
export const CITY_NORMALIZATIONS: Record<string, string[]> = {
  'الرياض': ['الرياض', 'رياض', 'Riyadh', 'riyadh'],
  'جدة': ['جدة', 'جده', 'Jeddah', 'jeddah', 'Jidda'],
  'مكة المكرمة': ['مكة المكرمة', 'مكة', 'مكه', 'Mecca', 'mecca', 'Makkah'],
  'المدينة المنورة': ['المدينة المنورة', 'المدينة', 'المدينه', 'Medina', 'medina', 'Madinah'],
  'الدمام': ['الدمام', 'دمام', 'Dammam', 'dammam'],
  'الخبر': ['الخبر', 'خبر', 'Khobar', 'khobar', 'Al Khobar'],
  'الطائف': ['الطائف', 'طائف', 'Taif', 'taif'],
  'بريدة': ['بريدة', 'بريده', 'Buraydah', 'buraydah'],
  'تبوك': ['تبوك', 'Tabuk', 'tabuk'],
  'خميس مشيط': ['خميس مشيط', 'خميس', 'Khamis Mushait', 'khamis mushait'],
  'الهفوف': ['الهفوف', 'هفوف', 'Hofuf', 'hofuf'],
  'حائل': ['حائل', 'حايل', 'Hail', 'hail'],
  'نجران': ['نجران', 'Najran', 'najran'],
  'الجبيل': ['الجبيل', 'جبيل', 'Jubail', 'jubail'],
  'ينبع': ['ينبع', 'Yanbu', 'yanbu'],
  'أبها': ['أبها', 'ابها', 'Abha', 'abha'],
  'عرعر': ['عرعر', 'Arar', 'arar'],
  'سكاكا': ['سكاكا', 'Sakaka', 'sakaka'],
  'جازان': ['جازان', 'جيزان', 'Jazan', 'jazan', 'Jizan'],
  'القطيف': ['القطيف', 'قطيف', 'Qatif', 'qatif'],
};

/**
 * Formats a numeric view count into a human-readable string.
 * @param views - Number of views
 * @returns Formatted string like "50K" or "1.2M"
 */
export function formatViewsCount(views: number | null | undefined): string {
  if (!views || views <= 0) return '—';
  
  if (views >= 1_000_000) {
    return `${(views / 1_000_000).toFixed(1)}M`;
  }
  if (views >= 1_000) {
    return `${Math.round(views / 1_000)}K`;
  }
  return views.toString();
}

/**
 * Converts an avg_views enum to a numeric value.
 * Falls back to avg_views_val if provided, otherwise uses enum mapping.
 */
export function getNumericViews(
  avgViewsEnum: AvgRange | null | undefined,
  avgViewsVal: number | null | undefined
): number {
  // Prefer direct numeric value if available and valid
  if (avgViewsVal && avgViewsVal > 0) {
    return avgViewsVal;
  }
  
  // Otherwise convert enum to numeric value
  if (avgViewsEnum && avgViewsEnum in VIEWS_RANGE_TO_VALUE) {
    return VIEWS_RANGE_TO_VALUE[avgViewsEnum];
  }
  
  return DEFAULT_VIEWS_VALUE;
}

/**
 * Normalizes a city name to enable matching across variations.
 * @param city - City name in any format
 * @returns Canonical Arabic city name, or original if not found
 */
export function normalizeCity(city: string): string {
  const lowerCity = city.toLowerCase().trim();
  
  for (const [canonical, variations] of Object.entries(CITY_NORMALIZATIONS)) {
    if (variations.some(v => v.toLowerCase() === lowerCity)) {
      return canonical;
    }
  }
  
  return city.trim();
}

/**
 * Checks if two cities match (accounting for variations).
 */
export function citiesMatch(city1: string, city2: string): boolean {
  return normalizeCity(city1) === normalizeCity(city2);
}


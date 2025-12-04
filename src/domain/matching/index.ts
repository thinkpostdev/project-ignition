/**
 * Influencer Matching Module
 * 
 * This module provides types, constants, and utilities for the
 * influencer matching algorithm used in campaign creation.
 */

// Types
export type {
  MatchingConfig,
  InfluencerForMatching,
  MatchedInfluencer,
  CampaignInput,
  MatchingSummary,
  MatchingResponse,
  CampaignInfluencerSuggestion,
  InfluencerCategory,
  AvgRange,
} from './types';

// Constants & Utilities
export {
  DEFAULT_MATCHING_CONFIG,
  VIEWS_RANGE_TO_VALUE,
  DEFAULT_VIEWS_VALUE,
  CONTENT_TYPE_KEYWORDS,
  CITY_NORMALIZATIONS,
  formatViewsCount,
  getNumericViews,
  normalizeCity,
  citiesMatch,
} from './constants';


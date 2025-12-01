// utils/locationUtils.ts
import { Location } from "../types/location";

export interface DeliveryTimeframe {
  min: string;
  max: string;
  description: string;
  zone: "same_area" | "same_city" | "same_state" | "different_state";
}

/**
 * Calculate delivery timeframe based on buyer and seller locations
 */
export function calculateDeliveryTimeframe(
  buyerLocation: Location | undefined,
  sellerLocation: Location | undefined
): DeliveryTimeframe {
  // Default fallback if locations are not available
  if (!buyerLocation || !sellerLocation) {
    return {
      min: "24 hours",
      max: "5 days",
      description: "Standard delivery timeframe",
      zone: "different_state",
    };
  }

  // Normalize strings for comparison (case-insensitive, trim whitespace)
  const normalizeString = (str: string) => str.toLowerCase().trim();

  const buyerState = normalizeString(buyerLocation.state);
  const buyerCity = normalizeString(buyerLocation.city);
  const buyerArea = normalizeString(buyerLocation.area);

  const sellerState = normalizeString(sellerLocation.state);
  const sellerCity = normalizeString(sellerLocation.city);
  const sellerArea = normalizeString(sellerLocation.area);

  // Same Area (most precise match)
  if (
    buyerState === sellerState &&
    buyerCity === sellerCity &&
    buyerArea === sellerArea
  ) {
    return {
      min: "30 minutes",
      max: "3 hours",
      description: "Express delivery - Same area",
      zone: "same_area",
    };
  }

  // Same City (different areas)
  if (buyerState === sellerState && buyerCity === sellerCity) {
    return {
      min: "1 hour",
      max: "6 hours",
      description: "Fast delivery - Within city",
      zone: "same_city",
    };
  }

  // Same State (different cities)
  if (buyerState === sellerState) {
    return {
      min: "12 hours",
      max: "48 hours",
      description: "Standard delivery - Within state",
      zone: "same_state",
    };
  }

  // Different State
  return {
    min: "24 hours",
    max: "5 days",
    description: "Interstate delivery",
    zone: "different_state",
  };
}

/**
 * Get a human-readable delivery estimate string
 */
export function getDeliveryEstimate(
  buyerLocation: Location | undefined,
  sellerLocation: Location | undefined
): string {
  const timeframe = calculateDeliveryTimeframe(buyerLocation, sellerLocation);
  return `${timeframe.min} - ${timeframe.max}`;
}

/**
 * Get full delivery description with terms
 */
export function getDeliveryDescription(
  buyerLocation: Location | undefined,
  sellerLocation: Location | undefined
): string {
  const timeframe = calculateDeliveryTimeframe(buyerLocation, sellerLocation);
  return `Expected: ${timeframe.min} - ${timeframe.max} (${timeframe.description})`;
}

/**
 * Check if delivery is express (same area or city)
 */
export function isExpressDelivery(
  buyerLocation: Location | undefined,
  sellerLocation: Location | undefined
): boolean {
  const timeframe = calculateDeliveryTimeframe(buyerLocation, sellerLocation);
  return timeframe.zone === "same_area" || timeframe.zone === "same_city";
}

/**
 * Get delivery icon based on timeframe
 */
export function getDeliveryIcon(
  buyerLocation: Location | undefined,
  sellerLocation: Location | undefined
): "zap" | "truck" | "package" | "map" {
  const timeframe = calculateDeliveryTimeframe(buyerLocation, sellerLocation);
  
  switch (timeframe.zone) {
    case "same_area":
      return "zap"; // Lightning for express
    case "same_city":
      return "truck"; // Truck for fast
    case "same_state":
      return "package"; // Package for standard
    case "different_state":
      return "map"; // Map for interstate
    default:
      return "package";
  }
}
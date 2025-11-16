import type { RiskPreference, TravelMode } from "@/lib/types";

// Mocked durations in minutes for each part of the trip. These are
// intentionally simple and transparent so the demo is easy to explain.

export const travelMinutesByMode: Record<TravelMode, number> = {
  car: 35,
  taxi: 35,
  rideshare: 40,
  transit: 50,
};

export const checkInMinutesProfile = {
  domesticNoBags: 5,
  domesticWithBags: 15,
  international: 25,
};

export const securityMinutesProfile = {
  standard: 25,
  priority: 12,
};

export const walkToGateMinutes = 10;

export const bufferMinutesByRiskPreference: Record<RiskPreference, number> = {
  low_wait: 5,
  balanced: 15,
  very_safe: 30,
};


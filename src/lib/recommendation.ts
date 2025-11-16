import {
  bufferMinutesByRiskPreference,
  checkInMinutesProfile,
  securityMinutesProfile,
  travelMinutesByMode,
  walkToGateMinutes,
} from "@/data/timeProfiles";
import type {
  Flight,
  Recommendation,
  RecommendationSegment,
  RiskLevel,
  TripOptions,
} from "@/lib/types";
import { DEMO_MODE } from "@/config/demo";

export const BOARDING_MINUTES_BEFORE_DEPARTURE = 30;

function minutesToMs(minutes: number): number {
  return minutes * 60 * 1000;
}

function toIsoString(date: Date): string {
  return date.toISOString();
}

function getCheckInMinutes(
  flight: Flight,
  options: TripOptions,
): number {
  if (flight.isInternational) {
    return checkInMinutesProfile.international;
  }

  if (options.hasCheckedBag) {
    return checkInMinutesProfile.domesticWithBags;
  }

  return checkInMinutesProfile.domesticNoBags;
}

function getSecurityMinutes(options: TripOptions): number {
  return options.hasPrioritySecurity
    ? securityMinutesProfile.priority
    : securityMinutesProfile.standard;
}

function getBufferMinutes(options: TripOptions): number {
  return bufferMinutesByRiskPreference[options.riskPreference];
}

export function mapBufferToRisk(
  actualBufferMinutes: number,
  targetBufferMinutes: number,
): RiskLevel {
  const delta = actualBufferMinutes - targetBufferMinutes;

  if (DEMO_MODE) {
    // Demo-safe mapping: never show "high"
    if (actualBufferMinutes <= 0) {
      return "medium";
    }
    if (delta < -10) {
      return "medium";
    }
    if (delta < 10) {
      return "low";
    }
    return "very_low";
  }

  // Non-demo / realistic mapping
  if (actualBufferMinutes <= 0) return "high";
  if (delta < -10) return "medium";
  if (delta < 10) return "low";
  return "very_low";
}

function buildSegments(args: {
  travelToAirportMinutes: number;
  checkInMinutes: number;
  securityMinutes: number;
  walkMinutes: number;
  bufferMinutes: number;
}): RecommendationSegment[] {
  const {
    travelToAirportMinutes,
    checkInMinutes,
    securityMinutes,
    walkMinutes,
    bufferMinutes,
  } = args;

  return [
    {
      label: "Travel to airport",
      minutes: travelToAirportMinutes,
    },
    {
      label: "Check-in / bag drop",
      minutes: checkInMinutes,
    },
    {
      label: "Security",
      minutes: securityMinutes,
    },
    {
      label: "Walk to gate",
      minutes: walkMinutes,
    },
    {
      label: "Buffer",
      minutes: bufferMinutes,
    },
  ];
}

export function getRecommendation(
  flight: Flight,
  options: TripOptions,
): Recommendation {
  const departureTime = new Date(flight.departureTime);

  // 1. Boarding time: simple fixed offset before departure.
  const boardingTime = new Date(
    departureTime.getTime() -
      minutesToMs(BOARDING_MINUTES_BEFORE_DEPARTURE),
  );

  // 2. Travel to airport based on travel mode.
  const travelToAirportMinutes = travelMinutesByMode[
    options.travelMode
  ];

  // 3. Airport process times.
  const checkInMinutes = getCheckInMinutes(flight, options);
  const securityMinutes = getSecurityMinutes(options);
  const walkMinutes = walkToGateMinutes;

  // 4. Risk preference buffer.
  const targetBufferMinutes = getBufferMinutes(options);

  // 5. Work backwards from boarding time.
  const totalProcessMinutes =
    checkInMinutes + securityMinutes + walkMinutes + targetBufferMinutes;

  const arrivalAtAirportCurbTime = new Date(
    boardingTime.getTime() - minutesToMs(totalProcessMinutes),
  );

  const leaveTime = new Date(
    arrivalAtAirportCurbTime.getTime() -
      minutesToMs(travelToAirportMinutes),
  );

  // 6. Gate arrival, risk level, and segments.
  const expectedGateArrivalTime = new Date(
    boardingTime.getTime() - minutesToMs(targetBufferMinutes),
  );

  const actualBufferMinutes = targetBufferMinutes;

  const riskLevel = mapBufferToRisk(
    actualBufferMinutes,
    targetBufferMinutes,
  );

  const segments = buildSegments({
    travelToAirportMinutes,
    checkInMinutes,
    securityMinutes,
    walkMinutes,
    bufferMinutes: actualBufferMinutes,
  });

  const recommendation: Recommendation = {
    leaveTime: toIsoString(leaveTime),
    expectedGateArrivalTime: toIsoString(expectedGateArrivalTime),
    boardingTime: toIsoString(boardingTime),
    targetBufferMinutes,
    actualBufferMinutes,
    riskLevel,
    segments,
  };

  return recommendation;
}

export type TravelMode = "car" | "taxi" | "rideshare" | "transit";

export type RiskPreference = "low_wait" | "balanced" | "very_safe";

export type RiskLevel = "very_low" | "low" | "medium" | "high";

export interface Origin {
  id: string;
  label: string;
  address: string;
}

export interface Flight {
  id: string;
  airline: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  terminal: string;
  gate?: string;
  isInternational: boolean;
}

export interface TripOptions {
  originId?: string | null;
  originLabel: string;
  travelMode: TravelMode;
  hasCheckedBag: boolean;
  hasPrioritySecurity: boolean;
  riskPreference: RiskPreference;
}

export interface RecommendationSegment {
  label: string;
  minutes: number;
}

export interface Recommendation {
  leaveTime: string;
  expectedGateArrivalTime: string;
  boardingTime: string;
  targetBufferMinutes: number;
  actualBufferMinutes: number;
  riskLevel: RiskLevel;
  segments: RecommendationSegment[];
}

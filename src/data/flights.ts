import type { Flight } from "@/lib/types";

// Simple mocked flights for a single departure airport (ORD) with a mix
// of domestic and international routes. Times are fixed ISO strings so
// the demo stays deterministic.

export const flights: Flight[] = [
  {
    id: "ord-lax-101",
    airline: "United",
    flightNumber: "UA 101",
    departureAirport: "ORD",
    arrivalAirport: "LAX",
    departureTime: "2025-11-15T18:30:00.000Z",
    terminal: "1",
    gate: "B12",
    isInternational: false,
  },
  {
    id: "ord-sfo-202",
    airline: "American",
    flightNumber: "AA 202",
    departureAirport: "ORD",
    arrivalAirport: "SFO",
    departureTime: "2025-11-15T20:00:00.000Z",
    terminal: "3",
    gate: "H4",
    isInternational: false,
  },
  {
    id: "ord-jfk-303",
    airline: "Delta",
    flightNumber: "DL 303",
    departureAirport: "ORD",
    arrivalAirport: "JFK",
    departureTime: "2025-11-15T22:15:00.000Z",
    terminal: "2",
    gate: "E7",
    isInternational: false,
  },
  {
    id: "ord-lhr-900",
    airline: "British Airways",
    flightNumber: "BA 900",
    departureAirport: "ORD",
    arrivalAirport: "LHR",
    departureTime: "2025-11-16T01:15:00.000Z",
    terminal: "5",
    gate: "M18",
    isInternational: true,
  },
  {
    id: "ord-nrt-700",
    airline: "ANA",
    flightNumber: "NH 700",
    departureAirport: "ORD",
    arrivalAirport: "NRT",
    departureTime: "2025-11-16T03:45:00.000Z",
    terminal: "5",
    gate: "K10",
    isInternational: true,
  },
];

export function getFlightById(id: string | null | undefined): Flight | undefined {
  if (!id) return undefined;
  return flights.find((flight) => flight.id === id);
}


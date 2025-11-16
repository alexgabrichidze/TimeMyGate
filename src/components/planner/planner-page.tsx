"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { flights } from "@/data/flights";
import { origins } from "@/data/origins";
import { bufferMinutesByRiskPreference } from "@/data/timeProfiles";
import type {
  RiskPreference,
  TravelMode,
  TripOptions,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const travelModeOptions: { value: TravelMode; label: string }[] = [
  { value: "car", label: "Car" },
  { value: "taxi", label: "Taxi" },
  { value: "rideshare", label: "Rideshare" },
  { value: "transit", label: "Public transit" },
];

const riskOptions: { value: RiskPreference; label: string; description: string }[] =
  [
    {
      value: "low_wait",
      label: "Less waiting",
      description: "Cut it closer and spend less time at the gate.",
    },
    {
      value: "balanced",
      label: "Balanced",
      description: "A comfortable buffer without too much extra waiting.",
    },
    {
      value: "very_safe",
      label: "Very safe",
      description: "Arrive early and keep risk of delays low.",
    },
  ];

const arrivalCityByCode: Record<string, string> = {
  LAX: "Los Angeles",
  SFO: "San Francisco",
  JFK: "New York",
  LHR: "London",
  NRT: "Tokyo",
};

export function PlannerPage() {
  return (
    <div className="flex min-h-screen justify-center bg-background px-4 py-10">
      <div className="flex w-full max-w-3xl flex-col gap-4">
        <p className="text-xs text-muted-foreground">
          Plan your curb-to-gate timing so you&apos;re not too early and
          not too late.
        </p>
        <PlannerCard />
      </div>
    </div>
  );
}

function PlannerCard() {
  const router = useRouter();
  const [originQuery, setOriginQuery] = useState("");
  const [selectedOriginId, setSelectedOriginId] =
    useState<string | null>(null);
  const [travelMode, setTravelMode] = useState<TravelMode>("car");
  const [hasCheckedBag, setHasCheckedBag] = useState(true);
  const [hasPrioritySecurity, setHasPrioritySecurity] = useState(false);
  const [isInternational, setIsInternational] = useState(false);
  const [riskPreference, setRiskPreference] =
    useState<RiskPreference>("balanced");
  const [selectedFlightId, setSelectedFlightId] = useState<string | undefined>(
    flights[0]?.id,
  );
  const [flightSearchQuery, setFlightSearchQuery] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isFlightDialogOpen, setIsFlightDialogOpen] = useState(false);

  const selectedFlight = flights.find(
    (flight) => flight.id === selectedFlightId,
  );

  const riskIndex =
    riskOptions.findIndex(
      (option) => option.value === riskPreference,
    ) ?? 1;
  const currentRisk =
    riskOptions[riskIndex] ??
    riskOptions.find((option) => option.value === "balanced") ??
    riskOptions[1];

  const riskMinutes =
    bufferMinutesByRiskPreference[riskPreference] ??
    bufferMinutesByRiskPreference.balanced;

  const normalizedFlightQuery = flightSearchQuery.trim().toLowerCase();
  const filteredFlights =
    normalizedFlightQuery.length >= 2
      ? flights.filter((flight) => {
          const flightNumberRaw = flight.flightNumber.toLowerCase();
          const flightNumberCollapsed = flight.flightNumber
            .replace(/\s+/g, "")
            .toLowerCase();
          const airlineName = flight.airline.toLowerCase();
          const airlineCode =
            flight.flightNumber.split(" ")[0]?.toLowerCase() ?? "";
          const arrivalCode = flight.arrivalAirport.toLowerCase();
          const arrivalCity =
            arrivalCityByCode[flight.arrivalAirport]?.toLowerCase() ??
            "";

          const haystack = [
            flightNumberRaw,
            flightNumberCollapsed,
            airlineName,
            airlineCode,
            arrivalCode,
            arrivalCity,
          ].join(" ");

          return haystack.includes(normalizedFlightQuery);
        })
      : flights;

  const showNoMatchingFlights =
    normalizedFlightQuery.length >= 2 &&
    filteredFlights.length === 0;

  function handleCalculateClick() {
    if (!selectedFlight) {
      setFormError("Select a flight to get a leave time.");
      return;
    }

    const tripOptions: TripOptions = {
      originId: selectedOriginId,
      originLabel: originQuery.trim() || "Home",
      travelMode,
      hasCheckedBag,
      hasPrioritySecurity,
      riskPreference,
    };

    const params = new URLSearchParams();
    params.set("flightId", selectedFlight.id);
    params.set("originLabel", tripOptions.originLabel);
    if (tripOptions.originId) {
      params.set("originId", tripOptions.originId);
    }
    params.set("travelMode", tripOptions.travelMode);
    params.set("hasCheckedBag", tripOptions.hasCheckedBag ? "1" : "0");
    params.set(
      "hasPrioritySecurity",
      tripOptions.hasPrioritySecurity ? "1" : "0",
    );
    params.set("riskPreference", tripOptions.riskPreference);
    params.set("intlOverride", isInternational ? "1" : "0");

    setFormError(null);
    router.push(`/result?${params.toString()}`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Airport departure planner</CardTitle>
        <CardDescription>
          Tell us about your trip and we&apos;ll suggest when to leave for
          the airport.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <OriginCombobox
          value={originQuery}
          selectedOriginId={selectedOriginId}
          onValueChange={(value) => {
            setOriginQuery(value);
            const matchingOrigin = origins.find(
              (origin) =>
                origin.label.toLowerCase() === value.toLowerCase(),
            );
            setSelectedOriginId(matchingOrigin?.id ?? null);
          }}
          onSelectOrigin={(originId, label) => {
            setSelectedOriginId(originId);
            setOriginQuery(label);
          }}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="text-sm font-medium">Travel mode</div>
            <Select
              value={travelMode}
              onValueChange={(value: TravelMode) =>
                setTravelMode(value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select how you&apos;re getting there" />
              </SelectTrigger>
              <SelectContent>
                {travelModeOptions.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Flight</div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 text-sm text-muted-foreground">
                {selectedFlight ? (
                  <>
                    <div className="font-medium text-foreground">
                      {selectedFlight.airline}{" "}
                      {selectedFlight.flightNumber}
                    </div>
                    <p>
                      {selectedFlight.departureAirport} →{" "}
                      {selectedFlight.arrivalAirport} ·{" "}
                      {formatTimeShort(selectedFlight.departureTime)} ·{" "}
                      Terminal {selectedFlight.terminal}
                      {selectedFlight.gate
                        ? `, gate ${selectedFlight.gate}`
                        : ""}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="font-medium text-foreground">
                      No flight selected
                    </div>
                    <p>
                      Choose a flight so we can base timing on the
                      scheduled departure.
                    </p>
                  </>
                )}
              </div>
              <Dialog
                open={isFlightDialogOpen}
                onOpenChange={setIsFlightDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button type="button" size="sm" variant="outline">
                    {selectedFlight ? "Change" : "Select flight"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Select a flight</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>
                      Pick one of today&apos;s sample flights from ORD.
                      We&apos;ll use its departure time to plan your trip.
                    </p>
                  </div>
                  <div className="mt-4 space-y-3">
                    <Input
                      value={flightSearchQuery}
                      onChange={(event) =>
                        setFlightSearchQuery(event.target.value)
                      }
                      placeholder="Search by flight number, airline, or destination"
                      className="h-9 text-sm"
                    />
                    <div className="space-y-2">
                      {showNoMatchingFlights ? (
                        <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                          No matching flights for that search.
                        </div>
                      ) : (
                        filteredFlights.map((flight) => {
                          const isSelected =
                            flight.id === selectedFlightId;
                          const arrivalCity =
                            arrivalCityByCode[flight.arrivalAirport];

                          return (
                            <button
                              key={flight.id}
                              type="button"
                              onClick={() => {
                                setSelectedFlightId(flight.id);
                                setIsFlightDialogOpen(false);
                                setFlightSearchQuery("");
                              }}
                              className={[
                                "flex w-full flex-col items-start rounded-md border px-3 py-2 text-left text-sm transition-colors",
                                isSelected
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:bg-muted",
                              ].join(" ")}
                            >
                              <div className="flex w-full items-center justify-between gap-2">
                                <div className="font-medium text-foreground">
                                  {flight.airline} {flight.flightNumber}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {formatTimeShort(
                                    flight.departureTime,
                                  )}
                                </span>
                              </div>
                              <div className="mt-1 flex w-full items-center justify-between gap-2 text-xs text-muted-foreground">
                                <div>
                                  {flight.departureAirport} →{" "}
                                  {flight.arrivalAirport}
                                  {arrivalCity
                                    ? ` · ${arrivalCity}`
                                    : ""}{" "}
                                  · Terminal {flight.terminal}
                                  {flight.gate
                                    ? `, gate ${flight.gate}`
                                    : ""}
                                </div>
                                <div className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium">
                                  {flight.isInternational
                                    ? "International"
                                    : "Domestic"}
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-medium">Trip options</div>
          <div className="grid gap-3 sm:grid-cols-3">
            <OptionSwitch
              id="checked-bag"
              label="Checked bag"
              description={
                hasCheckedBag ? "Dropping a checked bag" : "Carry-on only"
              }
              checked={hasCheckedBag}
              onCheckedChange={setHasCheckedBag}
            />
            <OptionSwitch
              id="priority-security"
              label="Security fast track"
              description={
                hasPrioritySecurity
                  ? "Using TSA PreCheck / priority"
                  : "Standard security"
              }
              checked={hasPrioritySecurity}
              onCheckedChange={setHasPrioritySecurity}
            />
            <OptionSwitch
              id="international-flight"
              label="International flight"
              description={
                isInternational
                  ? "Treat as international departure"
                  : "Treat as domestic departure"
              }
              checked={isInternational}
              onCheckedChange={setIsInternational}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-1">
              <div className="text-sm font-medium">Risk preference</div>
              <p className="text-xs text-muted-foreground">
                Choose how much buffer you want before boarding.{" "}
                We&apos;ll adjust the leave time accordingly later.
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs font-medium text-muted-foreground">
                {currentRisk.label}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {currentRisk.description}
              </div>
            </div>
          </div>

          <Slider
            value={[riskIndex]}
            min={0}
            max={riskOptions.length - 1}
            step={1}
            onValueChange={(value) => {
              const index = value[0] ?? 1;
              const option = riskOptions[index];
              if (option) {
                setRiskPreference(option.value);
              }
            }}
          />
          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
            <div className="flex flex-col items-center">
              <span>Less waiting</span>
              <span>
                ~{bufferMinutesByRiskPreference.low_wait} min
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span>Balanced</span>
              <span>
                ~{bufferMinutesByRiskPreference.balanced} min
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span>Very safe</span>
              <span>
                ~{bufferMinutesByRiskPreference.very_safe} min
              </span>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 border-t bg-muted/40 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>
            All times here are fixed and illustrative — no live flight or traffic data.
          </p>
          {formError ? (
            <p className="font-medium text-destructive">{formError}</p>
          ) : null}
        </div>
        <div className="flex w-full justify-end sm:w-auto">
          <Button
            type="button"
            onClick={handleCalculateClick}
            className="w-full sm:w-auto"
          >
            Calculate leave time
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

interface OptionSwitchProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}

function OptionSwitch({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: OptionSwitchProps) {
  return (
    <div className="flex h-full items-start justify-between gap-3 rounded-md border px-3 py-2">
      <div className="space-y-1">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        {description ? (
          <p className="text-xs text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="mt-1"
      />
    </div>
  );
}

interface BreakdownRowProps {
  label: string;
  value: string;
}

function BreakdownRow({ label, value }: BreakdownRowProps) {
  return (
    <div className="flex flex-col rounded-md border bg-background px-3 py-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {value}
        </span>
      </div>
    </div>
  );
}

interface OriginComboboxProps {
  value: string;
  selectedOriginId: string | null;
  onValueChange: (value: string) => void;
  onSelectOrigin: (originId: string, label: string) => void;
}

function OriginCombobox({
  value,
  selectedOriginId,
  onValueChange,
  onSelectOrigin,
}: OriginComboboxProps) {
  const [open, setOpen] = useState(false);
  const normalizedQuery = value.trim().toLowerCase();

  const filteredOrigins =
    normalizedQuery.length >= 2
      ? origins.filter((origin) => {
          const haystack =
            `${origin.label} ${origin.address}`.toLowerCase();
          return haystack.includes(normalizedQuery);
        })
      : origins;

  const showEmpty =
    normalizedQuery.length >= 2 && filteredOrigins.length === 0;

  return (
    <div
      className="space-y-2"
      onFocus={() => setOpen(true)}
      onBlur={(event) => {
        const nextFocus = event.relatedTarget as HTMLElement | null;
        if (!nextFocus || !event.currentTarget.contains(nextFocus)) {
          setOpen(false);
        }
      }}
    >
      <div className="text-sm font-medium">Leaving from</div>
              <div className="rounded-md border">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Home, Office, or a short address"
            value={value}
            onValueChange={(next) => {
              onValueChange(next);
              setOpen(true);
            }}
          />
          {open && (
            <CommandList>
              {showEmpty ? (
                <CommandEmpty>No suggestions for that input</CommandEmpty>
              ) : (
                <CommandGroup heading="Suggested places">
                  {filteredOrigins.map((origin) => (
                    <CommandItem
                      key={origin.id}
                      value={`${origin.label} ${origin.address}`}
                      onMouseDown={(event) => event.preventDefault()}
                      onSelect={() => {
                        onSelectOrigin(origin.id, origin.label);
                        setOpen(false);
                      }}
                      className={
                        origin.id === selectedOriginId
                          ? "bg-primary/5"
                          : undefined
                      }
                    >
                      <div className="flex flex-col items-start">
                        <span className="text-xs font-medium">
                          {origin.label}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {origin.address}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          )}
        </Command>
      </div>
      <p className="text-xs text-muted-foreground">
        This is just a label for now — no live mapping or traffic.
      </p>
    </div>
  );
}

function formatTimeShort(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

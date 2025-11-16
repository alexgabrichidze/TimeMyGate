"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { flights } from "@/data/flights";
import {
  BOARDING_MINUTES_BEFORE_DEPARTURE,
  getRecommendation,
  mapBufferToRisk,
} from "@/lib/recommendation";
import { TripTimeline } from "@/components/result/trip-timeline";
import type {
  Recommendation,
  RiskPreference,
  TravelMode,
  TripOptions,
} from "@/lib/types";
import type {
  StepId,
  StepState,
  StepStatus,
} from "@/lib/timeline-types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEMO_MODE } from "@/config/demo";

type WhereNow =
  | "home"
  | "in_transit"
  | "check_in"
  | "security"
  | "gate";

type TripStatus = "planning" | "in_progress" | "completed";

export default function ResultPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    flight,
    tripOptions,
    intlOverride,
  } = useMemo(() => parseParams(searchParams), [searchParams]);

  const [baseRecommendation, setBaseRecommendation] =
    useState<Recommendation | null>(null);
  const [recommendation, setRecommendation] =
    useState<Recommendation | null>(null);
  const [stepStates, setStepStates] = useState<StepState[] | null>(null);
  const [whereNow, setWhereNow] = useState<WhereNow>("home");
  const [currentTime, setCurrentTime] = useState<string>("");
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [tripStatus, setTripStatus] = useState<TripStatus>("planning");

  useEffect(() => {
    if (!flight || !tripOptions) return;
    const effectiveFlight = {
      ...flight,
      isInternational: flight.isInternational || intlOverride,
    };
    const rec = getRecommendation(effectiveFlight, tripOptions);
    setBaseRecommendation(rec);
    setRecommendation(rec);

    const durations = getDurationsFromRecommendation(rec);
    const originalTimeline = buildTimelineFromLeaveTime(
      new Date(rec.leaveTime),
      durations,
    );

    const initialStepStates: StepState[] = originalTimeline.map(
      (step) => ({
        id: step.id,
        plannedTime: step.time.toISOString(),
        status: "planned",
      }),
    );
    setStepStates(initialStepStates);

    setTripStatus("in_progress");
  }, [flight, tripOptions, intlOverride]);

  useEffect(() => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    setCurrentTime(`${hh}:${mm}`);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setIsInitialLoading(false), 500);
    return () => clearTimeout(id);
  }, []);

  if (!flight || !tripOptions) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Missing trip details</CardTitle>
            <CardDescription>
              We couldn&apos;t find a flight and trip configuration in
              the URL.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/")}
            >
              Back to planner
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (
    isInitialLoading ||
    !baseRecommendation ||
    !recommendation ||
    !stepStates
  ) {
    return (
      <div className="flex min-h-screen justify-center bg-background px-4 py-10">
        <div className="flex w-full max-w-3xl flex-col gap-6">
          <Card className="animate-pulse">
            <CardHeader className="space-y-4">
              <div className="h-3 w-32 rounded bg-muted" />
              <div className="h-9 w-40 rounded bg-muted" />
              <div className="h-3 w-56 rounded bg-muted" />
              <p className="text-xs text-muted-foreground">
                Planning your trip…
              </p>
            </CardHeader>
          </Card>

          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-3 w-28 rounded bg-muted" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-4 w-full rounded bg-muted" />
              <div className="h-4 w-5/6 rounded bg-muted" />
              <div className="h-4 w-2/3 rounded bg-muted" />
            </CardContent>
          </Card>

          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-3 w-40 rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-full rounded bg-muted" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleMarkHere = (stepId: StepId) => {
    if (!recommendation || !stepStates) return;

    const now = new Date();

    if (stepId === "boarding") {
      // End-of-trip behavior: mark everything completed and freeze timeline.
      const completedStates: StepState[] = stepStates.map((state) => ({
        ...state,
        status: "completed",
        actualTime:
          state.id === "boarding"
            ? now.toISOString()
            : state.actualTime,
      }));

      setStepStates(completedStates);
      setTripStatus("completed");
      return;
    }

    const durations = getDurationsFromRecommendation(recommendation);

    const baselineTime =
      getBaselinePlannedTimeForStep(
        stepId,
        baseRecommendation ?? recommendation,
      ) ?? now;

    const rawCheckpointTime = parseTimeToDate(
      currentTime,
      new Date(recommendation.leaveTime),
    );

    const checkpointTime = DEMO_MODE
      ? getDemoCheckpointTime(baselineTime, rawCheckpointTime)
      : rawCheckpointTime ?? now;

    const updatedRec = recalculateFromCheckpoint(
      flight,
      durations,
      recommendation.targetBufferMinutes,
      stepId,
      checkpointTime,
    );

    setRecommendation(updatedRec);

    const updatedDurations = getDurationsFromRecommendation(updatedRec);
    const newTimeline = buildTimelineFromLeaveTime(
      new Date(updatedRec.leaveTime),
      updatedDurations,
    );

    const currentIndex = newTimeline.findIndex(
      (step) => step.id === stepId,
    );

    const newStates: StepState[] = newTimeline.map((step, index) => {
      let status: StepStatus = "upcoming";
      if (index < currentIndex) {
        status = "completed";
      } else if (index === currentIndex) {
        status = "current";
      } else {
        status = "upcoming";
      }

      return {
        id: step.id,
        plannedTime: step.time.toISOString(),
        actualTime:
          index === currentIndex ? now.toISOString() : undefined,
        status,
      };
    });

    setStepStates(newStates);
    setTripStatus("in_progress");
  };

  const leaveTimeLabel = formatTime(new Date(recommendation.leaveTime));
  const gateArrivalLabel = formatTime(
    new Date(recommendation.expectedGateArrivalTime),
  );
  const boardingTimeLabel = formatTime(
    new Date(recommendation.boardingTime),
  );

  const targetBufferMinutes = recommendation.targetBufferMinutes;
  const actualBufferMinutes = recommendation.actualBufferMinutes;

  const { label: riskLabel, badgeClassName: riskBadgeClassName } =
    getRiskBadgeDisplay(recommendation.riskLevel);

  const presetLabel =
    tripOptions.riskPreference === "low_wait"
      ? "Less waiting"
      : tripOptions.riskPreference === "balanced"
        ? "Balanced"
        : "Very safe";

  const completionSummary = `You reached the gate about ${Math.max(
    0,
    Math.round(actualBufferMinutes),
  )} minutes before boarding. That’s well within your ${presetLabel} target.`;

  return (
    <div className="flex min-h-screen justify-center bg-background px-4 py-10">
      <div className="flex w-full max-w-3xl flex-col gap-6">
        {/* Summary card */}
        <Card className={isRecalculating ? "animate-pulse" : ""}>
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Recommended leave time
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-sm text-muted-foreground">
                    Leave at
                  </span>
                  <span className="text-4xl font-semibold tracking-tight">
                    {leaveTimeLabel}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 text-right">
                <span className="text-xs text-muted-foreground">
                  Risk
                </span>
                <Badge
                  variant="outline"
                  className={riskBadgeClassName}
                >
                  {riskLabel}
                </Badge>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              You&apos;ll reach the gate around {gateArrivalLabel}, about{" "}
              {Math.round(actualBufferMinutes)} minutes before boarding at{" "}
              {boardingTimeLabel} for a comfortable, low-stress departure.
            </p>

            <p className="text-xs text-muted-foreground">
              Flight: {flight.airline} {flight.flightNumber} ·{" "}
              {flight.departureAirport} → {flight.arrivalAirport} · Terminal{" "}
              {flight.terminal}
              {flight.gate ? `, gate ${flight.gate}` : ""} ·{" "}
              {flight.isInternational ? "International" : "Domestic"}
            </p>
          </CardHeader>
        </Card>

        {/* Trip timeline */}
        <div className={isRecalculating ? "animate-pulse" : ""}>
          <TripTimeline
            recommendation={recommendation}
            flight={flight}
            options={tripOptions}
            stepStates={stepStates}
            onMarkHere={handleMarkHere}
            tripStatus={tripStatus}
            completionSummary={
              tripStatus === "completed" ? completionSummary : undefined
            }
          />
        </div>

        {/* Running late panel (temporarily not shown) */}

        {/* Back to planner / CTA */}
        <div className="flex justify-end pt-2">
          {tripStatus === "completed" ? (
            <Button
              onClick={() => {
                router.push("/");
              }}
            >
              Plan another trip
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => {
                const params = new URLSearchParams();
                params.set("flightId", flight.id);
                params.set("originLabel", tripOptions.originLabel);
                if (tripOptions.originId) {
                  params.set("originId", tripOptions.originId);
                }
                params.set("travelMode", tripOptions.travelMode);
                params.set(
                  "hasCheckedBag",
                  tripOptions.hasCheckedBag ? "1" : "0",
                );
                params.set(
                  "hasPrioritySecurity",
                  tripOptions.hasPrioritySecurity ? "1" : "0",
                );
                params.set(
                  "riskPreference",
                  tripOptions.riskPreference,
                );
                params.set(
                  "intlOverride",
                  flight.isInternational ? "1" : "0",
                );

                router.push(`/?${params.toString()}`);
              }}
            >
              Back to planner
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function parseParams(searchParams: URLSearchParams): {
  flight: (typeof flights)[number] | null;
  tripOptions: TripOptions | null;
  intlOverride: boolean;
} {
  const flightId = searchParams.get("flightId");
  const flight = flights.find((flight) => flight.id === flightId);

  const originLabel = searchParams.get("originLabel") ?? undefined;
  const originId = searchParams.get("originId") ?? undefined;
  const travelMode = searchParams.get("travelMode") as TravelMode | null;
  const hasCheckedBag = searchParams.get("hasCheckedBag") === "1";
  const hasPrioritySecurity =
    searchParams.get("hasPrioritySecurity") === "1";
  const riskPreference = searchParams.get(
    "riskPreference",
  ) as RiskPreference | null;
  const intlOverride = searchParams.get("intlOverride") === "1";

  if (!flight || !originLabel || !travelMode || !riskPreference) {
    return { flight: null, tripOptions: null, intlOverride: false };
  }

  const tripOptions: TripOptions = {
    originId: originId ?? null,
    originLabel,
    travelMode,
    hasCheckedBag,
    hasPrioritySecurity,
    riskPreference,
  };

  return { flight, tripOptions, intlOverride };
}

function recalculateFromCheckpoint(
  flight: (typeof flights)[number],
  durations: TimelineDurations,
  targetBufferMinutes: number,
  checkpointStepId: StepId,
  checkpointTime: Date,
): Recommendation {
  const departureTime = new Date(flight.departureTime);
  const boardingTime = addMinutes(
    departureTime,
    -BOARDING_MINUTES_BEFORE_DEPARTURE,
  );

  const { travel, checkIn, security, walk } = durations;

  const remainingToGateNoBuffer =
    checkpointStepId === "leave"
      ? travel + checkIn + security + walk
      : checkpointStepId === "curb"
        ? checkIn + security + walk
        : checkpointStepId === "checkIn"
          ? security + walk
          : checkpointStepId === "security"
            ? walk
            : 0;

  const gateWithoutBuffer = addMinutes(
    checkpointTime,
    remainingToGateNoBuffer,
  );

  const gateTime =
    gateWithoutBuffer.getTime() <= boardingTime.getTime()
      ? gateWithoutBuffer
      : new Date(boardingTime);

  const msDiff = boardingTime.getTime() - gateTime.getTime();
  const actualBufferMinutesRaw = msDiff / 60_000;
  const actualBufferMinutes = Math.round(actualBufferMinutesRaw);

  const securityTime = addMinutes(gateTime, -walk);
  const checkInTime = addMinutes(securityTime, -security);
  const curbTime = addMinutes(checkInTime, -checkIn);
  const leaveTime = addMinutes(curbTime, -travel);

  const bufferSegmentMinutes = Math.max(actualBufferMinutes, 0);

  const riskLevel = mapBufferToRisk(
    actualBufferMinutes,
    targetBufferMinutes,
  );

  const segments: Recommendation["segments"] = [
    { label: "Travel to airport", minutes: travel },
    { label: "Check-in / bag drop", minutes: checkIn },
    { label: "Security", minutes: security },
    { label: "Walk to gate", minutes: walk },
    { label: "Buffer", minutes: bufferSegmentMinutes },
  ];

  return {
    leaveTime: leaveTime.toISOString(),
    expectedGateArrivalTime: gateTime.toISOString(),
    boardingTime: boardingTime.toISOString(),
    targetBufferMinutes,
    actualBufferMinutes,
    riskLevel,
    segments,
  };
}

interface TimelineDurations {
  travel: number;
  checkIn: number;
  security: number;
  walk: number;
  buffer: number;
}

interface TimelineStepInternal {
  id: StepId;
  minutesFromPrev: number;
  time: Date;
}

function getDurationsFromRecommendation(
  recommendation: Recommendation,
): TimelineDurations {
  return {
    travel: getSegmentMinutes(recommendation, "Travel to airport"),
    checkIn: getSegmentMinutes(
      recommendation,
      "Check-in / bag drop",
    ),
    security: getSegmentMinutes(recommendation, "Security"),
    walk: getSegmentMinutes(recommendation, "Walk to gate"),
    buffer: getSegmentMinutes(recommendation, "Buffer"),
  };
}

function buildTimelineFromLeaveTime(
  leaveTime: Date,
  durations: TimelineDurations,
): TimelineStepInternal[] {
  const steps: TimelineStepInternal[] = [];
  let current = new Date(leaveTime);

  steps.push({
    id: "leave",
    minutesFromPrev: 0,
    time: current,
  });

  const spec: { id: StepId; minutes: number }[] = [
    { id: "curb", minutes: durations.travel },
    { id: "checkIn", minutes: durations.checkIn },
    { id: "security", minutes: durations.security },
    { id: "gate", minutes: durations.walk },
    { id: "boarding", minutes: durations.buffer },
  ];

  for (const step of spec) {
    current = addMinutes(current, step.minutes);
    steps.push({
      id: step.id,
      minutesFromPrev: step.minutes,
      time: current,
    });
  }

  return steps;
}

function mapStepIdToWhereNow(id: StepId): WhereNow {
  switch (id) {
    case "leave":
      return "home";
    case "curb":
      return "in_transit";
    case "checkIn":
      return "check_in";
    case "security":
      return "security";
    case "gate":
      return "gate";
    case "boarding":
    default:
      return "gate";
  }
}

function mapWhereNowToStepId(whereNow: WhereNow): StepId {
  switch (whereNow) {
    case "home":
      return "leave";
    case "in_transit":
      return "curb";
    case "check_in":
      return "checkIn";
    case "security":
      return "security";
    case "gate":
    default:
      return "gate";
  }
}

function formatTimeInput(date: Date): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function getSegmentMinutes(
  recommendation: Recommendation,
  label: string,
): number {
  const segment = recommendation.segments.find(
    (segment) => segment.label === label,
  );
  return segment?.minutes ?? 0;
}

function getBaselinePlannedTimeForStep(
  stepId: StepId,
  recommendation: Recommendation | null,
): Date | null {
  if (!recommendation) return null;

  const durations = getDurationsFromRecommendation(recommendation);
  const timeline = buildTimelineFromLeaveTime(
    new Date(recommendation.leaveTime),
    durations,
  );
  const step = timeline.find((s) => s.id === stepId);
  return step ? step.time : null;
}

function parseTimeToDate(
  timeValue: string,
  baseDate: Date,
): Date | null {
  if (!timeValue) return null;

  const [hoursStr, minutesStr] = timeValue.split(":");
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  const result = new Date(baseDate);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

function differenceInMinutes(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 60_000);
}

function getDemoCheckpointTime(
  baseline: Date,
  requestedTime: Date | null,
): Date {
  if (requestedTime) {
    const deltaMinutes = differenceInMinutes(requestedTime, baseline);
    const clamped = Math.max(-10, Math.min(10, deltaMinutes));
    return addMinutes(baseline, clamped);
  }

  return addMinutes(baseline, 5);
}
function getRiskBadgeDisplay(
  level: import("@/lib/types").RiskLevel,
): { label: string; badgeClassName: string } {
  const label =
    level === "very_low"
      ? "Very low"
      : level === "low"
        ? "Low"
        : level === "medium"
          ? "Medium"
          : "High";

  const badgeClassName =
    level === "very_low" || level === "low"
      ? "border-emerald-300/60 bg-emerald-50 text-emerald-700 dark:border-emerald-700/70 dark:bg-emerald-900/40 dark:text-emerald-300"
      : level === "medium"
        ? "border-amber-300/60 bg-amber-50 text-amber-800 dark:border-amber-700/70 dark:bg-amber-900/40 dark:text-amber-300"
        : "border-red-300/60 bg-red-50 text-red-800 dark:border-red-700/70 dark:bg-red-900/40 dark:text-red-300";

  return { label, badgeClassName };
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

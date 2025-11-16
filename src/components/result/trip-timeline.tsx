"use client";

import type {
  Flight,
  Recommendation,
  TripOptions,
} from "@/lib/types";
import type { TimelineElement } from "@/types";
import { TimelineLayout } from "@/components/timeline-layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Briefcase,
  Clock,
  MapPin,
  Plane,
  PlaneTakeoff,
  ShieldCheck,
} from "lucide-react";
import type { StepId, StepState } from "@/lib/timeline-types";
import { DEMO_MODE } from "@/config/demo";

interface TripTimelineProps {
  recommendation: Recommendation;
  flight: Flight;
  options: TripOptions;
  stepStates: StepState[];
  onMarkHere: (stepId: StepId) => void;
  tripStatus: "planning" | "in_progress" | "completed";
  completionSummary?: string;
}

export function TripTimeline({
  recommendation,
  flight,
  options,
  stepStates,
  onMarkHere,
  tripStatus,
  completionSummary,
}: TripTimelineProps) {
  const items = buildTimelineItems(
    recommendation,
    flight,
    options,
    stepStates,
    onMarkHere,
    tripStatus,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {tripStatus === "completed" ? "Trip completed" : "Trip timeline"}
        </CardTitle>
        {tripStatus === "completed" ? (
          <>
            <p className="text-sm text-muted-foreground">
              Have a nice flight.
            </p>
            {completionSummary ? (
              <p className="text-xs text-muted-foreground">
                {completionSummary}
              </p>
            ) : null}
          </>
        ) : null}
      </CardHeader>
      <CardContent className="flex justify-center">
        <TimelineLayout
          items={items}
          size="md"
          animate={true}
          className="min-h-[300px] w-full max-w-xl mx-auto px-2"
        />
      </CardContent>
    </Card>
  );
}

function buildTimelineItems(
  recommendation: Recommendation,
  flight: Flight,
  options: TripOptions,
  stepStates: StepState[],
  onMarkHere: (stepId: StepId) => void,
  tripStatus: "planning" | "in_progress" | "completed",
): TimelineElement[] {
  const leaveTime = new Date(recommendation.leaveTime);
  const boardingTime = new Date(recommendation.boardingTime);
  const departureTime = new Date(flight.departureTime);
  const targetBufferMinutes = recommendation.targetBufferMinutes;
  const actualBufferMinutes = recommendation.actualBufferMinutes;

  const travelMinutes = getSegmentMinutes(
    recommendation,
    "Travel to airport",
  );
  const checkInMinutes = getSegmentMinutes(
    recommendation,
    "Check-in / bag drop",
  );
  const securityMinutes = getSegmentMinutes(
    recommendation,
    "Security",
  );
  const walkMinutes = getSegmentMinutes(
    recommendation,
    "Walk to gate",
  );

  const curbTime = addMinutes(leaveTime, travelMinutes);
  const checkInDoneTime = addMinutes(curbTime, checkInMinutes);
  const securityDoneTime = addMinutes(checkInDoneTime, securityMinutes);
  const gateArrivalTime = addMinutes(securityDoneTime, walkMinutes);

  const leaveBucket = getTimeOfDayBucket(leaveTime);
  const departureBucket = getTimeOfDayBucket(departureTime);

  const getState = (id: StepId): StepState => {
    const found = stepStates.find((s) => s.id === id);
    if (found) return found;
    const fallbackTime =
      id === "leave"
        ? leaveTime
        : id === "curb"
          ? curbTime
          : id === "checkIn"
            ? checkInDoneTime
            : id === "security"
              ? securityDoneTime
              : id === "gate"
                ? gateArrivalTime
                : boardingTime;
    return {
      id,
      plannedTime: fallbackTime.toISOString(),
      status: "planned",
    };
  };

  const mapStepStatusToIconStatus = (
    state: StepState,
  ): "completed" | "in-progress" | "pending" => {
    if (state.status === "completed") return "completed";
    if (state.status === "current") return "in-progress";
    return "pending";
  };

  const showActions = tripStatus !== "completed";

  const nodes: TimelineElement[] = [
    {
      id: "leave-home",
      date: formatTimeShort(leaveTime),
      title: "Leave home",
      description: makeDescription(
        buildLeaveDescription(options),
        "leave",
        onMarkHere,
        showActions,
      ),
      icon: <Clock />,
      color: "primary",
      timeContent: buildTimeContent(getState("leave"), leaveTime),
      status: mapStepStatusToIconStatus(getState("leave")),
    },
    {
      id: "arrive-curb",
      date: formatTimeShort(curbTime),
      title: "Arrive at airport curb",
      description: makeDescription(
        buildTravelDescription(
          travelMinutes,
          options,
          leaveBucket,
        ),
        "curb",
        onMarkHere,
        showActions,
      ),
      icon: <MapPin />,
      color: "accent",
      timeContent: buildTimeContent(getState("curb"), curbTime),
      status: mapStepStatusToIconStatus(getState("curb")),
    },
    {
      id: "check-in",
      date: formatTimeShort(checkInDoneTime),
      title: "Finish check-in / bag drop",
      description: makeDescription(
        buildCheckInDescription(
          checkInMinutes,
          options,
          flight,
        ),
        "checkIn",
        onMarkHere,
        showActions,
      ),
      icon: <Briefcase />,
      color: "muted",
      timeContent: buildTimeContent(
        getState("checkIn"),
        checkInDoneTime,
      ),
      status: mapStepStatusToIconStatus(getState("checkIn")),
    },
    {
      id: "security",
      date: formatTimeShort(securityDoneTime),
      title: "Clear security",
      description: makeDescription(
        buildSecurityDescription(
          securityMinutes,
          options,
          flight,
          departureBucket,
        ),
        "security",
        onMarkHere,
        showActions,
      ),
      icon: <ShieldCheck />,
      color: "primary",
      timeContent: buildTimeContent(
        getState("security"),
        securityDoneTime,
      ),
      status: mapStepStatusToIconStatus(getState("security")),
    },
    {
      id: "gate",
      date: formatTimeShort(gateArrivalTime),
      title: "Arrive at gate",
      description: makeDescription(
        buildGateDescription(
          walkMinutes,
          flight,
        ),
        "gate",
        onMarkHere,
        showActions,
      ),
      icon: <Plane />,
      color: "secondary",
      timeContent: buildTimeContent(getState("gate"), gateArrivalTime),
      status: mapStepStatusToIconStatus(getState("gate")),
    },
    {
      id: "boarding",
      date: formatTimeShort(boardingTime),
      title: "Boarding starts",
      description: makeDescription(
        buildBufferDescription(
          targetBufferMinutes,
          actualBufferMinutes,
          options,
        ),
        "boarding",
        onMarkHere,
        showActions,
      ),
      icon: <PlaneTakeoff />,
      color: "accent",
      timeContent: buildTimeContent(
        getState("boarding"),
        boardingTime,
      ),
      status: mapStepStatusToIconStatus(getState("boarding")),
    },
  ];

  // TimelineLayout reverses items internally, so pass them in reversed
  // to keep "Leave home" at the top visually.
  return nodes.slice().reverse();
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

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function formatTimeShort(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function makeDescription(
  mainText: string,
  stepId: StepId,
  onMarkHere: (id: StepId) => void,
  showAction: boolean,
): React.ReactNode {
  return (
    <div className="flex flex-col gap-1">
      <span>{mainText}</span>
      {showAction ? (
        <button
          type="button"
          onClick={() => onMarkHere(stepId)}
          className="self-start text-[11px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          I&apos;m here now
        </button>
      ) : null}
    </div>
  );
}

function buildTimeContent(
  state: StepState,
  plannedDate: Date,
): React.ReactNode {
  const plannedLabel = formatTimeShort(plannedDate);

  if (!state.actualTime) {
    const label =
      state.status === "upcoming"
        ? "UPCOMING"
        : "PLANNED";

    return (
      <div className="flex flex-col items-end gap-0.5">
        <span className="tabular-nums text-xs text-foreground">
          {plannedLabel}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
    );
  }

  const actualDate = new Date(state.actualTime);
  const actualLabel = formatTimeShort(actualDate);

  const deltaMin = Math.round(
    (actualDate.getTime() - plannedDate.getTime()) / 60000,
  );

  let statusText = "On plan";
  let statusClass = "text-muted-foreground";

  if (Math.abs(deltaMin) > 3) {
    if (deltaMin < -3) {
      statusText = `${Math.abs(deltaMin)} min early`;
      statusClass = "text-emerald-600";
    } else {
      statusText = `${deltaMin} min late`;
      statusClass = "text-amber-600";
    }
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="tabular-nums text-xs text-foreground">
        {actualLabel}
      </span>
      <span className={`text-[10px] font-medium uppercase tracking-wide ${statusClass}`}>
        {statusText}
      </span>
    </div>
  );
}

type TimeOfDayBucket = "morning" | "midday" | "evening" | "late_night";

function getTimeOfDayBucket(date: Date): TimeOfDayBucket {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 16) return "midday";
  if (hour >= 16 && hour < 21) return "evening";
  return "late_night";
}

function buildLeaveDescription(options: TripOptions): string {
  const origin =
    options.originLabel.trim().length > 0
      ? options.originLabel.trim()
      : "home";

  const modeLabel =
    options.travelMode === "car"
      ? "by car"
      : options.travelMode === "taxi"
        ? "by taxi"
        : options.travelMode === "rideshare"
          ? "by rideshare"
          : "by transit";

  return `Head out now to stay on this plan. We’re assuming a trip ${modeLabel} from ${origin}.`;
}

function buildTravelDescription(
  minutes: number,
  options: TripOptions,
  bucket: TimeOfDayBucket,
): string {
  const origin =
    options.originLabel.trim().length > 0
      ? options.originLabel.trim()
      : "home";

  if (options.travelMode === "transit") {
    return `~${minutes} min by transit from ${origin}, including time to transfer to the airport line.`;
  }

  const modePhrase =
    options.travelMode === "car"
      ? "by car"
      : options.travelMode === "taxi"
        ? "by taxi"
        : "by rideshare";

  const trafficPhrase =
    bucket === "morning"
      ? "assuming typical morning congestion leaving town."
      : bucket === "midday"
        ? "with typical midday traffic toward the airport."
        : bucket === "evening"
          ? "with early-evening traffic as people head out of the city."
          : "with light late-night traffic on the way to the airport.";

  return `~${minutes} min ${modePhrase} from ${origin}, ${trafficPhrase}`;
}

function buildCheckInDescription(
  minutes: number,
  options: TripOptions,
  flight: Flight,
): string {
  if (flight.isInternational && options.hasCheckedBag) {
    return `~${minutes} min for international check-in and dropping your checked bag.`;
  }

  if (flight.isInternational && !options.hasCheckedBag) {
    return `~${minutes} min for international check-in with carry-on only.`;
  }

  if (!flight.isInternational && options.hasCheckedBag) {
    return `~${minutes} min to check in and drop a checked bag for your domestic flight.`;
  }

  return `~${minutes} min assuming online check-in and no checked bags for your domestic flight.`;
}

function buildSecurityDescription(
  minutes: number,
  options: TripOptions,
  flight: Flight,
  bucket: TimeOfDayBucket,
): string {
  if (options.hasPrioritySecurity) {
    return `~${minutes} min with your fast-track security lane.`;
  }

  const bucketPhrase =
    bucket === "morning"
      ? "Morning departures at this terminal tend to be busier."
      : bucket === "midday"
        ? "Midday departures are typically steady but predictable."
        : bucket === "evening"
          ? "Evening departures can be busier as people head out after work."
          : "Late-night departures usually see lighter security lines.";

  return `~${minutes} min in standard security at Terminal ${flight.terminal}. ${bucketPhrase}`;
}

function buildGateDescription(
  minutes: number,
  flight: Flight,
): string {
  if (flight.isInternational) {
    return `~${minutes} min walk; international gates are often farther from security in Terminal ${flight.terminal}.`;
  }

  return `~${minutes} min walk to your domestic gate in Terminal ${flight.terminal}.`;
}

function buildBufferDescription(
  targetBufferMinutes: number,
  actualBufferMinutes: number,
  options: TripOptions,
): string {
  const presetLabel =
    options.riskPreference === "low_wait"
      ? "Less waiting"
      : options.riskPreference === "balanced"
        ? "Balanced"
        : "Very safe";

  const target = Math.round(targetBufferMinutes);
  const actual = Math.round(actualBufferMinutes);
  const actualDisplay = Math.max(actual, 0);

  if (DEMO_MODE) {
    let text = `${presetLabel} aims for ~${target} min of buffer; this plan currently has ~${actualDisplay} min.`;

    if (actual < target) {
      text +=
        " This is tighter than your usual setting, but still within a comfortable range.";
    }

    return text;
  }

  return `${presetLabel} setting adds ~${actualDisplay} min of buffer before boarding begins.`;
}

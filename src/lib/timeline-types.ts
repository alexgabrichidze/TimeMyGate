export type StepId =
  | "leave"
  | "curb"
  | "checkIn"
  | "security"
  | "gate"
  | "boarding";

export type StepStatus = "planned" | "current" | "upcoming" | "completed";

export interface StepState {
  id: StepId;
  plannedTime: string; // ISO string
  actualTime?: string; // ISO string when user marks "I'm here now"
  status: StepStatus;
}


import type { ReactNode } from "react";

export type TimelineColor = "primary" | "secondary" | "muted" | "accent";

export type TimelineStatus = "completed" | "in-progress" | "pending";

export interface TimelineElement {
  id: number | string;
  date: string;
  title: string;
  description: string;
  icon?: ReactNode | (() => ReactNode);
  color?: TimelineColor;
  status?: TimelineStatus;
}

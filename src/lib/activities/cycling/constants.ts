import type { ActivityDifficulty, ActivityType } from "@/types/activities";

export const CYCLING_ACTIVITY_TYPES: ActivityType[] = [
  "cycling_road",
  "cycling_gravel",
  "cycling_mtb",
  "cycling_ebike",
  "cycling_touring",
];

export const CYCLING_TYPE_LABELS: Record<ActivityType, string> = {
  cycling_road: "Szosa",
  cycling_gravel: "Gravel",
  cycling_mtb: "MTB",
  cycling_ebike: "E-bike",
  cycling_touring: "Bikepacking",
};

export const DIFFICULTY_LABELS: Record<ActivityDifficulty, string> = {
  easy: "Łatwa",
  moderate: "Średnia",
  hard: "Trudna",
  expert: "Ekspert",
};

export const CYCLING_DIFFICULTIES: ActivityDifficulty[] = [
  "easy",
  "moderate",
  "hard",
  "expert",
];

import type { ActivityCategory } from "@/types/activities";

export type ActivityToggleItem = {
  category: ActivityCategory;
  label: string;
  enabled: boolean;
};

/** Lekka konfiguracja do ActivityModeToggle — bez importu ciężkich komponentów mapy. */
export const ACTIVITY_TOGGLE_ITEMS: ActivityToggleItem[] = [
  { category: "cycling", label: "Kolarstwo", enabled: true },
];

export function getEnabledActivityToggles(): ActivityToggleItem[] {
  return ACTIVITY_TOGGLE_ITEMS.filter((item) => item.enabled);
}

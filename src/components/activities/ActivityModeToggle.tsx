"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getEnabledActivityToggles } from "@/lib/activities/toggle-config";
import { cn } from "@/lib/utils/cn";

const ACTIVITIES_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_ACTIVITIES !== "false";

function tabClass(active: boolean) {
  return cn(
    "px-3 py-1.5 text-sm font-medium rounded transition-colors",
    active
      ? "bg-text-primary text-bg-card"
      : "text-text-secondary hover:text-text-primary",
  );
}

function buildHref(params: URLSearchParams, activity?: string) {
  const next = new URLSearchParams(params.toString());
  if (activity) next.set("activity", activity);
  else next.delete("activity");
  const qs = next.toString();
  return qs ? `/app/destination?${qs}` : "/app/destination";
}

export function ActivityModeToggle({
  currentActivity,
}: {
  currentActivity?: string;
}) {
  const searchParams = useSearchParams();

  if (!ACTIVITIES_ENABLED) return null;

  const activities = getEnabledActivityToggles();

  return (
    <div
      role="tablist"
      aria-label="Tryb wyjazdu"
      className="inline-flex gap-1 rounded-md border border-border-default p-1"
    >
      <Link
        href={buildHref(searchParams)}
        role="tab"
        aria-selected={!currentActivity}
        className={tabClass(!currentActivity)}
      >
        Rodzinny
      </Link>
      {activities.map((a) => (
        <Link
          key={a.category}
          href={buildHref(searchParams, a.category)}
          role="tab"
          aria-selected={currentActivity === a.category}
          className={tabClass(currentActivity === a.category)}
        >
          {a.label}
        </Link>
      ))}
    </div>
  );
}

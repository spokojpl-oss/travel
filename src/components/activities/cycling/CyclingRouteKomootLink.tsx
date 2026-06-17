"use client";

import { useCallback, useMemo, type MouseEvent } from "react";
import {
  cyclingRouteKomootAction,
  type KomootRouteAction,
} from "@/lib/activities/cycling/komoot-links";
import type { ActivityRoute } from "@/types/activities";
import { useLocale, useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils/cn";

async function downloadGpx(gpxUrl: string, filename: string) {
  const res = await fetch(gpxUrl);
  if (!res.ok) throw new Error("GPX download failed");
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename.endsWith(".gpx") ? filename : `${filename}.gpx`;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

export function openRouteInKomoot(
  action: KomootRouteAction,
  filename: string,
): void {
  if (action.kind === "tour") {
    window.open(action.url, "_blank", "noopener,noreferrer");
    return;
  }

  void downloadGpx(action.gpxUrl, filename).finally(() => {
    window.open(action.importUrl, "_blank", "noopener,noreferrer");
  });
}

export function CyclingRouteKomootLink({
  route,
  className,
  compact = false,
}: {
  route: ActivityRoute;
  className?: string;
  compact?: boolean;
}) {
  const t = useT();
  const { locale } = useLocale();

  const action = useMemo(
    () => cyclingRouteKomootAction(route, locale),
    [route, locale],
  );

  const onClick = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      openRouteInKomoot(action, route.name);
    },
    [action, route.name],
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 text-left font-medium text-brand-700 hover:underline",
        compact ? "text-xs" : "text-sm",
        className,
      )}
    >
      <span aria-hidden className="text-base leading-none">
        ↗
      </span>
      <span>
        {action.kind === "tour"
          ? t("cycling.komootOpenTour")
          : t("cycling.komootImportGpx")}
      </span>
    </button>
  );
}

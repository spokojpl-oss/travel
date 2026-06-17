"use client";

import { useMemo } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import type { GooglePlace } from "@/lib/api/google-places";
import {
  filterLocalServicesForActivities,
  groupLocalServices,
} from "@/lib/places/google-place-display";
import { localizeGoogleMapsUrl } from "@/lib/maps/google-maps-config";
import { useLocale, useT } from "@/i18n/locale-provider";

const RATING_DOT: Record<string, string> = {
  great: "bg-emerald-500",
  good: "bg-lime-400",
  fair: "bg-amber-400",
  low: "bg-orange-400",
};

export function LocalServicesSection({
  places,
  selectedActivities = [],
  maxTotal = 12,
}: {
  places: GooglePlace[];
  selectedActivities?: string[];
  maxTotal?: number;
}) {
  const t = useT();
  const { locale } = useLocale();

  const matchedPlaces = useMemo(
    () => filterLocalServicesForActivities(places, selectedActivities),
    [places, selectedActivities],
  );

  const groups = useMemo(
    () =>
      groupLocalServices(matchedPlaces, {
        selectedActivities,
        limitPerGroup: 3,
        locale,
      }),
    [matchedPlaces, selectedActivities, locale],
  );

  const visible = groups
    .flatMap((g) => g.places.map((p) => ({ group: g, place: p })))
    .slice(0, maxTotal);

  if (visible.length === 0) return null;

  const byGroup = new Map<string, typeof visible>();
  for (const item of visible) {
    const key = item.group.kind;
    const list = byGroup.get(key) ?? [];
    list.push(item);
    byGroup.set(key, list);
  }

  return (
    <Card className="mb-8">
      <CardHeader title={t("localServices.title", { n: visible.length })} />
      <CardBody className="space-y-4">
        {[...byGroup.entries()].map(([kind, items]) => {
          const { group } = items[0]!;
          return (
            <section key={kind} className="space-y-2">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">
                  {group.label}
                </h3>
                <p className="text-xs text-text-tertiary">{group.description}</p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map(({ place: p }) => (
                  <article
                    key={p.place_id}
                    className="flex h-full flex-col rounded-lg border border-border-default bg-bg-soft/60 p-2.5"
                  >
                    <p className="line-clamp-2 text-sm font-medium leading-snug text-text-primary">
                      {p.name}
                    </p>
                    {p.ratingText && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-text-secondary">
                        {p.ratingTone && (
                          <span
                            className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${RATING_DOT[p.ratingTone] ?? "bg-gray-300"}`}
                            aria-hidden
                          />
                        )}
                        <span className="line-clamp-1">{p.ratingText}</span>
                      </p>
                    )}
                    {p.shortAddress && (
                      <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-text-tertiary">
                        {p.shortAddress}
                      </p>
                    )}
                    <div className="mt-auto flex flex-wrap gap-x-2 gap-y-0.5 pt-2">
                      {p.google_maps_url && (
                        <a
                          href={localizeGoogleMapsUrl(p.google_maps_url, locale)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-medium text-brand-600 hover:underline"
                        >
                          Maps
                        </a>
                      )}
                      {p.website && (
                        <a
                          href={p.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-medium text-brand-600 hover:underline"
                        >
                          WWW
                        </a>
                      )}
                      {p.phone && (
                        <a
                          href={`tel:${p.phone.replace(/\s/g, "")}`}
                          className="text-[10px] font-medium text-brand-600 hover:underline"
                        >
                          {p.phone}
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}

        {matchedPlaces.length > visible.length && (
          <p className="text-xs text-text-tertiary">
            {t("localServices.moreHint", { n: matchedPlaces.length - visible.length })}
          </p>
        )}
      </CardBody>
    </Card>
  );
}

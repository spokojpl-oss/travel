"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import type { GooglePlace } from "@/lib/api/google-places";
import { groupLocalServices } from "@/lib/places/google-place-display";
import { useT } from "@/i18n/locale-provider";

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
  const groups = groupLocalServices(places, {
    selectedActivities,
    limitPerGroup: 4,
  });

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
      <CardHeader title={t("localServices.title", { n: places.length })} />
      <CardBody className="space-y-6">
        <p className="text-sm text-text-secondary">{t("localServices.intro")}</p>

        {[...byGroup.entries()].map(([kind, items]) => {
          const { group } = items[0]!;
          return (
            <section key={kind} className="space-y-3">
              <div>
                <h3 className="font-display text-base font-semibold text-text-primary">
                  {group.label}
                </h3>
                <p className="mt-0.5 text-sm text-text-secondary">
                  {group.description}
                </p>
              </div>

              <ul className="space-y-3">
                {items.map(({ place: p }) => (
                  <li
                    key={p.place_id}
                    className="rounded-xl border border-border-default bg-bg-soft p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-text-primary">{p.name}</p>
                        {p.ratingText && (
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-text-secondary">
                            {p.ratingTone && (
                              <span
                                className={`inline-block h-2 w-2 shrink-0 rounded-full ${RATING_DOT[p.ratingTone] ?? "bg-gray-300"}`}
                                aria-hidden
                              />
                            )}
                            {p.ratingText}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                        {p.kindLabel}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-text-secondary">
                      {p.kindDescription}
                    </p>

                    {p.editorial_summary && (
                      <p className="mt-2 text-xs italic text-text-tertiary">
                        {p.editorial_summary}
                      </p>
                    )}

                    {p.shortAddress && (
                      <p className="mt-2 text-xs text-text-tertiary">
                        {t("localServices.address")}: {p.shortAddress}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {p.google_maps_url && (
                        <a
                          href={p.google_maps_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-brand-600 hover:underline"
                        >
                          {t("localServices.openMaps")} →
                        </a>
                      )}
                      {p.website && (
                        <a
                          href={p.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-brand-600 hover:underline"
                        >
                          {t("localServices.website")} →
                        </a>
                      )}
                      {p.phone && (
                        <a
                          href={`tel:${p.phone.replace(/\s/g, "")}`}
                          className="text-xs font-medium text-brand-600 hover:underline"
                        >
                          {t("localServices.phone")}: {p.phone}
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        {places.length > maxTotal && (
          <p className="text-xs text-text-tertiary">
            {t("localServices.moreHint", { n: places.length - maxTotal })}
          </p>
        )}
      </CardBody>
    </Card>
  );
}

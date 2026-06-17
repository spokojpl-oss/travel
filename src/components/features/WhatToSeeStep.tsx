"use client";

import { useMemo } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";
import type { PlaceCard } from "@/lib/plan/build-discover-places";
import type { DestinationStory } from "@/lib/plan/destination-story";
import type { TripDayTheme } from "@/lib/search/trip-rhythm";
import { THEME_META } from "@/lib/search/trip-rhythm";
import { useT } from "@/i18n/locale-provider";

const THEME_ORDER: TripDayTheme[] = [
  "beach_relax",
  "city_culture",
  "nature",
  "active_outdoor",
  "kids",
  "free",
];

function themeIcon(theme: TripDayTheme): IconName {
  return THEME_META[theme].icon as IconName;
}

export function WhatToSeeStep({
  story,
  placeCards,
  selectedIds,
  tripDays,
  onToggle,
  onContinue,
  onSelectRecommended,
  locale = "pl",
  onBackToActivities,
  onBackToRegions,
  onBackToResults,
}: {
  story: DestinationStory;
  placeCards: PlaceCard[];
  selectedIds: Set<string>;
  tripDays: number;
  onToggle: (id: string) => void;
  onContinue: () => void;
  onSelectRecommended: () => void;
  locale?: "pl" | "en";
  onBackToActivities?: () => void;
  onBackToRegions?: () => void;
  onBackToResults?: () => void;
}) {
  const t = useT();
  const pl = locale !== "en";

  const recommended = placeCards.filter((c) => c.recommended);

  const grouped = useMemo(() => {
    const map = new Map<TripDayTheme, PlaceCard[]>();
    for (const theme of THEME_ORDER) map.set(theme, []);
    for (const card of placeCards) {
      const list = map.get(card.theme) ?? [];
      list.push(card);
      map.set(card.theme, list);
    }
    return THEME_ORDER.filter((theme) => (map.get(theme)?.length ?? 0) > 0).map(
      (theme) => ({ theme, cards: map.get(theme)! }),
    );
  }, [placeCards]);

  const placeLabel = story.placeName || (pl ? "regionie" : "this area");

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div>
          <h2 className="font-display text-xl font-bold text-text-primary">
            {pl ? "Co wpisać w plan?" : "What goes on your itinerary?"}
          </h2>
          <p className="mt-0.5 text-sm text-text-secondary">
            {pl
              ? `Zaznacz miejsca na ${tripDays} ${tripDays === 1 ? "dzień" : "dni"} — bazę wybierzesz w następnym kroku.`
              : `Pick places for ${tripDays} days — lodging comes next.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-800">
            {tripDays} {pl ? "dni wyjazdu" : "trip days"}
          </span>
          <span className="rounded-full bg-bg-soft px-2.5 py-0.5 text-[11px] font-medium text-text-secondary">
            {placeCards.length} {pl ? "miejsc w katalogu" : "places curated"}
          </span>
          <span className="rounded-full bg-bg-soft px-2.5 py-0.5 text-[11px] font-medium text-text-secondary">
            {selectedIds.size} {pl ? "wybrane" : "selected"}
          </span>
        </div>
      </div>

      {recommended.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-bold text-text-primary">
              {pl
                ? `TOP w ${placeLabel} — tego nie pomiń`
                : `Must-see in ${placeLabel}`}
            </h2>
            <p className="text-xs text-text-secondary">
              {pl
                ? "Najczęściej wybierane pod Twój typ wyjazdu."
                : "Most picked for trips like yours."}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={onSelectRecommended}>
            {pl ? "Zaznacz polecane" : "Select recommended"}
          </Button>
        </div>
      )}

      {grouped.map(({ theme, cards }) => (
        <section key={theme}>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <Icon name={themeIcon(theme)} size={15} />
            </span>
            <h3 className="font-display text-base font-bold text-text-primary">
              {t(THEME_META[theme].labelKey)}
            </h3>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cards.map((card) => (
              <PlaceCardTile
                key={card.id}
                card={card}
                selected={selectedIds.has(card.id)}
                onToggle={() => onToggle(card.id)}
                pl={pl}
              />
            ))}
          </div>
        </section>
      ))}

      <Card className="sticky bottom-3 z-10 border-brand-200 bg-white/95 shadow-lg backdrop-blur">
        <CardBody className="space-y-3 p-3 sm:p-4">
          {(onBackToActivities || onBackToRegions || onBackToResults) && (
            <div className="flex flex-wrap gap-1.5 border-b border-border-default pb-2">
              {onBackToActivities && (
                <Button variant="ghost" size="sm" onClick={onBackToActivities}>
                  {pl ? "← Zmień aktywności" : "← Change activities"}
                </Button>
              )}
              {onBackToRegions && (
                <Button variant="ghost" size="sm" onClick={onBackToRegions}>
                  {pl ? "← Zmień region" : "← Change region"}
                </Button>
              )}
              {onBackToResults && (
                <Button variant="ghost" size="sm" onClick={onBackToResults}>
                  {pl ? "← Wyniki wyszukiwania" : "← Search results"}
                </Button>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-text-primary">
                {pl
                  ? `${selectedIds.size} ${selectedIds.size === 1 ? "miejsce" : "miejsc"} w Twoim planie`
                  : `${selectedIds.size} place(s) in your plan`}
              </p>
              <p className="text-xs text-text-secondary">
                {pl
                  ? "Potem wybierzesz bazę — trasy ułożymy na końcu."
                  : "Next: lodging base, then routes."}
              </p>
            </div>
            <Button size="lg" disabled={selectedIds.size === 0} onClick={onContinue}>
              {pl ? "Dalej — baza noclegowa →" : "Next — lodging base →"}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function PlaceCardTile({
  card,
  selected,
  onToggle,
  pl,
}: {
  card: PlaceCard;
  selected: boolean;
  onToggle: () => void;
  pl: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "group relative flex h-full flex-col rounded-xl border p-3 text-left transition-all",
        selected
          ? "border-brand-700 bg-brand-50/60 ring-1 ring-brand-200 shadow-sm"
          : "border-border-default bg-white hover:border-brand-300 hover:shadow-sm",
      )}
    >
      {card.recommended && (
        <span className="absolute -top-1.5 right-2 rounded-full bg-brand-700 px-2 py-px text-[9px] font-bold uppercase tracking-wide text-white">
          {pl ? "Polecane" : "Top"}
        </span>
      )}

      <div className="flex items-start justify-between gap-2">
        <h4 className="font-display pr-4 text-base font-bold leading-snug text-text-primary">
          {card.name}
        </h4>
        <span
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            selected
              ? "border-brand-700 bg-brand-700 text-white"
              : "border-border-default bg-white text-transparent group-hover:border-brand-400",
          )}
        >
          <Icon name="check" size={12} />
        </span>
      </div>

      <div className="mt-2 flex-1 space-y-1.5">
        <p className="text-xs leading-relaxed text-text-secondary">{card.why}</p>
        {card.detail && (
          <p className="text-xs leading-relaxed text-text-tertiary">{card.detail}</p>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        <span className="rounded-full bg-bg-soft px-2 py-px text-[10px] font-medium text-text-tertiary">
          {card.regionName}
        </span>
        {card.durationHint && (
          <span className="rounded-full bg-bg-soft px-2 py-px text-[10px] font-medium text-text-tertiary">
            {card.durationHint}
          </span>
        )}
      </div>
    </button>
  );
}

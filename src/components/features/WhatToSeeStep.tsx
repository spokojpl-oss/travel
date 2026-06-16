"use client";

import { useMemo, useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";
import type { PlaceCard } from "@/lib/plan/build-discover-places";
import type { DestinationStory } from "@/lib/plan/destination-story";
import { DestinationStoryHero } from "@/components/features/DestinationStoryHero";
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
}: {
  story: DestinationStory;
  placeCards: PlaceCard[];
  selectedIds: Set<string>;
  tripDays: number;
  onToggle: (id: string) => void;
  onContinue: () => void;
  onSelectRecommended: () => void;
  locale?: "pl" | "en";
}) {
  const t = useT();
  const pl = locale !== "en";
  const [showAll, setShowAll] = useState(false);

  const recommended = placeCards.filter((c) => c.recommended);
  const displayCards = showAll ? placeCards : placeCards.slice(0, Math.max(recommended.length, 8));

  const grouped = useMemo(() => {
    const map = new Map<TripDayTheme, PlaceCard[]>();
    for (const theme of THEME_ORDER) map.set(theme, []);
    for (const card of displayCards) {
      const list = map.get(card.theme) ?? [];
      list.push(card);
      map.set(card.theme, list);
    }
    return THEME_ORDER.filter((theme) => (map.get(theme)?.length ?? 0) > 0).map(
      (theme) => ({ theme, cards: map.get(theme)! }),
    );
  }, [displayCards]);

  return (
    <div className="space-y-8">
      <DestinationStoryHero
        story={story}
        tripDays={tripDays}
        badges={[
          {
            label: `${placeCards.length} ${pl ? "miejsc w katalogu" : "places curated"}`,
          },
          {
            label: `${selectedIds.size} ${pl ? "wybrane" : "selected"}`,
          },
        ]}
      />

      {recommended.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-text-primary">
              {pl ? "Nasze propozycje na początek" : "Our picks to start with"}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {pl
                ? "Możesz je od razu zaznaczyć i potem doprecyzować."
                : "Select them now and refine later."}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={onSelectRecommended}>
            {pl ? "Zaznacz polecane" : "Select recommended"}
          </Button>
        </div>
      )}

      {grouped.map(({ theme, cards }) => (
        <section key={theme}>
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <Icon name={themeIcon(theme)} size={18} />
            </span>
            <h3 className="font-display text-lg font-bold text-text-primary">
              {t(THEME_META[theme].labelKey)}
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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

      {!showAll && placeCards.length > displayCards.length && (
        <Button variant="ghost" onClick={() => setShowAll(true)}>
          {pl
            ? `Pokaż więcej miejsc (${placeCards.length - displayCards.length})`
            : `Show more places (${placeCards.length - displayCards.length})`}
        </Button>
      )}

      <Card className="sticky bottom-4 z-10 border-brand-200 bg-white/95 shadow-xl backdrop-blur">
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-text-primary">
              {pl
                ? `${selectedIds.size} ${selectedIds.size === 1 ? "miejsce" : "miejsc"} w Twoim planie`
                : `${selectedIds.size} place(s) in your plan`}
            </p>
            <p className="text-sm text-text-secondary">
              {pl
                ? "Potem wybierzesz bazę noclegową — trasy ułożymy na końcu."
                : "Next you'll pick a base — routes come last."}
            </p>
          </div>
          <Button size="lg" disabled={selectedIds.size === 0} onClick={onContinue}>
            {pl ? "Dalej — baza noclegowa →" : "Next — lodging base →"}
          </Button>
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
        "group relative flex flex-col rounded-2xl border p-5 text-left transition-all",
        selected
          ? "border-brand-700 bg-brand-50/60 ring-2 ring-brand-200 shadow-md"
          : "border-border-default bg-white hover:border-brand-300 hover:shadow-sm",
      )}
    >
      {card.recommended && (
        <span className="absolute -top-2 right-4 rounded-full bg-brand-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          {pl ? "Polecane" : "Recommended"}
        </span>
      )}

      <div className="flex items-start justify-between gap-3">
        <h4 className="font-display pr-6 text-lg font-bold leading-snug text-text-primary">
          {card.name}
        </h4>
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            selected
              ? "border-brand-700 bg-brand-700 text-white"
              : "border-border-default bg-white text-transparent group-hover:border-brand-400",
          )}
        >
          <Icon name="check" size={14} />
        </span>
      </div>

      <p className="mt-3 flex-1 text-sm leading-relaxed text-text-secondary">
        {card.why}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-bg-soft px-2.5 py-0.5 text-xs font-medium text-text-tertiary">
          {card.regionName}
        </span>
        {card.durationHint && (
          <span className="rounded-full bg-bg-soft px-2.5 py-0.5 text-xs font-medium text-text-tertiary">
            {card.durationHint}
          </span>
        )}
      </div>
    </button>
  );
}

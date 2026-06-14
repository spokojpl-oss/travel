"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

const STORAGE_KEY = "travel_guide_dismissed";

const STEPS: Array<{
  step: number;
  icon: IconName;
  title: string;
  description: string;
  href: string;
  cta: string;
}> = [
  {
    step: 1,
    icon: "target",
    title: "Wybierz aktywności",
    description:
      "Zamiast pytać „dokąd?” — mówisz co lubicie robić: rowery, jaskinie, plaże. System szuka regionów, gdzie wszystko jest blisko.",
    href: "/app/search",
    cta: "Otwórz wyszukiwarkę",
  },
  {
    step: 2,
    icon: "map-pin",
    title: "Wybierz region",
    description:
      "Dostajesz listę klastrów — miejsc na mapie, gdzie Twoje aktywności są w zasięgu jednego wypadu. Kliknij region, żeby zobaczyć szczegóły.",
    href: "/app/search",
    cta: "Szukaj regionów",
  },
  {
    step: 3,
    icon: "route",
    title: "Zbuduj destynację",
    description:
      "Na stronie destynacji system zbiera loty, hotele blisko atrakcji i transport z lotniska. Widzisz diagram odległości — hotel vs atrakcje vs lotnisko.",
    href: "/app/search",
    cta: "Zacznij od wyszukiwarki",
  },
  {
    step: 4,
    icon: "bookmark",
    title: "Zapisz wyjazd",
    description:
      "Gdy masz sensowny zestaw — zapisz jako trip. Wygeneruj plan dzień po dniu, listę pakowania i pre-trip todo.",
    href: "/app/trips",
    cta: "Moje wyjazdy",
  },
  {
    step: 5,
    icon: "share",
    title: "Udostępnij i porównaj",
    description:
      "Wyślij link rodzinie (read-only). Porównaj 2–3 tripy liczbowo — lot, hotel, pogoda, porady. System podpowie co wybrać.",
    href: "/app/compare",
    cta: "Porównaj tripy",
  },
];

export function HowItWorksGuide({
  variant = "full",
  className,
}: {
  variant?: "full" | "compact";
  className?: string;
}) {
  const [dismissed, setDismissed] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setDismissed(stored === "1");
    setExpanded(stored !== "1");
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
    setExpanded(false);
  }

  function showAgain() {
    localStorage.removeItem(STORAGE_KEY);
    setDismissed(false);
    setExpanded(true);
  }

  if (variant === "compact") {
    return (
      <Card className={cn("border-brand-200 bg-brand-50/40", className)}>
        <CardBody>
          <div className="flex items-start gap-3">
            <Icon name="help-circle" size={24} className="mt-0.5 text-brand-700" />
            <div>
              <h3 className="font-display font-bold text-text-primary">
                Nie wiesz od czego zacząć?
              </h3>
              <p className="mt-1 text-sm text-text-secondary">
                Travel.app działa odwrotnie niż wakacje.pl — najpierw aktywności,
                potem region, potem lot + hotel.{" "}
                <Link href="/app#guide" className="font-medium text-brand-700 hover:underline">
                  Zobacz 5 kroków →
                </Link>
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <section id="guide" className={cn("scroll-mt-8", className)}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-[0.15em] text-brand-700 uppercase">
            <Icon name="help-circle" size={14} />
            Samouczek
          </div>
          <h2 className="font-display text-2xl font-bold text-text-primary">
            Jak działa Travel.app?
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            5 kroków od „co lubicie robić” do gotowego folderu wyjazdu dla rodziny.
          </p>
        </div>
        <div className="flex gap-2">
          {!dismissed && (
            <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
              {expanded ? "Zwiń" : "Rozwiń"}
            </Button>
          )}
          {dismissed ? (
            <Button variant="secondary" size="sm" onClick={showAgain}>
              Pokaż ponownie
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={dismiss}>
              <Icon name="x" size={16} />
              Zamknij
            </Button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((step) => (
            <Card
              key={step.step}
              className="card-hover relative overflow-hidden border-border-default"
            >
              <CardBody>
                <div className="absolute top-3 right-4 font-display text-5xl font-bold text-brand-50">
                  {String(step.step).padStart(2, "0")}
                </div>
                <div className="relative">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-700 text-white">
                    <Icon name={step.icon} size={20} />
                  </div>
                  <h3 className="font-display mb-2 font-bold text-text-primary">
                    {step.title}
                  </h3>
                  <p className="mb-4 text-sm leading-relaxed text-text-secondary">
                    {step.description}
                  </p>
                  <Link
                    href={step.href}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"
                  >
                    {step.cta}
                    <Icon name="chevron-right" size={16} />
                  </Link>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {expanded && (
        <div className="mt-6 rounded-xl border border-border-default bg-bg-soft p-4 text-sm text-text-secondary">
          <strong className="text-text-primary">Grupy podróżne</strong> — opcjonalny
          krok na start. Zapisujesz kto jedzie (dorośli, dzieci, wiek) żeby wyszukiwarka
          i hotele liczyły koszty per osoba. Możesz pominąć i wrócić później w{" "}
          <Link href="/app/groups" className="text-brand-700 hover:underline">
            Grupy
          </Link>
          .
        </div>
      )}
    </section>
  );
}

export function EmptyStateGuide({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <Card className="mt-6 border-dashed">
      <CardBody className="py-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-700">
          <Icon name="help-circle" size={28} />
        </div>
        <h3 className="font-display text-lg font-bold text-text-primary">{title}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
          {description}
        </p>
        <Link href={actionHref} className="mt-6 inline-block">
          <Button>{actionLabel}</Button>
        </Link>
        <p className="mt-4 text-xs text-text-tertiary">
          Albo{" "}
          <Link href="/app#guide" className="text-brand-700 hover:underline">
            przeczytaj pełny samouczek
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}

"use client";

import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";

const STEPS: Array<{
  icon: IconName;
  title: string;
  body: string;
}> = [
  {
    icon: "search",
    title: "1. Opisz podróż na stronie głównej",
    body: "Pod logiem wpisz skąd jedziecie, jak (auto, pociąg, lot…) i kiedy — oraz w zależności od trybu co lubicie robić albo dokąd chcecie jechać. To jedyny formularz startowy.",
  },
  {
    icon: "target",
    title: "2. Wybierz aktywności",
    body: "System podpowie tagi na podstawie Twoich zainteresowań. Zaznacz np. plaże, rowery, muzea — szukamy regionów, gdzie to wszystko jest blisko siebie.",
  },
  {
    icon: "map-pin",
    title: "3. Zobacz regiony i szczegóły",
    body: "Dostajesz listę miejsc na mapie z oceną dopasowania. Kliknij region, żeby zobaczyć atrakcje, noclegi i opcje transportu.",
  },
  {
    icon: "folder",
    title: "4. Zapisz wyjazd (opcjonalnie)",
    body: "Gdy zestaw Ci pasuje — zapisz trip, wygeneruj plan dnia po dniu i listę rzeczy do zrobienia przed wyjazdem.",
  },
];

export function HowItWorksGuide({
  variant = "full",
  className,
}: {
  variant?: "full" | "compact";
  className?: string;
}) {
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "rounded-xl border border-brand-200 bg-brand-50/50 p-4 text-sm",
          className,
        )}
      >
        <p className="font-medium text-text-primary">
          Inaczej niż na portalach typu wakacje.pl
        </p>
        <p className="mt-1 text-text-secondary">
          Najpierw aktywności i region, potem lot + hotel — nie odwrotnie.{" "}
          <Link href="/app#guide" className="font-semibold text-brand-700 hover:underline">
            Jak to działa →
          </Link>
        </p>
      </div>
    );
  }

  return (
    <section id="guide" className={cn("scroll-mt-8", className)}>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-text-primary">
          Jak działa Travel.app?
        </h2>
        <p className="mt-2 max-w-2xl text-base text-text-secondary">
          Planujesz od tego, <strong className="text-text-primary">co chcecie robić</strong>,
          a nie od nazwy kurortu. System szuka miejsc, gdzie Wasze aktywności są w jednym
          rejonie, a potem pokazuje loty i noclegi.
        </p>
      </div>

      <ol className="space-y-4">
        {STEPS.map((step) => (
          <li
            key={step.title}
            className="flex gap-4 rounded-xl border border-border-default bg-white p-5 shadow-sm"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-700 text-white">
              <Icon name={step.icon} size={22} />
            </div>
            <div>
              <h3 className="font-display font-bold text-text-primary">{step.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-6 text-sm text-text-secondary">
        <strong className="text-text-primary">Grupy podróżne</strong> — opcjonalnie zapisz
        kto jedzie (wiek dzieci, preferencje), żeby lepiej liczyć koszty.{" "}
        <Link href="/app/groups" className="font-semibold text-brand-700 hover:underline">
          Zarządzaj grupami
        </Link>
      </p>
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
    <div className="mt-6 rounded-xl border border-dashed border-border-default py-10 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-700">
        <Icon name="help-circle" size={28} />
      </div>
      <h3 className="font-display text-lg font-bold text-text-primary">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">{description}</p>
      <Link
        href={actionHref}
        className="mt-6 inline-flex rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
      >
        {actionLabel}
      </Link>
    </div>
  );
}

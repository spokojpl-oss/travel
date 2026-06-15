"use client";

import Link from "next/link";
import { DestinationCard } from "./DestinationCard";
import type { DestinationCardProps } from "./DestinationCard";
import { FeatureCard } from "./AdvisoryCard";
import { useT } from "@/i18n/locale-provider";

export const POPULAR_DESTINATIONS = [
  {
    destination: { name: "Madera", country: "Portugalia" },
    imageUrl:
      "https://images.unsplash.com/photo-1547234935-80c7145ec969?w=1200&q=80",
    pricePerPerson: 2180,
    rating: 4.6,
    ratingCount: 2134,
    highlights: ["Lewady", "Rowery", "Jaskinie", "Punkty widokowe"],
    stats: { attractions: 18, temp: "23°C", savings: "−480 zł" },
    description:
      "Wulkaniczna wyspa z lewadami, jaskiniami i punktami widokowymi. Idealne dla aktywnych rodzin.",
    href: "/app#search",
    featured: true,
  },
  {
    destination: { name: "Mallorca", country: "Hiszpania" },
    imageUrl:
      "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=600&q=80",
    pricePerPerson: 1840,
    rating: 4.8,
    highlights: ["Plaże", "Żeglarstwo", "Góry"],
    stats: { attractions: 12, temp: "28°C", savings: "10%" },
    href: "/app#search",
  },
  {
    destination: { name: "Kreta", country: "Grecja" },
    imageUrl:
      "https://images.unsplash.com/photo-1601581875309-fafbf2d3ed3a?w=600&q=80",
    pricePerPerson: 2950,
    rating: 4.7,
    highlights: ["Plaże", "Ruiny", "Wędrówki"],
    stats: { attractions: 21, temp: "29°C", savings: "5%" },
    href: "/app#search",
  },
  {
    destination: { name: "Saranda", country: "Albania" },
    imageUrl:
      "https://images.unsplash.com/photo-1592486058517-36236ba8784f?w=600&q=80",
    pricePerPerson: 1680,
    rating: 4.4,
    highlights: ["Plaże", "Ruiny", "Kayak"],
    stats: { attractions: 9, temp: "27°C", savings: "8%" },
    href: "/app#search",
  },
] satisfies DestinationCardProps[];

export function PopularDestinationsSection() {
  const t = useT();
  const [featured, ...rest] = POPULAR_DESTINATIONS;

  return (
    <section className="bg-bg-soft py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-3 inline-block text-xs font-semibold tracking-[0.2em] text-brand-700 uppercase">
              {t("landing.trending")}
            </div>
            <h2 className="font-display text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
              {t("landing.popularTitle")}
            </h2>
            <p className="mt-3 text-text-secondary">
              {t("landing.popularSubtitle")}
            </p>
          </div>
        </div>

        <DestinationCard {...featured} featured />

        <div className="grid gap-6 md:grid-cols-3">
          {rest.map((dest) => (
            <DestinationCard key={dest.destination.name} {...dest} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function WhyUsSection() {
  const t = useT();

  return (
    <section className="relative mx-auto max-w-7xl px-4 py-24 lg:px-8">
      <div className="relative mb-16 text-center">
        <div className="mb-3 inline-block text-xs font-semibold tracking-[0.2em] text-brand-700 uppercase">
          {t("landing.howLabel")}
        </div>
        <h2 className="font-display text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
          {t("landing.whyTitle")}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-text-secondary">
          {t("landing.whyBody")}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <FeatureCard
          number="01"
          icon="target"
          title={t("landing.feature1Title")}
          text={t("landing.feature1Text")}
        />
        <FeatureCard
          number="02"
          icon="lightbulb"
          title={t("landing.feature2Title")}
          text={t("landing.feature2Text")}
          accent="accent"
        />
        <FeatureCard
          number="03"
          icon="folder"
          title={t("landing.feature3Title")}
          text={t("landing.feature3Text")}
          accent="success"
        />
      </div>
    </section>
  );
}

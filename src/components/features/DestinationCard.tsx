import Image from "next/image";
import Link from "next/link";
import { LocationDiagramMini } from "./LocationDiagram";
import type { DiagramLine, DiagramPoint } from "./LocationDiagram";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils/cn";

export type DestinationCardProps = {
  destination: { name: string; country: string };
  imageUrl?: string;
  pricePerPerson?: number;
  rating?: number;
  ratingCount?: number;
  highlights: string[];
  stats?: { attractions?: number; temp?: string; savings?: string };
  diagram?: { points: DiagramPoint[]; lines: DiagramLine[] };
  href: string;
  featured?: boolean;
  description?: string;
};

export function DestinationCard({
  destination,
  imageUrl,
  pricePerPerson,
  rating,
  ratingCount,
  highlights,
  stats,
  diagram,
  href,
  featured,
  description,
}: DestinationCardProps) {
  if (featured) {
    return (
      <Link
        href={href}
        className="card-hover mb-6 block overflow-hidden rounded-2xl border border-border-default bg-bg-card shadow-card"
      >
        <div className="grid md:grid-cols-5">
          <div className="relative h-64 overflow-hidden bg-bg-soft md:col-span-3 md:h-auto">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={destination.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 60vw"
              />
            ) : diagram ? (
              <div className="absolute inset-0 p-2">
                <LocationDiagramMini {...diagram} />
              </div>
            ) : null}
            <Badge
              variant="accent"
              className="absolute top-4 left-4 rounded-full px-3 py-1.5"
            >
              🔥 Featured
            </Badge>
            <div className="absolute right-0 bottom-0 left-0 h-32 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-4 text-white">
              <div className="font-display text-3xl font-bold">
                {destination.name}
              </div>
              <div className="text-sm opacity-90">{destination.country}</div>
            </div>
          </div>

          <div className="flex flex-col p-6 md:col-span-2 md:p-8">
            <FeaturedMeta
              rating={rating}
              ratingCount={ratingCount}
              pricePerPerson={pricePerPerson}
            />
            {description && (
              <p className="mb-4 text-sm leading-relaxed text-text-secondary">
                {description}
              </p>
            )}
            {stats && <StatsRow stats={stats} />}
            <Highlights highlights={highlights} className="mb-4" />
            <PriceCTA pricePerPerson={pricePerPerson} dark />
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="card-hover group block overflow-hidden rounded-2xl border border-border-default bg-bg-card shadow-card"
    >
      <div className="relative h-52 overflow-hidden bg-bg-soft">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={destination.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : diagram ? (
          <div className="absolute inset-0 p-2">
            <LocationDiagramMini {...diagram} />
          </div>
        ) : null}

        {pricePerPerson && pricePerPerson < 3000 && (
          <Badge
            variant="success"
            className="absolute top-3 left-3 rounded-md px-2 py-1"
          >
            🔥 Okazja
          </Badge>
        )}

        {rating && (
          <span className="absolute top-3 right-3 flex items-center gap-1 rounded-md bg-white/95 px-2 py-1 text-sm font-semibold shadow-sm backdrop-blur">
            <span className="text-star">★</span>
            <span className="numeric text-text-primary">
              {rating.toFixed(1)}
            </span>
          </span>
        )}
      </div>

      <div className="p-5">
        <h3 className="font-display text-xl font-bold text-text-primary group-hover:text-brand-700">
          {destination.name}
        </h3>
        <p className="mb-3 text-sm text-text-secondary">
          {destination.country}
        </p>
        {stats && <StatsRow stats={stats} compact />}
        <Highlights highlights={highlights} className="mb-3" />
        <PriceCTA pricePerPerson={pricePerPerson} />
      </div>
    </Link>
  );
}

function FeaturedMeta({
  rating,
  ratingCount,
  pricePerPerson,
}: {
  rating?: number;
  ratingCount?: number;
  pricePerPerson?: number;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      {rating && (
        <div className="flex items-center gap-1">
          <span className="text-star">★</span>
          <span className="numeric font-semibold">{rating.toFixed(1)}</span>
          {ratingCount && (
            <span className="numeric text-sm text-text-tertiary">
              ({ratingCount.toLocaleString("pl-PL")})
            </span>
          )}
        </div>
      )}
      {pricePerPerson && pricePerPerson < 3000 && (
        <Badge variant="success" className="rounded-md">
          Okazja
        </Badge>
      )}
    </div>
  );
}

function StatsRow({
  stats,
  compact,
}: {
  stats: NonNullable<DestinationCardProps["stats"]>;
  compact?: boolean;
}) {
  const items = [
    stats.attractions != null
      ? { value: stats.attractions, label: "atrakcji" }
      : null,
    stats.temp ? { value: stats.temp, label: "średnio" } : null,
    stats.savings ? { value: stats.savings, label: compact ? "oszcz." : "open-jaw" } : null,
  ].filter(Boolean) as Array<{ value: string | number; label: string }>;

  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        "grid grid-cols-3 gap-3 border-y border-border-default py-3 text-center",
        compact ? "mb-3 border-border-default/60" : "mb-4",
      )}
    >
      {items.map((item) => (
        <div key={item.label}>
          <div
            className={cn(
              "font-display font-bold text-text-primary numeric",
              compact ? "text-sm" : "text-lg",
            )}
          >
            {item.value}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-text-tertiary">
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function Highlights({
  highlights,
  className,
}: {
  highlights: string[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {highlights.slice(0, 4).map((h) => (
        <span
          key={h}
          className="rounded-md bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700"
        >
          {h}
        </span>
      ))}
    </div>
  );
}

function PriceCTA({
  pricePerPerson,
  dark,
}: {
  pricePerPerson?: number;
  dark?: boolean;
}) {
  if (!pricePerPerson) return null;

  return (
    <div className="mt-auto flex items-end justify-between border-t border-border-default pt-4">
      <div>
        <div className="text-xs text-text-tertiary">od</div>
        <div className="font-display text-2xl font-bold text-text-primary numeric leading-none">
          {pricePerPerson.toLocaleString("pl-PL")}{" "}
          <span className="text-base font-normal text-text-secondary">zł</span>
        </div>
        <div className="mt-1 text-xs text-text-secondary">/ osoba</div>
      </div>
      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors",
          dark
            ? "bg-brand-900 text-white hover:bg-brand-700"
            : "text-brand-700 group-hover:text-accent-500",
        )}
      >
        Sprawdź →
      </span>
    </div>
  );
}

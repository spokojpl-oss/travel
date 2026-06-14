import Image from "next/image";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";

export function HotelCard({
  hotel,
  offer,
  proximity,
  imageUrl,
  className,
}: {
  hotel: {
    id: string;
    name: string;
    stars?: number | null;
    address?: string | null;
    rating?: number | null;
    rating_count?: number | null;
  };
  offer: {
    price_total_pln: number;
    price_per_night_pln: number;
    nights: number;
    deep_link: string;
  };
  proximity: {
    avg_distance_km: number;
    closest?: { name: string; distance_km: number };
  };
  imageUrl?: string;
  className?: string;
}) {
  const showHighRating = (hotel.rating ?? 0) >= 8;

  return (
    <Card
      className={cn(
        "card-hover mb-4 overflow-hidden border-border-default shadow-card",
        className,
      )}
    >
      <div className="grid md:grid-cols-5">
        <div className="relative h-56 bg-bg-soft md:col-span-2 md:h-auto">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={hotel.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 40vw"
            />
          ) : (
            <div className="flex h-full min-h-[14rem] items-center justify-center bg-gradient-to-br from-brand-50 to-bg-soft text-brand-700">
              <Icon name="hotel" size={48} strokeWidth={1.5} />
            </div>
          )}
          {showHighRating && (
            <Badge
              variant="success"
              className="absolute top-3 left-3 rounded-md px-2 py-1"
            >
              Wysokie oceny
            </Badge>
          )}
        </div>

        <div className="p-6 md:col-span-3">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              {hotel.stars != null && hotel.stars > 0 && (
                <div className="mb-1.5 flex items-center gap-0.5">
                  {Array.from({ length: hotel.stars }).map((_, i) => (
                    <span key={i} className="text-star text-sm">
                      ★
                    </span>
                  ))}
                </div>
              )}
              <h3 className="font-display text-xl font-bold text-text-primary">
                {hotel.name}
              </h3>
              {hotel.address && (
                <p className="mt-0.5 text-sm text-text-secondary">
                  {hotel.address}
                </p>
              )}
            </div>
            {hotel.rating != null && (
              <div className="text-right">
                <div className="rounded-lg bg-brand-700 px-3 py-1.5 font-display text-lg font-bold text-white numeric">
                  {hotel.rating.toFixed(1)}
                </div>
                {hotel.rating_count != null && (
                  <div className="numeric mt-1 text-xs text-text-tertiary">
                    {hotel.rating_count} opinii
                  </div>
                )}
              </div>
            )}
          </div>

          <p className="mb-4 flex items-center gap-2 text-sm text-text-secondary">
            <Icon name="map-pin" size={16} className="text-brand-700" />
            <span>
              <strong className="numeric text-text-primary">
                {proximity.avg_distance_km} km
              </strong>{" "}
              średnio od Twoich atrakcji
            </span>
          </p>

          <div className="flex items-end justify-between border-t border-border-default pt-4">
            <div>
              <div className="text-xs text-text-tertiary">
                {offer.nights} nocy
              </div>
              <div className="font-display text-2xl font-bold text-text-primary numeric leading-none">
                {offer.price_total_pln.toLocaleString("pl-PL")}{" "}
                <span className="text-base font-normal text-text-secondary">
                  zł
                </span>
              </div>
              <div className="numeric mt-1 text-xs text-text-secondary">
                {offer.price_per_night_pln} zł / noc
              </div>
            </div>
            <a href={offer.deep_link} target="_blank" rel="noopener noreferrer">
              <Button size="md">Sprawdź ofertę →</Button>
            </a>
          </div>
        </div>
      </div>
    </Card>
  );
}

import { apiEnv } from "@/config/api-env";

function affiliateMarker(): string | null {
  return apiEnv.TRAVELPAYOUTS_MARKER_BOOKING?.trim() || null;
}

function wrapAffiliateLink(targetUrl: string, programId: string): string {
  const marker = affiliateMarker();
  if (!marker) return targetUrl;
  const tpUrl = new URL("https://tp.media/r");
  tpUrl.searchParams.set("marker", marker);
  tpUrl.searchParams.set("p", programId);
  tpUrl.searchParams.set("u", targetUrl);
  return tpUrl.toString();
}

export function buildWelcomePickupsDeepLink({
  airportIata,
  toAddress,
  date,
  passengers,
}: {
  airportIata: string;
  toAddress: string;
  date: string;
  passengers: number;
}): string {
  const targetUrl = `https://www.welcomepickups.com/search/?from_airport=${airportIata}&to=${encodeURIComponent(toAddress)}&date=${date}&passengers=${passengers}`;
  return wrapAffiliateLink(targetUrl, "5418");
}

export function buildKiwitaxiDeepLink({
  fromIata,
  toCity,
  toLat,
  toLon,
  date,
  passengers,
}: {
  fromIata: string;
  toCity: string;
  toLat?: number;
  toLon?: number;
  date: string;
  passengers: number;
}): string {
  const params = new URLSearchParams({
    from: fromIata,
    to: toCity,
    when: date,
    passengers: String(passengers),
  });
  if (toLat) params.set("to_lat", String(toLat));
  if (toLon) params.set("to_lon", String(toLon));

  const targetUrl = `https://kiwitaxi.com/search/?${params.toString()}`;
  return wrapAffiliateLink(targetUrl, "4593");
}

export function estimateTransferPrice({
  distanceKm,
  passengers,
}: {
  distanceKm: number;
  passengers: number;
}): { sedan_pln: number; minivan_pln: number; minibus_pln: number } {
  const base = 15;
  const perKm = 0.7;
  const eurPlnRate = 4.35;

  const sedanEur = base + perKm * distanceKm;
  const minivanEur = (base + perKm * distanceKm) * 1.5;
  const minibusEur = (base + perKm * distanceKm) * 2.2;

  if (passengers > 7) {
    return {
      sedan_pln: Math.round(sedanEur * eurPlnRate),
      minivan_pln: Math.round(minivanEur * eurPlnRate),
      minibus_pln: Math.round(minibusEur * eurPlnRate),
    };
  }

  return {
    sedan_pln: Math.round(sedanEur * eurPlnRate),
    minivan_pln: Math.round(minivanEur * eurPlnRate),
    minibus_pln: Math.round(minibusEur * eurPlnRate),
  };
}

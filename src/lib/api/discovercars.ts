import { getTravelpayoutsPartnerMarker } from "@/config/api-env";

function requirePartnerMarker(): string | null {
  return getTravelpayoutsPartnerMarker() ?? null;
}

function buildDiscoverCarsTargetUrl({
  pickupLocation,
  pickupDate,
  pickupTime = "10:00",
  returnDate,
  returnTime = "10:00",
  driverAge = 35,
  pickupLat,
  pickupLon,
}: {
  pickupLocation: string;
  pickupDate: string;
  pickupTime?: string;
  returnDate: string;
  returnTime?: string;
  driverAge?: number;
  pickupLat?: number;
  pickupLon?: number;
}): string {
  const cleanDate = (d: string) => (d.includes("T") ? d.split("T")[0] : d);

  const params = new URLSearchParams({
    pickup_location: pickupLocation,
    pickup_date: cleanDate(pickupDate),
    pickup_time: pickupTime,
    return_date: cleanDate(returnDate),
    return_time: returnTime,
    driver_age: String(driverAge),
  });
  if (pickupLat) params.set("pickup_lat", String(pickupLat));
  if (pickupLon) params.set("pickup_lon", String(pickupLon));

  return `https://www.discovercars.com/search/?${params.toString()}`;
}

export function buildDiscoverCarsDeepLink(
  params: Parameters<typeof buildDiscoverCarsTargetUrl>[0],
): string {
  const targetUrl = buildDiscoverCarsTargetUrl(params);
  const marker = requirePartnerMarker();
  if (!marker) return targetUrl;

  const tpUrl = new URL("https://tp.media/r");
  tpUrl.searchParams.set("marker", marker);
  tpUrl.searchParams.set("p", "915");
  tpUrl.searchParams.set("u", targetUrl);
  return tpUrl.toString();
}

export function buildDiscoverCarsDirectLink(
  params: Parameters<typeof buildDiscoverCarsTargetUrl>[0],
): string {
  const url = new URL(buildDiscoverCarsTargetUrl(params));
  const marker = requirePartnerMarker();
  if (marker) url.searchParams.set("marker", marker);
  return url.toString();
}

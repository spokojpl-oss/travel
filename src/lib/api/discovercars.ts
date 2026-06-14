import { apiEnv } from "@/config/api-env";

function requireBookingMarker(): string {
  const marker = apiEnv.TRAVELPAYOUTS_MARKER_BOOKING;
  if (!marker) {
    throw new Error(
      "TRAVELPAYOUTS_MARKER_BOOKING nie skonfigurowany. Dodaj marker w env.",
    );
  }
  return marker;
}

export function buildDiscoverCarsDeepLink({
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

  const targetUrl = `https://www.discovercars.com/search/?${params.toString()}`;

  const tpUrl = new URL("https://tp.media/r");
  tpUrl.searchParams.set("marker", requireBookingMarker());
  tpUrl.searchParams.set("p", "915");
  tpUrl.searchParams.set("u", targetUrl);
  return tpUrl.toString();
}

export function buildDiscoverCarsDirectLink(
  params: Parameters<typeof buildDiscoverCarsDeepLink>[0],
): string {
  const cleanDate = (d: string) => (d.includes("T") ? d.split("T")[0] : d);

  const url = new URL("https://www.discovercars.com/search");
  url.searchParams.set("pickup_location", params.pickupLocation);
  url.searchParams.set("pickup_date", cleanDate(params.pickupDate));
  url.searchParams.set("pickup_time", params.pickupTime ?? "10:00");
  url.searchParams.set("return_date", cleanDate(params.returnDate));
  url.searchParams.set("return_time", params.returnTime ?? "10:00");
  url.searchParams.set("driver_age", String(params.driverAge ?? 35));
  url.searchParams.set("marker", requireBookingMarker());
  return url.toString();
}

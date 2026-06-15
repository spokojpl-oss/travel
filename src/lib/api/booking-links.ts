import { apiEnv } from "@/config/api-env";

export function buildBookingSearchLink({
  destinationName,
  checkIn,
  checkOut,
  adults,
  children = 0,
}: {
  destinationName: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children?: number;
}): string {
  const params = new URLSearchParams({
    ss: destinationName,
    checkin: checkIn,
    checkout: checkOut,
    group_adults: String(adults),
    group_children: String(children),
    no_rooms: "1",
    selected_currency: "PLN",
  });

  const marker = apiEnv.TRAVELPAYOUTS_MARKER_BOOKING;
  const base = "https://www.booking.com/searchresults.html";
  const url = `${base}?${params.toString()}`;
  if (!marker) return url;

  const tp = new URL("https://tp.media/r");
  tp.searchParams.set("marker", marker);
  tp.searchParams.set("p", "3410");
  tp.searchParams.set("u", url);
  return tp.toString();
}

export const HOTELLOOK_SHUTDOWN_MESSAGE =
  "Hotellook (Travelpayouts) został wyłączony — ceny na żywo nie są dostępne. Możesz szukać noclegów na Booking.com (link poniżej) lub wrócić później, gdy dodamy nowe API.";

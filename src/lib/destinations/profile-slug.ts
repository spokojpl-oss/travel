import { DESTINATION_CATALOG } from "@/lib/destinations/catalog";
import {
  getEuropeDestinationProfiles,
  type EuropeDestinationProfile,
} from "@/lib/destinations/europe-profiles";

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function labelMatchesProfile(
  label: string,
  profile: EuropeDestinationProfile,
): boolean {
  const n = normalize(label);
  const name = normalize(profile.name);
  const country = normalize(profile.country);

  if (n.startsWith(name) || n.includes(`${name},`)) return true;
  if (n.includes(name) && n.includes(country)) return true;

  const catalog = DESTINATION_CATALOG.find(
    (c) => normalize(c.name) === name && normalize(c.country) === country,
  );
  if (catalog?.aliases?.some((a) => n.includes(normalize(a)))) return true;

  return false;
}

/** Mapuje „Kreta, Grecja” → slug seeda, np. `kreta-grecja`. */
export function resolveEuropeProfileSlug(
  destinationLabel: string,
): string | null {
  const label = destinationLabel.trim();
  if (!label) return null;

  for (const profile of getEuropeDestinationProfiles()) {
    if (labelMatchesProfile(label, profile)) {
      return profile.slug;
    }
  }

  return null;
}

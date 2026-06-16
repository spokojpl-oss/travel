import { resolveCuratedHeroImageUrl } from "@/lib/destinations/destination-hero-images";

export async function fetchDestinationHeroImage(
  destinationLabel: string,
): Promise<string | null> {
  return resolveCuratedHeroImageUrl(destinationLabel);
}

import { toPolishPlaceName } from "@/lib/destinations/polish-names";

const EXACT_PL: Record<string, string> = {
  "Popcorn Beach": "Plaża Popcorn",
  "Waikiki Beach": "Plaża Waikiki",
  "Playa de la Calera": "Plaża Calera",
  "Playa de El Hierro": "Plaża El Hierro",
  "Playa del Bajo de la Burra": "Plaża Bajo de la Burra",
  "Bajo del Medio": "Plaża Bajo del Medio",
  "La Galera": "Plaża La Galera",
  Generoso: "Plaża Generoso",
};

function titleCaseWords(value: string): string {
  return value
    .split(/\s+/)
    .map((w) => (w.length <= 2 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(" ");
}

export function toPolishAttractionName(name: string, locale: "pl" | "en" = "pl"): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  if (locale === "en") return trimmed;

  if (EXACT_PL[trimmed]) return EXACT_PL[trimmed];

  let out = trimmed;

  out = out.replace(/^Playa de la /i, "Plaża ");
  out = out.replace(/^Playa del /i, "Plaża ");
  out = out.replace(/^Playa de /i, "Plaża ");
  out = out.replace(/^Playa /i, "Plaża ");
  out = out.replace(/^Cal[óo] /i, "Zatoka ");
  out = out.replace(/^Cala /i, "Zatoka ");
  out = out.replace(/^Mirador /i, "Punkt widokowy ");
  out = out.replace(/^Viewpoint /i, "Punkt widokowy ");
  out = out.replace(/ Beach$/i, " — plaża");
  out = out.replace(/^Museo /i, "Muzeum ");
  out = out.replace(/^Museum /i, "Muzeum ");

  out = toPolishPlaceName(out);

  if (out === trimmed && /^[A-Za-z]/.test(out)) {
    return titleCaseWords(out);
  }

  return out;
}

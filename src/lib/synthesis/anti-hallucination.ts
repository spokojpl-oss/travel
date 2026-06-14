export type ValidationResult = {
  valid: boolean;
  issues: string[];
};

export type SourceData = {
  fullText: string;
  knownLinks: Set<string>;
  knownPhones: Set<string>;
  knownPlaceNames: Set<string>;
};

export function buildSourceData(parts: {
  wikivoyageText?: string;
  attractions?: Array<{ name: string; website?: string | null; phone?: string | null }>;
  googlePlaces?: Array<{ name: string; website?: string | null; phone?: string | null }>;
  weatherSummary?: object;
  osmAttractions?: Array<{ name: string; website?: string | null; phone?: string | null }>;
}): SourceData {
  const knownLinks = new Set<string>();
  const knownPhones = new Set<string>();
  const knownPlaceNames = new Set<string>();
  const textParts: string[] = [];

  if (parts.wikivoyageText) textParts.push(parts.wikivoyageText);

  const collectPlace = (p: {
    name: string;
    website?: string | null;
    phone?: string | null;
  }) => {
    knownPlaceNames.add(p.name.toLowerCase());
    if (p.website) knownLinks.add(p.website.toLowerCase());
    if (p.phone) knownPhones.add(normalizePhone(p.phone));
    textParts.push(p.name);
  };

  parts.attractions?.forEach(collectPlace);
  parts.googlePlaces?.forEach(collectPlace);
  parts.osmAttractions?.forEach(collectPlace);

  if (parts.weatherSummary) {
    textParts.push(JSON.stringify(parts.weatherSummary));
  }

  return {
    fullText: textParts.join(" ").toLowerCase(),
    knownLinks,
    knownPhones,
    knownPlaceNames,
  };
}

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-()+]/g, "");
}

const URL_REGEX = /https?:\/\/[^\s\)\]"'<>]+/gi;
const PHONE_REGEX = /\+?\d[\d\s\-()]{7,}\d/g;

export function validateAgainstSource(
  aiOutputText: string,
  source: SourceData,
): ValidationResult {
  const issues: string[] = [];

  const urls = aiOutputText.match(URL_REGEX) ?? [];
  for (const url of urls) {
    const normalized = url.replace(/[.,;:]$/, "").toLowerCase();
    if (!source.knownLinks.has(normalized)) {
      const withoutTrailingSlash = normalized.replace(/\/$/, "");
      const foundFuzzy = Array.from(source.knownLinks).some(
        (known) => known.replace(/\/$/, "") === withoutTrailingSlash,
      );
      if (!foundFuzzy) {
        issues.push(`URL not in source: ${url}`);
      }
    }
  }

  const phones = aiOutputText.match(PHONE_REGEX) ?? [];
  for (const phone of phones) {
    const normalized = normalizePhone(phone);
    if (normalized.length < 8) continue;
    if (!source.knownPhones.has(normalized)) {
      const foundPartial = Array.from(source.knownPhones).some(
        (known) => known.includes(normalized) || normalized.includes(known),
      );
      if (!foundPartial) {
        issues.push(`Phone not in source: ${phone}`);
      }
    }
  }

  const quotedNames =
    aiOutputText.match(/"([A-ZŁŚĆŻŹĘĄŃÓ][A-Za-złśćżźęąńó\s'-]{2,40})"/g) ?? [];
  for (const quoted of quotedNames) {
    const name = quoted.replace(/"/g, "").toLowerCase().trim();
    if (name.length < 4) continue;
    if (!source.fullText.includes(name) && !source.knownPlaceNames.has(name)) {
      issues.push(`Unknown quoted name: "${quoted}"`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function validateStructuredOutput<T extends Record<string, unknown>>(
  output: T,
  source: SourceData,
  fieldsToValidate: string[],
): ValidationResult {
  const allText: string[] = [];

  for (const field of fieldsToValidate) {
    const value = getNestedValue(output, field);
    if (typeof value === "string") {
      allText.push(value);
    } else if (Array.isArray(value)) {
      allText.push(...value.filter((v) => typeof v === "string"));
    }
  }

  return validateAgainstSource(allText.join("\n"), source);
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

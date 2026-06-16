import { fetchWithCache } from "@/lib/cache/api-cache";

const WIKIVOYAGE_API = "https://en.wikivoyage.org/w/api.php";

export type WikivoyageDestinationContent = {
  title: string;
  intro: string;
  sections: {
    understand?: string;
    getIn?: string;
    getAround?: string;
    see?: string;
    do?: string;
    buy?: string;
    eat?: string;
    drink?: string;
    sleep?: string;
    stayHealthy?: string;
    stayConnected?: string;
    goNext?: string;
  };
  sourceUrl: string;
};

export async function fetchWikivoyageDestination({
  pageName,
  forceRefresh = false,
}: {
  pageName: string;
  forceRefresh?: boolean;
}): Promise<WikivoyageDestinationContent | null> {
  const { data } = await fetchWithCache<WikivoyageDestinationContent | null>({
    source: "wikivoyage-v2",
    cacheParams: { pageName },
    ttlSeconds: 60 * 24 * 60 * 60,
    forceRefresh,
    fetcher: async () => {
      const params = new URLSearchParams({
        action: "parse",
        page: pageName,
        format: "json",
        prop: "sections|text",
        formatversion: "2",
      });

      const response = await fetch(`${WIKIVOYAGE_API}?${params.toString()}`, {
        headers: {
          "User-Agent": "TravelAggregator/1.0 (personal use)",
        },
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Wikivoyage error: ${response.status}`);
      }

      const json = (await response.json()) as {
        parse?: {
          title: string;
          sections: Array<{ line: string; index: string; level: string }>;
          text: string;
        };
        error?: { code: string; info: string };
      };

      if (json.error) {
        if (json.error.code === "missingtitle") return null;
        throw new Error(`Wikivoyage API error: ${json.error.info}`);
      }

      if (!json.parse) return null;

      return parseWikivoyageHtml(json.parse.title, json.parse.text, pageName);
    },
  });

  return data;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    );
}

function stripHtml(raw: string): string {
  return decodeHtmlEntities(
    raw
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

/** Usuwa śmieci z surowego HTML Wikivoyage (linki [edit], przypisy). */
export function cleanWikivoyageText(text: string): string {
  return stripHtml(text)
    .replace(/\[\s*edit(?:\s*\|\s*edit source)?\s*\]/gi, "")
    .replace(/\[\d+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function excerptSentences(text: string, maxSentences = 3, maxChars = 520): string {
  const cleaned = cleanWikivoyageText(text);
  if (!cleaned) return "";

  const sentences =
    cleaned.match(/[^.!?]+[.!?]+(?:\s|$)/g)?.map((s) => s.trim()) ?? [cleaned];
  let result = "";
  for (const sentence of sentences.slice(0, maxSentences)) {
    const next = result ? `${result} ${sentence}` : sentence;
    if (next.length > maxChars) break;
    result = next;
  }

  if (result) return result;
  return cleaned.length > maxChars ? `${cleaned.slice(0, maxChars - 1).trim()}…` : cleaned;
}

function excerptSection(text: string, maxChars = 900): string {
  const cleaned = cleanWikivoyageText(text);
  if (cleaned.length <= maxChars) return cleaned;
  return `${cleaned.slice(0, maxChars - 1).trim()}…`;
}

function parseWikivoyageHtml(
  title: string,
  html: string,
  pageName: string,
): WikivoyageDestinationContent {
  const sectionRegex =
    /<h2[^>]*>.*?<span[^>]*class="mw-headline"[^>]*>(.+?)<\/span>/gi;
  const sections: Record<string, string> = {};

  const headings: { title: string; start: number; contentStart: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = sectionRegex.exec(html)) !== null) {
    headings.push({
      title: cleanWikivoyageText(match[1]),
      start: match.index,
      contentStart: match.index + match[0].length,
    });
  }

  const introRaw =
    headings.length > 0
      ? html.substring(0, headings[0].start)
      : html;

  for (let i = 0; i < headings.length; i++) {
    const end =
      i + 1 < headings.length ? headings[i + 1].start : html.length;
    const content = html.substring(headings[i].contentStart, end);
    sections[headings[i].title.toLowerCase()] = excerptSection(content);
  }

  return {
    title,
    intro: excerptSentences(introRaw),
    sections: {
      understand: sections["understand"],
      getIn: sections["get in"],
      getAround: sections["get around"],
      see: sections["see"],
      do: sections["do"],
      buy: sections["buy"],
      eat: sections["eat"],
      drink: sections["drink"],
      sleep: sections["sleep"],
      stayHealthy: sections["stay safe"] ?? sections["stay healthy"],
      stayConnected: sections["connect"] ?? sections["stay connected"],
      goNext: sections["go next"],
    },
    sourceUrl: `https://en.wikivoyage.org/wiki/${encodeURIComponent(pageName)}`,
  };
}

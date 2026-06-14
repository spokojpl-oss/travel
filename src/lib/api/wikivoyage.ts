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
    source: "wikivoyage",
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

function parseWikivoyageHtml(
  title: string,
  html: string,
  pageName: string,
): WikivoyageDestinationContent {
  const stripHtml = (s: string) =>
    s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  const sectionRegex =
    /<h2[^>]*>.*?<span[^>]*class="mw-headline"[^>]*>(.+?)<\/span>/gi;
  const sections: Record<string, string> = {};

  const headings: { title: string; pos: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = sectionRegex.exec(html)) !== null) {
    headings.push({ title: stripHtml(match[1]), pos: match.index });
  }

  const intro =
    headings.length > 0
      ? stripHtml(html.substring(0, headings[0].pos))
      : stripHtml(html);

  for (let i = 0; i < headings.length; i++) {
    const start = headings[i].pos;
    const end = i + 1 < headings.length ? headings[i + 1].pos : html.length;
    const content = stripHtml(html.substring(start, end));
    sections[headings[i].title.toLowerCase()] = content;
  }

  return {
    title,
    intro: intro.substring(0, 2000),
    sections: {
      understand: sections["understand"]?.substring(0, 3000),
      getIn: sections["get in"]?.substring(0, 3000),
      getAround: sections["get around"]?.substring(0, 3000),
      see: sections["see"]?.substring(0, 5000),
      do: sections["do"]?.substring(0, 5000),
      buy: sections["buy"]?.substring(0, 2000),
      eat: sections["eat"]?.substring(0, 3000),
      drink: sections["drink"]?.substring(0, 2000),
      sleep: sections["sleep"]?.substring(0, 2000),
      stayHealthy: sections["stay safe"] ?? sections["stay healthy"],
      stayConnected: sections["connect"] ?? sections["stay connected"],
      goNext: sections["go next"]?.substring(0, 1500),
    },
    sourceUrl: `https://en.wikivoyage.org/wiki/${encodeURIComponent(pageName)}`,
  };
}

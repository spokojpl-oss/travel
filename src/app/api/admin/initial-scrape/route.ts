import { NextResponse } from "next/server";
import {
  performGlobalOsmScrape,
  tagAttractionsWithActivities,
} from "@/lib/api/osm-global-scrape";
import { OSM_SCRAPE_CATEGORIES } from "@/lib/api/osm-scrape-categories";
import { EUROPE_SCRAPE_REGIONS } from "@/lib/api/osm-scrape-regions";
import type { OsmCategory } from "@/lib/api/osm";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminEmails, isAdminEmail } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        hint:
          getAdminEmails().length === 0
            ? "Ustaw ADMIN_EMAILS na Vercel i zrób redeploy."
            : `Zaloguj się jako: ${getAdminEmails().join(", ")}`,
      },
      { status: 403 },
    );
  }

  let serviceRoleOk = false;
  let serviceRoleError: string | null = null;
  try {
    const admin = createAdminClient();
    const { count, error } = await admin
      .from("attractions")
      .select("*", { count: "exact", head: true });
    if (error) {
      serviceRoleError = error.message;
    } else {
      serviceRoleOk = true;
      void count;
    }
  } catch (e) {
    serviceRoleError = e instanceof Error ? e.message : String(e);
  }

  if (!serviceRoleOk) {
    return NextResponse.json(
      {
        error: "SUPABASE_SERVICE_ROLE_KEY invalid or missing",
        detail: serviceRoleError,
        hint: "Sprawdź zmienną na Vercel — klucz musi zaczynać się od eyJ i pochodzić z tego samego projektu Supabase co seed SQL.",
      },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const europe = searchParams.get("europe") === "true";
  const bboxParam = searchParams.get("bbox");
  const bboxFilter = europe
    ? [...EUROPE_SCRAPE_REGIONS]
    : bboxParam
      ? [bboxParam.trim()]
      : undefined;
  const categoryParam = searchParams.get("category");
  const categoryFilter: OsmCategory[] | undefined =
    categoryParam &&
    OSM_SCRAPE_CATEGORIES.includes(categoryParam as OsmCategory)
      ? [categoryParam as OsmCategory]
      : undefined;
  const skipScrape = searchParams.get("skipScrape") === "true";
  const skipTagging = searchParams.get("skipTagging") === "true";

  const requestStarted = Date.now();
  // #region agent log
  fetch("http://127.0.0.1:7245/ingest/173647fd-e041-4dc5-8254-79e68a12fc0f", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "0c16de" },
    body: JSON.stringify({
      sessionId: "0c16de",
      hypothesisId: "E",
      location: "initial-scrape/route.ts:POST",
      message: "request start",
      data: { bboxFilter, categoryFilter, skipScrape, skipTagging },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  const results: Record<string, unknown> = {};

  if (!skipScrape) {
    results.scrape = await performGlobalOsmScrape({
      bboxFilter,
      categoryFilter,
      delayBetweenRequestsMs: categoryFilter ? 400 : 1200,
    });
  }

  if (!skipTagging) {
    results.tagging = await tagAttractionsWithActivities();
  }

  const scrape = results.scrape as
    | {
        total_fetched?: number;
        total_persisted?: number;
        errors?: Array<{ bbox: string; category: string; error: string }>;
      }
    | undefined;
  const tagging = results.tagging as
    | {
        total_attractions?: number;
        total_tags_created?: number;
        attractions_with_tags?: number;
        errors?: string[];
      }
    | undefined;

  const persisted = scrape?.total_persisted ?? 0;
  const tagsCreated = tagging?.total_tags_created ?? 0;
  const scrapeErrors = scrape?.errors?.length ?? 0;
  const taggingErrors = tagging?.errors?.length ?? 0;

  const warnings: string[] = [];
  if (!skipScrape && persisted === 0) {
    warnings.push(
      scrapeErrors > 0
        ? `Scrape zakończony z ${scrapeErrors} błędami i 0 zapisanych atrakcji.`
        : "Scrape nie zapisał żadnych atrakcji (Overpass zwrócił 0 miejsc z nazwą).",
    );
  }
  if (!skipTagging && tagsCreated === 0 && (tagging?.total_attractions ?? 0) > 0) {
    warnings.push(
      taggingErrors > 0
        ? `Tagowanie nie utworzyło tagów (${taggingErrors} błędów zapisu).`
        : "Tagowanie nie dopasowało żadnych aktywności do atrakcji.",
    );
  }
  if (taggingErrors > 0 && tagsCreated > 0) {
    warnings.push(
      `Tagowanie częściowo udane: ${tagsCreated} tagów, ${taggingErrors} błędów zapisu.`,
    );
  }

  const durationMs = Date.now() - requestStarted;
  if (!skipScrape && bboxFilter && bboxFilter.length === 0) {
    warnings.push("Nie rozpoznano regionu bbox — sprawdź nazwę regionu.");
  }

  // #region agent log
  fetch("http://127.0.0.1:7245/ingest/173647fd-e041-4dc5-8254-79e68a12fc0f", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "0c16de" },
    body: JSON.stringify({
      sessionId: "0c16de",
      hypothesisId: "A",
      location: "initial-scrape/route.ts:POST",
      message: "request done",
      data: {
        durationMs,
        persisted,
        fetched: scrape?.total_fetched ?? 0,
        scrapeErrors,
        warnings,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  return NextResponse.json({
    success: warnings.length === 0,
    warnings,
    results,
    duration_ms: durationMs,
    summary: {
      fetched: scrape?.total_fetched ?? 0,
      persisted,
      scrape_errors: scrapeErrors,
      attractions_tagged: tagging?.total_attractions ?? 0,
      tags_created: tagsCreated,
      attractions_with_tags: tagging?.attractions_with_tags ?? 0,
      tagging_errors: taggingErrors,
    },
  });
}

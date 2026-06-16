import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminEmails, isAdminEmail } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const isAdmin = isAdminEmail(user.email);
  const adminEmails = getAdminEmails();

  let serviceRoleOk = false;
  let serviceRoleError: string | null = null;
  let activities = 0;
  let attractions = 0;
  let tags = 0;
  let osmMappings = 0;
  let supabaseHost: string | null = null;

  try {
    const admin = createAdminClient();
    supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;

    const [
      { count: activitiesCount, error: activitiesError },
      { count: attractionsCount, error: attractionsError },
      { count: tagsCount, error: tagsError },
      { count: mappingsCount, error: mappingsError },
    ] = await Promise.all([
      admin.from("activities").select("*", { count: "exact", head: true }),
      admin.from("attractions").select("*", { count: "exact", head: true }),
      admin
        .from("attraction_activity_tags")
        .select("*", { count: "exact", head: true }),
      admin
        .from("activity_osm_mappings")
        .select("*", { count: "exact", head: true }),
    ]);

    if (
      activitiesError ||
      attractionsError ||
      tagsError ||
      mappingsError
    ) {
      serviceRoleError =
        activitiesError?.message ??
        attractionsError?.message ??
        tagsError?.message ??
        mappingsError?.message ??
        "Count query failed";
    } else {
      serviceRoleOk = true;
      activities = activitiesCount ?? 0;
      attractions = attractionsCount ?? 0;
      tags = tagsCount ?? 0;
      osmMappings = mappingsCount ?? 0;
    }
  } catch (e) {
    serviceRoleError = e instanceof Error ? e.message : String(e);
  }

  const searchReady = tags > 0;
  const issues: string[] = [];

  if (!serviceRoleOk) {
    issues.push(
      "SUPABASE_SERVICE_ROLE_KEY nie działa — scrape nie zapisze danych do bazy.",
    );
  }
  if (adminEmails.length === 0) {
    issues.push("ADMIN_EMAILS nie jest ustawione na Vercel.");
  } else if (!isAdmin) {
    issues.push(
      `Twoje konto (${user.email}) nie jest na liście adminów: ${adminEmails.join(", ")}`,
    );
  }
  if (activities === 0) {
    issues.push("Brak aktywności w bazie — uruchom seed activities.sql.");
  }
  if (osmMappings === 0) {
    issues.push("Brak mapowań OSM — uruchom seed activities.sql (sekcja mappings).");
  }
  if (attractions === 0) {
    issues.push("Brak atrakcji — uruchom initial-scrape (OSM).");
  } else if (tags === 0) {
    issues.push(
      "Atrakcje są, ale brak tagów — kliknij „Tylko tagowanie” poniżej (lub POST /api/admin/initial-scrape?skipScrape=true).",
    );
  }

  return NextResponse.json({
    user: { email: user.email, is_admin: isAdmin },
    supabase_host: supabaseHost,
    service_role_ok: serviceRoleOk,
    service_role_error: serviceRoleError,
    admin_emails_configured: adminEmails.length > 0,
    google_places_configured: Boolean(process.env.GOOGLE_PLACES_API_KEY?.trim()),
    counts: {
      activities,
      attractions,
      tags,
      osm_mappings: osmMappings,
    },
    search_ready: searchReady,
    issues,
  });
}

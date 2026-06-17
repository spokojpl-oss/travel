/**
 * Pomocniczo: lista destynacji z liczbą tras rowerowych.
 * npm run list:cycling-destinations
 * npm run list:cycling-destinations -- --name=Mallorca
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Ustaw NEXT_PUBLIC_SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY");
  }

  const nameFilter = process.argv
    .find((a) => a.startsWith("--name="))
    ?.replace("--name=", "")
    .trim();

  const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let query = supabase
    .from("destinations")
    .select("id, name, slug, country_code")
    .order("name")
    .limit(50);

  if (nameFilter) {
    query = query.ilike("name", `%${nameFilter}%`);
  }

  const { data: destinations, error } = await query;
  if (error) throw error;

  if (!destinations?.length) {
    console.log("Brak destynacji. Najpierw zbuduj destynację przez flow w aplikacji.");
    return;
  }

  console.log("Destynacje (użyj id w scrape:cycling-osm):\n");

  for (const dest of destinations) {
    const { count } = await supabase
      .from("activity_routes")
      .select("*", { count: "exact", head: true })
      .eq("destination_id", dest.id);

    console.log(
      `- ${dest.name} (${dest.country_code})`,
      `\n  id:   ${dest.id}`,
      `\n  slug: ${dest.slug}`,
      `\n  trasy: ${count ?? 0}\n`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

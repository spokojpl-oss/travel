import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";
import type { Advisor, Advisory, AdvisorContext } from "./types";

import { accommodationLocationAdvisor } from "./accommodation-location";
import { openJawAdvisor } from "./open-jaw";
import { weatherPlanBAdvisor } from "./weather-plan-b";
import { seasonalEventAdvisor } from "./seasonal-event";
import { reviewRedFlagAdvisor } from "./review-red-flags";

const ALL_ADVISORS: Advisor[] = [
  accommodationLocationAdvisor,
  openJawAdvisor,
  weatherPlanBAdvisor,
  seasonalEventAdvisor,
  reviewRedFlagAdvisor,
];

export async function runAdvisors(context: AdvisorContext): Promise<Advisory[]> {
  const results = await Promise.all(
    ALL_ADVISORS.map((advisor) =>
      advisor.analyze(context).catch((e) => {
        console.error(`Advisor ${advisor.category} failed:`, e);
        return [];
      }),
    ),
  );
  return results.flat();
}

export async function persistAdvisories(
  tripId: string,
  advisories: Advisory[],
  options?: { replace?: boolean },
): Promise<void> {
  const supabase = createAdminClient();

  if (options?.replace) {
    await supabase
      .from("trip_advisories")
      .delete()
      .eq("trip_id", tripId)
      .is("dismissed_at", null);
  }

  if (advisories.length === 0) return;

  const rows = advisories.map((a) => ({
    trip_id: tripId,
    category: a.category,
    severity: a.severity,
    title: a.title,
    reasoning: a.reasoning,
    suggested_action: a.suggested_action ?? null,
    source_facts: a.source_facts as Json,
    estimated_savings_pln: a.estimated_savings_pln ?? null,
  }));

  const { error } = await supabase.from("trip_advisories").insert(rows);
  if (error) {
    throw new Error(`Failed to persist advisories: ${error.message}`);
  }
}

export { SEVERITY_ORDER } from "./types";

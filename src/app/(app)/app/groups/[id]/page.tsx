import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DeleteGroupButton } from "@/components/features/delete-group-button";
import { SetDefaultGroupButton } from "@/components/features/set-default-group-button";
import {
  MEMBER_TYPE_LABELS,
  TRAVEL_STYLE_LABELS,
} from "@/types/domain";

function formatList(items: string[] | null | undefined): string {
  if (!items || items.length === 0) return "—";
  return items.join(", ");
}

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: group } = await supabase
    .from("travel_groups")
    .select("*")
    .eq("id", id)
    .single();

  if (!group) notFound();

  const { data: members } = await supabase
    .from("group_members")
    .select("*")
    .eq("group_id", id)
    .order("created_at");

  const { data: preferences } = await supabase
    .from("group_preferences")
    .select("*")
    .eq("group_id", id)
    .single();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("default_group_id")
    .eq("id", user!.id)
    .single();

  const isDefault = profile?.default_group_id === id;

  return (
    <div>
      <p className="mb-4">
        <Link href="/app/groups" className="underline">
          ← Moje grupy
        </Link>
      </p>

      <h1 className="text-2xl font-bold mb-1">{group.name}</h1>
      {isDefault && (
        <span className="text-sm text-green-700">(grupa domyślna)</span>
      )}
      {group.description && <p className="mt-2 text-gray-600">{group.description}</p>}

      <section className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Członkowie</h2>
        <ul className="space-y-2">
          {members?.map((m) => (
            <li key={m.id} className="border p-3 rounded">
              <strong>{m.name || "Bez imienia"}</strong> –{" "}
              {MEMBER_TYPE_LABELS[m.member_type]}
              {m.age !== null && `, ${m.age} lat`}
              {m.notes && <span className="text-gray-600"> ({m.notes})</span>}
            </li>
          ))}
        </ul>
      </section>

      {preferences && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold mb-2">Preferencje</h2>
          <dl className="grid grid-cols-1 gap-2 text-sm">
            <div>
              <dt className="font-medium">Styl</dt>
              <dd>{TRAVEL_STYLE_LABELS[preferences.travel_style]}</dd>
            </div>
            <div>
              <dt className="font-medium">Środowisko</dt>
              <dd>{formatList(preferences.environment_preferences)}</dd>
            </div>
            <div>
              <dt className="font-medium">Budżet całkowity</dt>
              <dd>
                {preferences.budget_total_pln
                  ? `${preferences.budget_total_pln} PLN`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="font-medium">Budżet na osobę</dt>
              <dd>
                {preferences.budget_per_person_pln
                  ? `${preferences.budget_per_person_pln} PLN`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="font-medium">Max przesiadki</dt>
              <dd>{preferences.max_flight_stops}</dd>
            </div>
            <div>
              <dt className="font-medium">Max czas lotu</dt>
              <dd>
                {preferences.max_flight_duration_hours
                  ? `${preferences.max_flight_duration_hours} h`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="font-medium">Zakwaterowanie</dt>
              <dd>{formatList(preferences.accommodation_types)}</dd>
            </div>
            <div>
              <dt className="font-medium">Wyżywienie</dt>
              <dd>{formatList(preferences.meal_plan_preferences)}</dd>
            </div>
            <div>
              <dt className="font-medium">Dieta</dt>
              <dd>{formatList(preferences.dietary_restrictions)}</dd>
            </div>
            <div>
              <dt className="font-medium">Wykluczenia</dt>
              <dd>{formatList(preferences.exclusions)}</dd>
            </div>
            <div>
              <dt className="font-medium">Polskojęzyczny przewodnik</dt>
              <dd>
                {preferences.polish_speaking_guide_required ? "Tak" : "Nie"}
              </dd>
            </div>
            {preferences.accessibility_needs && (
              <div>
                <dt className="font-medium">Dostępność</dt>
                <dd>{preferences.accessibility_needs}</dd>
              </div>
            )}
            {preferences.notes && (
              <div>
                <dt className="font-medium">Notatki</dt>
                <dd>{preferences.notes}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <div className="mt-8 flex flex-wrap gap-4">
        <Link
          href={`/app/groups/${id}/edit`}
          className="border px-4 py-2 rounded"
        >
          Edytuj
        </Link>

        {!isDefault && <SetDefaultGroupButton groupId={id} />}

        <DeleteGroupButton groupId={id} />
      </div>
    </div>
  );
}

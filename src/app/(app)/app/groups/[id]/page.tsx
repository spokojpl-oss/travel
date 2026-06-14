import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DeleteGroupButton } from "@/components/features/delete-group-button";
import { SetDefaultGroupButton } from "@/components/features/set-default-group-button";
import { PageContainer, Breadcrumb } from "@/components/layout/Header";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  MEMBER_TYPE_LABELS,
  TRAVEL_STYLE_LABELS,
} from "@/types/domain";

const ENV_LABELS: Record<string, string> = {
  mountain: "Góry",
  beach: "Morze",
  city: "Miasto",
  countryside: "Wieś",
  lake: "Jezioro",
};

const ACCOMMODATION_LABELS: Record<string, string> = {
  hotel: "Hotel",
  apartment: "Apartament",
  villa: "Willa",
  hostel: "Hostel",
  camping: "Camping",
};

function formatList(
  items: string[] | null | undefined,
  labels?: Record<string, string>,
): string {
  if (!items || items.length === 0) return "—";
  if (labels) return items.map((i) => labels[i] ?? i).join(", ");
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
    <PageContainer>
      <Breadcrumb
        items={[
          { label: "Start", href: "/app" },
          { label: "Grupy", href: "/app/groups" },
          { label: group.name },
        ]}
      />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h1 className="font-display text-3xl font-bold text-text-primary">
              {group.name}
            </h1>
            {isDefault && <Badge variant="success">Domyślna</Badge>}
          </div>
          {group.description && (
            <p className="text-text-secondary">{group.description}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/app/groups/${id}/edit`}>
            <Button variant="secondary" size="sm">
              Edytuj
            </Button>
          </Link>
          {!isDefault && <SetDefaultGroupButton groupId={id} />}
          <DeleteGroupButton groupId={id} />
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader title={`Członkowie (${members?.length ?? 0})`} />
        <CardBody>
          <ul className="space-y-3">
            {members?.map((m) => (
              <li
                key={m.id}
                className="rounded-lg border border-border-default bg-bg-soft px-4 py-3"
              >
                <p className="font-medium text-text-primary">
                  {m.name || "Bez imienia"}
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  {MEMBER_TYPE_LABELS[m.member_type]}
                  {m.age !== null && ` · ${m.age} lat`}
                  {m.notes && ` · ${m.notes}`}
                </p>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      {preferences && (
        <Card>
          <CardHeader title="Preferencje" />
          <CardBody>
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailItem
                label="Styl wyjazdu"
                value={TRAVEL_STYLE_LABELS[preferences.travel_style]}
              />
              <DetailItem
                label="Środowisko"
                value={formatList(
                  preferences.environment_preferences,
                  ENV_LABELS,
                )}
              />
              <DetailItem
                label="Budżet całkowity"
                value={
                  preferences.budget_total_pln
                    ? `${preferences.budget_total_pln} PLN`
                    : "—"
                }
              />
              <DetailItem
                label="Budżet na osobę"
                value={
                  preferences.budget_per_person_pln
                    ? `${preferences.budget_per_person_pln} PLN`
                    : "—"
                }
              />
              <DetailItem
                label="Max przesiadki"
                value={String(preferences.max_flight_stops)}
              />
              <DetailItem
                label="Max czas lotu"
                value={
                  preferences.max_flight_duration_hours
                    ? `${preferences.max_flight_duration_hours} h`
                    : "—"
                }
              />
              <DetailItem
                label="Zakwaterowanie"
                value={formatList(
                  preferences.accommodation_types,
                  ACCOMMODATION_LABELS,
                )}
              />
              <DetailItem
                label="Wyżywienie"
                value={formatList(preferences.meal_plan_preferences)}
              />
              <DetailItem
                label="Dieta"
                value={formatList(preferences.dietary_restrictions)}
              />
              <DetailItem
                label="Wykluczenia"
                value={formatList(preferences.exclusions)}
              />
              <DetailItem
                label="Polskojęzyczny przewodnik"
                value={
                  preferences.polish_speaking_guide_required ? "Tak" : "Nie"
                }
              />
              {preferences.accessibility_needs && (
                <DetailItem
                  label="Dostępność"
                  value={preferences.accessibility_needs}
                  className="sm:col-span-2"
                />
              )}
              {preferences.notes && (
                <DetailItem
                  label="Notatki"
                  value={preferences.notes}
                  className="sm:col-span-2"
                />
              )}
            </dl>
          </CardBody>
        </Card>
      )}
    </PageContainer>
  );
}

function DetailItem({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-text-primary">{value}</dd>
    </div>
  );
}

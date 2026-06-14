import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GroupForm } from "@/components/features/group-form";
import { PageContainer, Breadcrumb } from "@/components/layout/Header";
import type { FullGroupCreate } from "@/lib/schemas/group";

export default async function EditGroupPage({
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

  const initialData: FullGroupCreate = {
    group: {
      name: group.name,
      description: group.description,
    },
    members:
      members?.map((m) => ({
        name: m.name,
        member_type: m.member_type,
        age: m.age,
        notes: m.notes,
      })) ?? [],
    preferences: preferences
      ? {
          travel_style: preferences.travel_style,
          environment_preferences: preferences.environment_preferences,
          budget_total_pln: preferences.budget_total_pln,
          budget_per_person_pln: preferences.budget_per_person_pln,
          max_flight_stops: preferences.max_flight_stops,
          max_flight_duration_hours: preferences.max_flight_duration_hours,
          accommodation_types: preferences.accommodation_types,
          meal_plan_preferences: preferences.meal_plan_preferences,
          dietary_restrictions: preferences.dietary_restrictions,
          accessibility_needs: preferences.accessibility_needs,
          exclusions: preferences.exclusions,
          polish_speaking_guide_required:
            preferences.polish_speaking_guide_required,
          notes: preferences.notes,
        }
      : {
          travel_style: "mixed",
          environment_preferences: [],
          budget_total_pln: null,
          budget_per_person_pln: null,
          max_flight_stops: 2,
          max_flight_duration_hours: null,
          accommodation_types: [],
          meal_plan_preferences: [],
          dietary_restrictions: [],
          accessibility_needs: null,
          exclusions: [],
          polish_speaking_guide_required: false,
          notes: null,
        },
  };

  return (
    <PageContainer>
      <Breadcrumb
        items={[
          { label: "Start", href: "/app" },
          { label: "Grupy", href: "/app/groups" },
          { label: group.name, href: `/app/groups/${id}` },
          { label: "Edycja" },
        ]}
      />

      <h1 className="font-display mb-8 text-3xl font-bold text-text-primary">
        Edytuj: {group.name}
      </h1>

      <GroupForm mode="edit" groupId={id} initialData={initialData} />
    </PageContainer>
  );
}

import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/features/profile-form";
import { PageContainer, Breadcrumb } from "@/components/layout/Header";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  const { data: groups } = await supabase
    .from("travel_groups")
    .select("id, name")
    .order("name");

  return (
    <PageContainer>
      <Breadcrumb
        items={[
          { label: "Start", href: "/app" },
          { label: "Profil" },
        ]}
      />

      <h1 className="font-display mb-2 text-3xl font-bold text-text-primary">
        Profil
      </h1>
      <p className="mb-8 text-sm text-text-secondary">
        Twoje dane konta i domyślna grupa podróżna używana przy planowaniu.
      </p>

      <ProfileForm
        email={user!.email ?? ""}
        displayName={profile?.display_name ?? ""}
        defaultGroupId={profile?.default_group_id ?? null}
        groups={groups ?? []}
      />
    </PageContainer>
  );
}

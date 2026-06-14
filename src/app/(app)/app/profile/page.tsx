import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/features/profile-form";

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
    <div>
      <h1 className="text-2xl font-bold mb-4">Profil</h1>
      <ProfileForm
        email={user!.email ?? ""}
        displayName={profile?.display_name ?? ""}
        defaultGroupId={profile?.default_group_id ?? null}
        groups={groups ?? []}
      />
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { HeroSearch } from "@/components/features/HeroSearch";
import { AppHomeShell } from "@/components/features/AppHomeShell";
import { PageContainer } from "@/components/layout/Header";

export default async function AppHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  return (
    <>
      <HeroSearch compact />
      <PageContainer>
        <AppHomeShell
          displayName={profile?.display_name ?? user!.email ?? ""}
        />
      </PageContainer>
    </>
  );
}

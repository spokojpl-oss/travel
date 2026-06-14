import { createClient } from "@/lib/supabase/server";

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
    <div>
      <h1 className="text-2xl font-bold mb-2">
        Cześć, {profile?.display_name ?? user!.email}
      </h1>
      <p>
        Tu będzie wyszukiwarka. Na razie zarządzaj swoimi grupami podróżnymi.
      </p>
      <p className="mt-4">
        <a href="/app/groups" className="underline">
          Przejdź do moich grup →
        </a>
      </p>
    </div>
  );
}

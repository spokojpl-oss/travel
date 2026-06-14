import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div>
      <nav className="border-b px-8 py-3 flex gap-4 items-center">
        <a href="/app" className="underline">
          Strona główna
        </a>
        <a href="/app/groups" className="underline">
          Moje grupy
        </a>
        <a href="/app/profile" className="underline">
          Profil
        </a>
        <form action="/auth/logout" method="POST" className="ml-auto">
          <button type="submit" className="underline">
            Wyloguj
          </button>
        </form>
      </nav>
      <main className="p-8">{children}</main>
    </div>
  );
}

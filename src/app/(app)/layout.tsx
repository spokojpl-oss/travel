import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin/auth";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

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
    <div className="flex min-h-full flex-col bg-white">
      <Header
        userEmail={user.email ?? undefined}
        isAdmin={isAdminEmail(user.email)}
        variant="app"
      />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

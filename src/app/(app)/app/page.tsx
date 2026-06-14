import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { HeroSearch } from "@/components/features/HeroSearch";
import { HowItWorksGuide } from "@/components/features/HowItWorksGuide";
import { PageContainer } from "@/components/layout/Header";
import { Card, CardBody } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";

const quickLinks: Array<{
  href: string;
  title: string;
  desc: string;
  icon: IconName;
}> = [
  {
    href: "/app/trips",
    title: "Moje wyjazdy",
    desc: "Plany, dokumenty i inteligentne porady",
    icon: "folder",
  },
  {
    href: "/app/compare",
    title: "Porównaj tripy",
    desc: "Madera vs Mallorca vs Kreta — liczby zamiast domysłów",
    icon: "scale",
  },
  {
    href: "/app/groups",
    title: "Grupy podróżne",
    desc: "Profil rodziny i preferencje",
    icon: "users",
  },
];

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
        <p className="mb-8 text-lg text-text-secondary">
          Cześć,{" "}
          <strong className="text-text-primary">
            {profile?.display_name ?? user!.email}
          </strong>
          ! Gdzie dziś planujemy?
        </p>

        <HowItWorksGuide className="mb-10" />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="card-hover h-full transition-shadow hover:shadow-cardHover">
                <CardBody>
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                    <Icon name={link.icon} size={22} />
                  </div>
                  <h2 className="font-display text-lg font-bold text-text-primary">
                    {link.title}
                  </h2>
                  <p className="mt-2 text-sm text-text-secondary">{link.desc}</p>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      </PageContainer>
    </>
  );
}

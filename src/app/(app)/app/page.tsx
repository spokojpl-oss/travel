import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { HeroSearch } from "@/components/features/HeroSearch";
import { PageContainer } from "@/components/layout/Header";
import { Card, CardBody } from "@/components/ui/Card";

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

  const quickLinks = [
    {
      href: "/app/search",
      title: "Wyszukiwarka aktywności",
      desc: "Znajdź regiony pasujące do Twoich zainteresowań",
      icon: "🎯",
    },
    {
      href: "/app/trips",
      title: "Moje wyjazdy",
      desc: "Plany, dokumenty i inteligentne porady",
      icon: "🗂️",
    },
    {
      href: "/app/compare",
      title: "Porównaj tripy",
      desc: "Madera vs Mallorca vs Kreta — liczby zamiast domysłów",
      icon: "⚖️",
    },
    {
      href: "/app/groups",
      title: "Grupy podróżne",
      desc: "Profil rodziny i preferencje",
      icon: "👥",
    },
  ];

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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="card-hover h-full transition-shadow hover:shadow-cardHover">
                <CardBody>
                  <div className="mb-3 text-2xl">{link.icon}</div>
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

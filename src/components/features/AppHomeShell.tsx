"use client";

import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { HowItWorksGuide } from "@/components/features/HowItWorksGuide";
import { useT } from "@/i18n/locale-provider";

export function AppHomeShell({ displayName }: { displayName: string }) {
  const t = useT();

  const quickLinks: Array<{
    href: string;
    title: string;
    desc: string;
    icon: IconName;
  }> = [
    {
      href: "/app/trips",
      title: t("app.quickTrips"),
      desc: t("app.quickTripsDesc"),
      icon: "folder",
    },
    {
      href: "/app/compare",
      title: t("app.quickCompare"),
      desc: t("app.quickCompareDesc"),
      icon: "scale",
    },
    {
      href: "/app/groups",
      title: t("app.quickGroups"),
      desc: t("app.quickGroupsDesc"),
      icon: "users",
    },
  ];

  return (
    <>
      <p className="mb-8 text-lg text-text-secondary">
        {t("app.greeting")}{" "}
        <strong className="text-text-primary">{displayName}</strong>
        {t("app.greetingQuestion")}
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
    </>
  );
}

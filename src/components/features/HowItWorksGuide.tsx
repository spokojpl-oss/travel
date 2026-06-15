"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";
import { useT } from "@/i18n/locale-provider";

export function HowItWorksGuide({
  variant = "full",
  className,
}: {
  variant?: "full" | "compact";
  className?: string;
}) {
  const t = useT();

  const steps = useMemo(
    () => [
      {
        icon: "search" as IconName,
        title: t("guide.step1Title"),
        body: t("guide.step1Body"),
      },
      {
        icon: "target" as IconName,
        title: t("guide.step2Title"),
        body: t("guide.step2Body"),
      },
      {
        icon: "map-pin" as IconName,
        title: t("guide.step3Title"),
        body: t("guide.step3Body"),
      },
      {
        icon: "folder" as IconName,
        title: t("guide.step4Title"),
        body: t("guide.step4Body"),
      },
    ],
    [t],
  );

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "rounded-xl border border-brand-200 bg-brand-50/50 p-4 text-sm",
          className,
        )}
      >
        <p className="font-medium text-text-primary">{t("guide.compactTitle")}</p>
        <p className="mt-1 text-text-secondary">
          {t("guide.compactBody")}{" "}
          <Link href="/app#guide" className="font-semibold text-brand-700 hover:underline">
            {t("guide.compactLink")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <section id="guide" className={cn("scroll-mt-8", className)}>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-text-primary">
          {t("guide.title")}
        </h2>
        <p className="mt-2 max-w-2xl text-base text-text-secondary">
          {t("guide.intro")}
        </p>
      </div>

      <ol className="space-y-4">
        {steps.map((step) => (
          <li
            key={step.title}
            className="flex gap-4 rounded-xl border border-border-default bg-white p-5 shadow-sm"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <Icon name={step.icon} size={22} />
            </div>
            <div>
              <h3 className="font-display font-bold text-text-primary">{step.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-6 text-sm text-text-secondary">
        <strong className="text-text-primary">{t("nav.groups")}</strong> — {t("guide.groupsNote")}{" "}
        <Link href="/app/groups" className="font-semibold text-brand-700 hover:underline">
          {t("guide.groupsLink")}
        </Link>
      </p>
    </section>
  );
}

export function EmptyStateGuide({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="mt-6 rounded-xl border border-dashed border-border-default py-10 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-700">
        <Icon name="help-circle" size={28} />
      </div>
      <h3 className="font-display text-lg font-bold text-text-primary">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">{description}</p>
      <Link
        href={actionHref}
        className="mt-6 inline-flex rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
      >
        {actionLabel}
      </Link>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useT } from "@/i18n/locale-provider";

export function HomeCtaSection() {
  const t = useT();

  return (
    <section className="border-t border-border-default bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 text-center lg:px-8">
        <h2 className="font-display text-2xl font-bold text-text-primary">
          {t("landing.ctaTitle")}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-text-secondary">
          {t("landing.ctaBody")}
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex rounded-xl bg-accent-500 px-8 py-4 text-base font-bold text-white shadow-md transition-all hover:bg-accent-600 active:scale-[0.99]"
        >
          {t("landing.ctaButton")}
        </Link>
      </div>
    </section>
  );
}

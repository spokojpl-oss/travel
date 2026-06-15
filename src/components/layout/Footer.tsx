"use client";

import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { useT } from "@/i18n/locale-provider";

export function Footer() {
  const t = useT();

  return (
    <footer className="mt-auto border-t border-border-default bg-bg-soft">
      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="mb-4">
              <Logo variant="footer" href="/" />
            </div>
            <p className="text-sm leading-relaxed text-text-secondary">
              {t("footer.tagline")}
            </p>
          </div>

          <div>
            <h3 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-text-primary">
              {t("footer.tools")}
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  href="/app#search"
                  className="text-text-secondary transition-colors hover:text-brand-700"
                >
                  {t("footer.search")}
                </Link>
              </li>
              <li>
                <Link
                  href="/app/trips"
                  className="text-text-secondary transition-colors hover:text-brand-700"
                >
                  {t("nav.trips")}
                </Link>
              </li>
              <li>
                <Link
                  href="/app/compare"
                  className="text-text-secondary transition-colors hover:text-brand-700"
                >
                  {t("nav.compare")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-text-primary">
              {t("footer.account")}
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  href="/app/profile"
                  className="text-text-secondary transition-colors hover:text-brand-700"
                >
                  {t("nav.profile")}
                </Link>
              </li>
              <li>
                <Link
                  href="/app/groups"
                  className="text-text-secondary transition-colors hover:text-brand-700"
                >
                  {t("footer.travelGroups")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-text-primary">
              {t("footer.help")}
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <span className="text-text-tertiary">{t("footer.faqSoon")}</span>
              </li>
              <li>
                <span className="text-text-tertiary">{t("footer.privacySoon")}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border-default pt-6 text-sm text-text-tertiary">
          © {new Date().getFullYear()} Travel.app · {t("footer.copyright")}
        </div>
      </div>
    </footer>
  );
}

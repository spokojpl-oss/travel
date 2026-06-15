"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Logo } from "@/components/ui/Logo";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { useT } from "@/i18n/locale-provider";

export function Header({
  userEmail,
  variant = "app",
}: {
  userEmail?: string;
  variant?: "app" | "public";
}) {
  const t = useT();
  const [mobileOpen, setMobileOpen] = useState(false);
  const homeHref = variant === "app" ? "/app" : "/";
  const navLinks = [
    { href: homeHref, label: t("nav.plan") },
    { href: "/app/trips", label: t("nav.trips") },
    { href: "/app/compare", label: t("nav.compare") },
    { href: "/app#guide", label: t("nav.howItWorks") },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-brand-800 bg-brand-900 text-text-on-brand shadow-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
        <Logo variant="header" href={homeHref} />

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3.5 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          {variant === "app" && (
            <Link
              href="/app/groups"
              className="rounded-md px-3.5 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white"
            >
              {t("nav.groups")}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher className="hidden sm:inline-flex" />

          {userEmail ? (
            <div className="hidden items-center gap-3 md:flex">
              <span className="max-w-[180px] truncate text-sm text-white/70">
                {userEmail}
              </span>
              <Link
                href="/app/profile"
                className="rounded-md border border-white/10 bg-white/10 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/15"
              >
                {t("nav.profile")}
              </Link>
              <form action="/auth/logout" method="POST">
                <button
                  type="submit"
                  className="text-sm text-white/70 hover:text-white"
                >
                  {t("nav.logout")}
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden rounded-md bg-accent-500 px-4 py-2 text-sm font-semibold hover:bg-accent-600 sm:inline-flex"
            >
              {t("nav.login")}
            </Link>
          )}

          <button
            type="button"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={t("nav.menu")}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/10 md:hidden">
          <div className="flex justify-end px-4 pt-3 sm:hidden">
            <LanguageSwitcher />
          </div>
          <nav className="space-y-1 px-4 py-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-md px-3 py-2 text-base font-medium hover:bg-white/10"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {variant === "app" && (
              <>
                <Link
                  href="/app/groups"
                  className="block rounded-md px-3 py-2 text-base font-medium hover:bg-white/10"
                  onClick={() => setMobileOpen(false)}
                >
                  {t("nav.groups")}
                </Link>
                <Link
                  href="/app/profile"
                  className="block rounded-md px-3 py-2 text-base font-medium hover:bg-white/10"
                  onClick={() => setMobileOpen(false)}
                >
                  {t("nav.profile")}
                </Link>
                {userEmail && (
                  <form action="/auth/logout" method="POST" className="px-3 py-2">
                    <button type="submit" className="text-white/80">
                      {t("nav.logout")}
                    </button>
                  </form>
                )}
              </>
            )}
            {!userEmail && (
              <Link
                href="/login"
                className="block rounded-md bg-accent-500 px-3 py-2 text-center text-base font-semibold"
                onClick={() => setMobileOpen(false)}
              >
                {t("nav.login")}
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

export function Breadcrumb({
  items,
}: {
  items: Array<{ label: string; href?: string }>;
}) {
  return (
    <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <span className="text-text-tertiary">›</span>}
          {item.href ? (
            <Link href={item.href} className="hover:text-brand-700">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-text-primary">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto max-w-7xl px-4 py-8 lg:px-8", className)}>
      {children}
    </div>
  );
}

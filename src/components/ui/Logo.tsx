"use client";

import { useId } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export function LogoMark({
  size = 36,
  className,
  variant = "default",
  idPrefix,
}: {
  size?: number;
  className?: string;
  variant?: "default" | "on-light";
  idPrefix?: string;
}) {
  const reactId = useId().replace(/:/g, "");
  const prefix = idPrefix ?? `logo-${reactId}`;
  const bg = variant === "on-light" ? "#003faa" : "#001b4a";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={`${prefix}-left`}>
          <rect x="0" y="0" width="18" height="36" />
        </clipPath>
        <clipPath id={`${prefix}-right`}>
          <rect x="18" y="0" width="18" height="36" />
        </clipPath>
        <linearGradient id={`${prefix}-sun`} x1="8" y1="8" x2="22" y2="28">
          <stop offset="0%" stopColor="#ffb347" />
          <stop offset="100%" stopColor="#ff5b00" />
        </linearGradient>
        <linearGradient id={`${prefix}-bg`} x1="0" y1="0" x2="36" y2="36">
          <stop offset="0%" stopColor={bg} />
          <stop offset="100%" stopColor="#002d7a" />
        </linearGradient>
      </defs>

      <rect width="36" height="36" rx="9" fill={`url(#${prefix}-bg)`} />

      <g clipPath={`url(#${prefix}-left)`}>
        <circle cx="18" cy="18" r="9.5" fill={`url(#${prefix}-sun)`} />
        <g stroke="#ff8c33" strokeWidth="1.4" strokeLinecap="round">
          <line x1="18" y1="5.5" x2="18" y2="8.2" />
          <line x1="18" y1="27.8" x2="18" y2="30.5" />
          <line x1="8.2" y1="18" x2="5.5" y2="18" />
          <line x1="27.8" y1="18" x2="30.5" y2="18" />
          <line x1="10.4" y1="10.4" x2="8.4" y2="8.4" />
          <line x1="25.6" y1="25.6" x2="27.6" y2="27.6" />
          <line x1="10.4" y1="25.6" x2="8.4" y2="27.6" />
        </g>
      </g>

      <g clipPath={`url(#${prefix}-right)`}>
        <circle cx="24" cy="16" r="8.5" fill="#f0f5fc" />
        <circle cx="27.5" cy="14" r="7.5" fill={`url(#${prefix}-bg)`} />
        <circle cx="22" cy="26" r="1" fill="#aac3e9" />
        <circle cx="28" cy="24" r="0.7" fill="#7ba3dd" />
        <circle cx="25" cy="29" r="0.5" fill="#aac3e9" />
      </g>

      <line
        x1="18"
        y1="6"
        x2="18"
        y2="30"
        stroke="white"
        strokeOpacity="0.12"
        strokeWidth="0.75"
      />
    </svg>
  );
}

export function Logo({
  variant = "default",
  showWordmark = true,
  className,
  href,
}: {
  variant?: "header" | "footer" | "default";
  showWordmark?: boolean;
  className?: string;
  href?: string;
}) {
  const markVariant = variant === "footer" ? "on-light" : "default";
  const wordmarkClass =
    variant === "footer" ? "text-text-primary" : "text-text-on-brand";

  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={36} variant={markVariant} />
      {showWordmark && (
        <span
          className={cn(
            "font-display text-xl font-bold tracking-tight",
            wordmarkClass,
          )}
        >
          Travel<span className="text-accent-500">.</span>app
        </span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex">
        {content}
      </Link>
    );
  }

  return content;
}

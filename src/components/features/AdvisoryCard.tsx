import { cn } from "@/lib/utils/cn";
import type { AdvisorySeverity } from "@/lib/advisors/types";

const severityStyles: Record<
  AdvisorySeverity,
  { border: string; bg: string; icon: string }
> = {
  critical: {
    border: "border-danger",
    bg: "bg-red-50/60",
    icon: "🚨",
  },
  warning: {
    border: "border-warning",
    bg: "bg-orange-50/60",
    icon: "⚠️",
  },
  suggestion: {
    border: "border-brand-700",
    bg: "bg-brand-50/60",
    icon: "💡",
  },
  info: {
    border: "border-border-strong",
    bg: "bg-bg-soft",
    icon: "ℹ️",
  },
};

export function AdvisoryCard({
  severity,
  title,
  reasoning,
  suggestedAction,
  savings,
  sourceFacts,
  onDismiss,
}: {
  severity: AdvisorySeverity;
  title: string;
  reasoning: string;
  suggestedAction?: string | null;
  savings?: number | null;
  sourceFacts?: Record<string, unknown>;
  onDismiss?: () => void;
}) {
  const style = severityStyles[severity];

  return (
    <article
      className={cn(
        "rounded-2xl border-l-4 p-5",
        style.border,
        style.bg,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/80 text-lg">
          {style.icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-bold text-text-primary">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-text-secondary">
            <strong>Dlaczego:</strong> {reasoning}
          </p>
          {suggestedAction && (
            <p className="mt-2 text-sm text-text-secondary">
              <strong>Sugestia:</strong> {suggestedAction}
            </p>
          )}
          {savings != null && savings > 0 && (
            <p className="numeric mt-2 text-sm font-semibold text-success">
              💰 Potencjalne oszczędności: {savings} PLN
            </p>
          )}
          {sourceFacts && Object.keys(sourceFacts).length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-text-tertiary">
                Skąd to wiem (źródła)
              </summary>
              <pre className="mt-1 overflow-x-auto rounded bg-white/60 p-2 text-xs">
                {JSON.stringify(sourceFacts, null, 2)}
              </pre>
            </details>
          )}
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 text-text-tertiary transition-colors hover:text-text-primary"
            title="Odrzuć"
          >
            ✕
          </button>
        )}
      </div>
    </article>
  );
}

export function FeatureCard({
  number,
  icon,
  title,
  text,
  accent = "brand",
}: {
  number: string;
  icon: string;
  title: string;
  text: string;
  accent?: "brand" | "accent" | "success";
}) {
  const iconBg = {
    brand: "bg-brand-700",
    accent: "bg-accent-500",
    success: "bg-success",
  }[accent];

  return (
    <div className="card-hover relative rounded-2xl border border-border-default bg-white p-8">
      <div className="absolute top-4 right-6 font-display text-7xl font-bold text-brand-50">
        {number}
      </div>
      <div className="relative">
        <div
          className={cn(
            "mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl text-2xl text-white",
            iconBg,
          )}
        >
          {icon}
        </div>
        <h3 className="font-display mb-2 text-xl font-bold text-text-primary">
          {title}
        </h3>
        <p className="text-text-secondary">{text}</p>
      </div>
    </div>
  );
}

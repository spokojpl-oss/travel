import { cn } from "@/lib/utils/cn";

const variants = {
  default: "bg-brand-50 text-brand-700",
  accent: "bg-accent-500 text-white",
  success: "bg-success text-white",
  warning: "bg-warning/10 text-warning",
  outline: "border border-border-default text-text-secondary",
};

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

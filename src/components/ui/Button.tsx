import { cn } from "@/lib/utils/cn";

const variants = {
  primary:
    "bg-accent-500 text-white hover:bg-accent-600 active:bg-accent-700 shadow-sm hover:shadow",
  secondary:
    "border-2 border-brand-700 text-brand-700 hover:bg-brand-50 bg-white",
  tertiary: "text-brand-700 hover:bg-brand-50",
  danger: "bg-danger text-white hover:bg-red-700",
  ghost: "border border-border-default text-text-secondary hover:bg-bg-hover",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm rounded-md",
  md: "px-4 py-2 text-base rounded-md",
  lg: "px-6 py-3 text-lg rounded-lg font-semibold",
  xl: "px-8 py-4 text-lg rounded-xl font-bold",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]",
        variants[variant],
        sizes[size],
        className,
      )}
    />
  );
}

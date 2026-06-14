import { cn } from "@/lib/utils/cn";

export function Input({
  label,
  error,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
}) {
  return (
    <div className="w-full">
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-text-primary">
          {label}
        </label>
      )}
      <input
        {...props}
        className={cn(
          "block w-full rounded-md border border-border-default bg-white px-3 py-2.5 text-base text-text-primary placeholder:text-text-tertiary transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100",
          error && "border-danger focus:border-danger focus:ring-red-100",
          className,
        )}
      />
      {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
    </div>
  );
}

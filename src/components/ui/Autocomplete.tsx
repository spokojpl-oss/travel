"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Icon, type IconName } from "@/components/ui/Icon";

export type AutocompleteOption = {
  id: string;
  label: string;
  sublabel?: string;
};

export function Autocomplete({
  label,
  icon,
  placeholder,
  value,
  onValueChange,
  onSelect,
  options,
  loading = false,
  large,
  inputType = "text",
  min,
  className,
}: {
  label: string;
  icon: IconName;
  placeholder?: string;
  value: string;
  onValueChange: (value: string) => void;
  onSelect: (option: AutocompleteOption) => void;
  options: AutocompleteOption[];
  loading?: boolean;
  large?: boolean;
  inputType?: "text" | "date";
  min?: string;
  className?: string;
}) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  useEffect(() => {
    setHighlight(0);
  }, [options, value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectOption(option: AutocompleteOption) {
    onSelect(option);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || options.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && options[highlight]) {
      e.preventDefault();
      selectOption(options[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showDropdown =
    open && inputType === "text" && (options.length > 0 || loading);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div
        className={cn(
          "rounded-xl border border-border-default p-3 transition-all hover:border-brand-300 focus-within:border-brand-700 focus-within:ring-2 focus-within:ring-brand-100",
          large && "border-2 p-4 focus-within:ring-4",
        )}
      >
        <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
          <Icon name={icon} size={14} />
          <span>{label}</span>
        </div>
        <input
          type={inputType}
          min={min}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onValueChange(e.target.value);
            if (inputType === "text") setOpen(true);
          }}
          onFocus={() => {
            if (inputType === "text") setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            "w-full border-0 bg-transparent p-0 font-medium text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-0 focus-visible:outline-none",
            large ? "text-lg font-semibold" : "text-base",
            inputType === "date" && "cursor-pointer",
          )}
        />
      </div>

      {showDropdown && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-border-default bg-white py-1 shadow-lg"
        >
          {loading && (
            <li className="px-4 py-2 text-sm text-text-tertiary">Szukam...</li>
          )}
          {!loading &&
            options.map((opt, i) => (
              <li key={opt.id} role="option" aria-selected={i === highlight}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectOption(opt)}
                  onMouseEnter={() => setHighlight(i)}
                  className={cn(
                    "flex w-full flex-col px-4 py-2.5 text-left transition-colors",
                    i === highlight ? "bg-brand-50" : "hover:bg-bg-soft",
                  )}
                >
                  <span className="font-medium text-text-primary">
                    {opt.label}
                  </span>
                  {opt.sublabel && (
                    <span className="text-xs text-text-tertiary">
                      {opt.sublabel}
                    </span>
                  )}
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

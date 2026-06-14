"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils/cn";
import { Icon, type IconName } from "@/components/ui/Icon";

export type AutocompleteOption = {
  id: string;
  label: string;
  sublabel?: string;
  lat?: number;
  lon?: number;
};

export function Autocomplete({
  label,
  icon,
  placeholder,
  value,
  onValueChange,
  onSelect,
  options,
  onSearch,
  loading = false,
  large,
  className,
  maxOptions = 12,
}: {
  label: string;
  icon: IconName;
  placeholder?: string;
  value: string;
  onValueChange: (value: string) => void;
  onSelect: (option: AutocompleteOption) => void;
  options: AutocompleteOption[];
  onSearch?: (query: string) => Promise<AutocompleteOption[]>;
  loading?: boolean;
  large?: boolean;
  className?: string;
  maxOptions?: number;
}) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [asyncOptions, setAsyncOptions] = useState<AutocompleteOption[]>([]);
  const [asyncLoading, setAsyncLoading] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [openUpward, setOpenUpward] = useState(false);

  const displayedOptions = (onSearch ? asyncOptions : options).slice(
    0,
    maxOptions,
  );
  const isLoading = loading || asyncLoading;

  useEffect(() => {
    setHighlight(0);
  }, [displayedOptions, value]);

  useEffect(() => {
    if (!onSearch || !open) return;
    const q = value.trim();
    const timer = setTimeout(async () => {
      setAsyncLoading(true);
      try {
        const results = await onSearch(q);
        setAsyncOptions(results);
      } catch {
        setAsyncOptions([]);
      } finally {
        setAsyncLoading(false);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [value, open, onSearch]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        containerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open || !inputRef.current) return;

    function updatePosition() {
      const el = inputRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const maxHeight = 320;
      const spaceBelow = window.innerHeight - rect.bottom - 16;
      const spaceAbove = rect.top - 16;
      const upward = spaceBelow < 200 && spaceAbove > spaceBelow;
      setOpenUpward(upward);

      const height = Math.min(maxHeight, upward ? spaceAbove : spaceBelow);
      setDropdownStyle({
        position: "fixed",
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
        maxHeight: height,
        ...(upward
          ? { bottom: window.innerHeight - rect.top + 6 }
          : { top: rect.bottom + 6 }),
      });
    }

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, displayedOptions.length]);

  function formatOptionLabel(option: AutocompleteOption): string {
    return option.sublabel
      ? `${option.label}, ${option.sublabel}`
      : option.label;
  }

  function selectOption(option: AutocompleteOption) {
    onValueChange(formatOptionLabel(option));
    onSelect(option);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || displayedOptions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, displayedOptions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && displayedOptions[highlight]) {
      e.preventDefault();
      selectOption(displayedOptions[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showDropdown = open && (displayedOptions.length > 0 || isLoading);

  const dropdown = showDropdown ? (
    <ul
      ref={dropdownRef}
      id={listId}
      role="listbox"
      style={dropdownStyle}
      className={cn(
        "overflow-auto rounded-xl border border-border-default bg-white py-1 shadow-2xl",
        openUpward && "mb-1",
      )}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {isLoading && (
        <li className="px-4 py-3 text-sm text-text-tertiary">Szukam...</li>
      )}
      {!isLoading &&
        displayedOptions.map((opt, i) => (
          <li key={opt.id} role="option" aria-selected={i === highlight}>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                selectOption(opt);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={cn(
                "flex w-full flex-col px-4 py-3 text-left transition-colors",
                i === highlight ? "bg-brand-50" : "hover:bg-bg-soft",
              )}
            >
              <span className="text-base font-medium text-text-primary">
                {opt.label}
              </span>
              {opt.sublabel && (
                <span className="text-sm text-text-tertiary">{opt.sublabel}</span>
              )}
            </button>
          </li>
        ))}
    </ul>
  ) : null;

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
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onValueChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className={cn(
            "w-full border-0 bg-transparent p-0 font-medium text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-0 focus-visible:outline-none",
            large ? "text-lg font-semibold" : "text-base",
          )}
        />
      </div>

      {typeof document !== "undefined" &&
        dropdown &&
        createPortal(dropdown, document.body)}
    </div>
  );
}

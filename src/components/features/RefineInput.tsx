"use client";

import { useState } from "react";
import type { SearchType } from "@/lib/history/log-search";
import { Icon } from "@/components/ui/Icon";

export function RefineInput<T extends Record<string, unknown>>({
  searchType,
  currentParams,
  onApply,
}: {
  searchType: SearchType;
  currentParams: T;
  onApply: (newParams: T) => void;
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    understood: boolean;
    newParams: Record<string, unknown>;
    explanation: string;
    unsupported_changes: string[];
  } | null>(null);

  async function handleSubmit() {
    if (!text.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          search_type: searchType,
          current_params: currentParams,
          user_text: text,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({
          understood: false,
          newParams: currentParams,
          explanation:
            typeof data.error === "string" ? data.error : "Błąd interpretacji",
          unsupported_changes: [],
        });
      } else {
        setResult(data);
      }
    } catch (e) {
      console.error(e);
      setResult({
        understood: false,
        newParams: currentParams,
        explanation: "Błąd połączenia",
        unsupported_changes: [],
      });
    } finally {
      setLoading(false);
    }
  }

  function handleApply() {
    if (result?.understood && result.newParams) {
      onApply(result.newParams as T);
      setText("");
      setResult(null);
    }
  }

  return (
    <div className="border border-dashed p-3 rounded mb-4 text-sm">
      <label className="block">
        <strong>Doprecyzuj wyszukiwanie:</strong>
        <input
          type="text"
          placeholder='np. "a we wrześniu", "bez przesiadek", "taniej"'
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className="w-full border px-2 py-1 rounded mt-1"
        />
      </label>
      <button
        onClick={handleSubmit}
        disabled={loading || !text.trim()}
        className="mt-2 border px-3 py-1 rounded disabled:opacity-50"
      >
        {loading ? "Analizuję..." : "Zinterpretuj"}
      </button>

      {result && (
        <div className="mt-2">
          {result.understood ? (
            <>
              <p className="flex items-start gap-2">
                <Icon name="check" size={16} className="mt-0.5 shrink-0 text-success" />
                {result.explanation}
              </p>
              {result.unsupported_changes.length > 0 && (
                <p className="flex items-start gap-2 text-amber-700">
                  <Icon name="alert-triangle" size={16} className="mt-0.5 shrink-0" />
                  Nie obsłużone: {result.unsupported_changes.join(", ")}
                </p>
              )}
              <button
                onClick={handleApply}
                className="mt-1 border px-3 py-1 rounded bg-black text-white"
              >
                Zastosuj zmianę
              </button>
            </>
          ) : (
            <p className="flex items-start gap-2">
              <Icon name="x" size={16} className="mt-0.5 shrink-0 text-danger" />
              Nie zrozumiałem. Spróbuj inaczej, np. &quot;we wrześniu&quot;
              lub &quot;bez przesiadek&quot;.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

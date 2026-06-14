"use client";

import { useState } from "react";
import type { SearchType } from "@/lib/history/log-search";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";

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
    <Card className="mb-6 border-dashed">
      <CardBody className="text-sm">
        <p className="mb-3 font-semibold text-text-primary">
          Doprecyzuj wyszukiwanie (opcjonalnie)
        </p>
        <Input
          placeholder='np. "zwiększ promień do 80 km", "tryb dowolna z wybranych"'
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={handleSubmit}
          disabled={loading || !text.trim()}
        >
          {loading ? "Analizuję..." : "Zinterpretuj"}
        </Button>

        {result && (
          <div className="mt-4">
            {result.understood ? (
              <>
                <p className="flex items-start gap-2 text-text-secondary">
                  <Icon
                    name="check"
                    size={16}
                    className="mt-0.5 shrink-0 text-success"
                  />
                  {result.explanation}
                </p>
                {result.unsupported_changes.length > 0 && (
                  <p className="mt-2 flex items-start gap-2 text-amber-700">
                    <Icon
                      name="alert-triangle"
                      size={16}
                      className="mt-0.5 shrink-0"
                    />
                    Nie obsłużone: {result.unsupported_changes.join(", ")}
                  </p>
                )}
                <Button size="sm" className="mt-3" onClick={handleApply}>
                  Zastosuj zmianę
                </Button>
              </>
            ) : (
              <p className="flex items-start gap-2 text-text-secondary">
                <Icon
                  name="x"
                  size={16}
                  className="mt-0.5 shrink-0 text-danger"
                />
                {result.explanation ||
                  'Nie zrozumiałem. Spróbuj np. "zwiększ promień" lub "tryb dowolna".'}
              </p>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { TripAdvisory } from "@/types/domain";
import type { AdvisorySeverity } from "@/lib/advisors/types";

function severityIcon(s: AdvisorySeverity): string {
  switch (s) {
    case "critical":
      return "🚨";
    case "warning":
      return "⚠️";
    case "suggestion":
      return "💡";
    case "info":
      return "ℹ️";
    default:
      return "";
  }
}

function severityBg(s: AdvisorySeverity): string {
  switch (s) {
    case "critical":
      return "bg-red-50 border-red-200";
    case "warning":
      return "bg-orange-50 border-orange-200";
    case "suggestion":
      return "bg-blue-50 border-blue-200";
    default:
      return "bg-gray-50 border-gray-200";
  }
}

type TripAdvisoriesSectionProps = {
  tripId: string;
};

export function TripAdvisoriesSection({ tripId }: TripAdvisoriesSectionProps) {
  const [advisories, setAdvisories] = useState<TripAdvisory[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/trips/${tripId}/advisories`)
      .then((r) => r.json())
      .then((data) => setAdvisories(data.advisories ?? []))
      .catch(() => setError("Nie udało się załadować porad"))
      .finally(() => setLoading(false));
  }, [tripId]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    const res = await fetch(`/api/trips/${tripId}/advisories`, {
      method: "POST",
    });
    setGenerating(false);
    if (res.ok) {
      const data = await res.json();
      setAdvisories(data.advisories ?? []);
    } else {
      const err = await res.json().catch(() => ({}));
      setError(
        typeof err.error === "string" ? err.error : "Generowanie nie powiodło się",
      );
    }
  }

  async function handleDismiss(advisoryId: string) {
    const prev = advisories;
    setAdvisories((p) => p.filter((a) => a.id !== advisoryId));

    try {
      const res = await fetch(
        `/api/trips/${tripId}/advisories/${advisoryId}/dismiss`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "manual_dismiss" }),
        },
      );
      if (!res.ok) throw new Error("Failed");
    } catch {
      setAdvisories(prev);
      setError("Nie udało się odrzucić porady – spróbuj ponownie");
    }
  }

  return (
    <section className="mb-8">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="text-lg font-semibold">Inteligentne porady</h2>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="border px-3 py-1 rounded text-sm bg-black text-white disabled:opacity-50"
        >
          {generating ? "Analizuję..." : "Wygeneruj/Odśwież porady"}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      {loading && <p className="text-sm text-gray-600">Ładowanie porad...</p>}

      {!loading && advisories.length === 0 && (
        <p className="text-sm text-gray-600">
          Brak porad. Kliknij &quot;Wygeneruj&quot; żeby przeanalizować wyjazd.
        </p>
      )}

      <div className="space-y-3">
        {advisories.map((adv) => (
          <article
            key={adv.id}
            className={`border rounded p-4 ${severityBg(adv.severity)}`}
          >
            <div className="flex justify-between gap-2 items-start">
              <h3 className="font-medium text-sm">
                {severityIcon(adv.severity)} {adv.title}
              </h3>
              <button
                onClick={() => handleDismiss(adv.id)}
                className="text-xs text-gray-600 hover:text-gray-900 shrink-0"
              >
                ✕ Odrzuć
              </button>
            </div>
            <p className="text-sm mt-2">
              <strong>Dlaczego:</strong> {adv.reasoning}
            </p>
            {adv.suggested_action && (
              <p className="text-sm mt-1">
                <strong>Sugestia:</strong> {adv.suggested_action}
              </p>
            )}
            {adv.estimated_savings_pln != null &&
              adv.estimated_savings_pln > 0 && (
                <p className="text-sm mt-1">
                  💰 Potencjalne oszczędności: {adv.estimated_savings_pln} PLN
                </p>
              )}
            <details className="mt-2">
              <summary className="text-xs cursor-pointer text-gray-600">
                Skąd to wiem (źródła)
              </summary>
              <pre className="text-xs mt-1 overflow-x-auto bg-white/60 p-2 rounded">
                {JSON.stringify(adv.source_facts, null, 2)}
              </pre>
            </details>
          </article>
        ))}
      </div>
    </section>
  );
}

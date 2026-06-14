"use client";

import { useEffect, useState } from "react";
import type { TripAdvisory } from "@/types/domain";
import { AdvisoryCard } from "./AdvisoryCard";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

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
    <Card className="mb-8">
      <CardHeader
        title="Inteligentne porady"
        action={
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? "Analizuję..." : "Wygeneruj / odśwież"}
          </Button>
        }
      />
      <CardBody>
        {error && <p className="mb-3 text-sm text-danger">{error}</p>}
        {loading && (
          <p className="text-sm text-text-secondary">Ładowanie porad...</p>
        )}
        {!loading && advisories.length === 0 && (
          <p className="text-sm text-text-secondary">
            Brak porad. Kliknij &quot;Wygeneruj&quot; żeby przeanalizować wyjazd.
          </p>
        )}
        <div className="space-y-4">
          {advisories.map((adv) => (
            <AdvisoryCard
              key={adv.id}
              severity={adv.severity}
              title={adv.title}
              reasoning={adv.reasoning}
              suggestedAction={adv.suggested_action}
              savings={adv.estimated_savings_pln}
              sourceFacts={adv.source_facts as Record<string, unknown>}
              onDismiss={() => handleDismiss(adv.id)}
            />
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

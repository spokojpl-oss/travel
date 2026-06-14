"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toggleTripShare, deleteTrip } from "../actions";
import { TripDocumentsView } from "@/components/features/TripDocumentsView";
import { TripAdvisoriesSection } from "@/components/features/TripAdvisoriesSection";
import { Breadcrumb, PageContainer } from "@/components/layout/Header";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type TripWithDocs = {
  id: string;
  name: string;
  date_from: string;
  date_to: string;
  status: string;
  destination: { name: string; country_code: string };
  documents: Array<{
    document_type: "itinerary" | "packing_list" | "pre_trip_todo";
    content: unknown;
    created_at: string;
    validation_issues?: string[];
  }>;
  share_token: string;
  is_share_enabled: boolean;
};

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;
  const [trip, setTrip] = useState<TripWithDocs | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    loadTrip();
  }, [tripId]);

  useEffect(() => {
    if (trip?.is_share_enabled && typeof window !== "undefined") {
      setShareUrl(`${window.location.origin}/trip/share/${trip.share_token}`);
    } else {
      setShareUrl("");
    }
  }, [trip?.is_share_enabled, trip?.share_token]);

  async function loadTrip() {
    const res = await fetch(`/api/trips/${tripId}`);
    if (!res.ok) {
      setError("Nie udało się załadować wyjazdu");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setTrip(data.trip);
    setLoading(false);
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    const res = await fetch(`/api/trips/${tripId}/generate-documents`, {
      method: "POST",
    });
    setGenerating(false);
    if (res.ok) {
      await loadTrip();
    } else {
      const err = await res.json().catch(() => ({}));
      setError(
        typeof err.error === "string" ? err.error : "Generowanie nie powiodło się",
      );
    }
  }

  async function handleToggleShare() {
    if (!trip) return;
    const result = await toggleTripShare(tripId, !trip.is_share_enabled);
    if ("success" in result && result.success) {
      await loadTrip();
    } else if ("error" in result && result.error) {
      setError(result.error);
    }
  }

  async function handleDelete() {
    if (!confirm("Usunąć ten wyjazd? Tej operacji nie da się cofnąć.")) {
      return;
    }
    await deleteTrip(tripId);
  }

  if (loading) {
    return (
      <PageContainer>
        <p className="text-text-secondary">Ładowanie...</p>
      </PageContainer>
    );
  }
  if (error && !trip) {
    return (
      <PageContainer>
        <p className="text-danger">Błąd: {error}</p>
      </PageContainer>
    );
  }
  if (!trip) {
    return (
      <PageContainer>
        <p>Wyjazd nie znaleziony</p>
      </PageContainer>
    );
  }

  const hasDocs = trip.documents.length > 0;

  return (
    <PageContainer>
      <Breadcrumb
        items={[
          { label: "Start", href: "/app" },
          { label: "Moje wyjazdy", href: "/app/trips" },
          { label: trip.name },
        ]}
      />

      <button
        onClick={() => router.push("/app/trips")}
        className="mb-4 text-sm text-brand-700 hover:underline"
      >
        ← Moje wyjazdy
      </button>

      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold text-text-primary">
          {trip.name}
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          {trip.destination.name} ({trip.destination.country_code}) ·{" "}
          {trip.date_from} → {trip.date_to} · {trip.status}
        </p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        <Button onClick={handleGenerate} disabled={generating} size="sm">
          {generating ? "Generuję..." : hasDocs ? "Regeneruj plan" : "Wygeneruj plan"}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push(`/app/trips/${tripId}/print`)}
          disabled={!hasDocs}
        >
          Drukuj / PDF
        </Button>
        <Button variant="ghost" size="sm" onClick={handleToggleShare}>
          {trip.is_share_enabled ? "Wyłącz udostępnianie" : "Włącz udostępnianie"}
        </Button>
        <Button variant="danger" size="sm" onClick={handleDelete}>
          Usuń wyjazd
        </Button>
      </div>

      {error && <p className="mb-4 text-danger">{error}</p>}

      {trip.is_share_enabled && shareUrl && (
        <Card className="mb-6">
          <CardBody>
            <p className="mb-1 font-medium text-text-primary">
              Link dla rodziny (read-only):
            </p>
            <code className="break-all text-xs text-text-secondary">{shareUrl}</code>
          </CardBody>
        </Card>
      )}

      <TripAdvisoriesSection tripId={tripId} />

      <TripDocumentsView documents={trip.documents} />
    </PageContainer>
  );
}

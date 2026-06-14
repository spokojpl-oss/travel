"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toggleTripShare, deleteTrip } from "../actions";
import { TripDocumentsView } from "@/components/features/TripDocumentsView";

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

  if (loading) return <p>Ładowanie...</p>;
  if (error && !trip) return <p className="text-red-600">Błąd: {error}</p>;
  if (!trip) return <p>Wyjazd nie znaleziony</p>;

  const hasDocs = trip.documents.length > 0;

  return (
    <div className="max-w-4xl">
      <button
        onClick={() => router.push("/app/trips")}
        className="underline mb-4 text-sm"
      >
        ← Moje wyjazdy
      </button>

      <header className="mb-6">
        <h1 className="text-2xl font-bold">{trip.name}</h1>
        <p className="text-sm text-gray-600 mt-1">
          {trip.destination.name} ({trip.destination.country_code}) ·{" "}
          {trip.date_from} → {trip.date_to} · {trip.status}
        </p>
      </header>

      <div className="flex flex-wrap gap-2 mb-6 text-sm">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="border px-3 py-1 rounded bg-black text-white disabled:opacity-50"
        >
          {generating ? "Generuję..." : hasDocs ? "Regeneruj plan" : "Wygeneruj plan"}
        </button>
        <button
          onClick={() => router.push(`/app/trips/${tripId}/print`)}
          disabled={!hasDocs}
          className="border px-3 py-1 rounded disabled:opacity-50"
        >
          Drukuj / PDF
        </button>
        <button onClick={handleToggleShare} className="border px-3 py-1 rounded">
          {trip.is_share_enabled ? "Wyłącz udostępnianie" : "Włącz udostępnianie"}
        </button>
        <button
          onClick={handleDelete}
          className="border px-3 py-1 rounded text-red-700"
        >
          Usuń wyjazd
        </button>
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {trip.is_share_enabled && shareUrl && (
        <div className="mb-6 border p-3 rounded bg-gray-50 text-sm">
          <p className="font-medium mb-1">Link dla rodziny (read-only):</p>
          <code className="text-xs break-all">{shareUrl}</code>
        </div>
      )}

      <TripDocumentsView documents={trip.documents} />
    </div>
  );
}

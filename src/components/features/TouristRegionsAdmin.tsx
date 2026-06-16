"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { RegionCharacter, RegionVibe, TouristRegion } from "@/lib/destinations/tourist-regions";
import { regionDisplayName } from "@/lib/destinations/tourist-regions";
import { SEED_TOURIST_REGIONS } from "@/lib/destinations/tourist-regions-seed";

type RegionFormState = {
  id: string;
  slug: string;
  destination_keys: string;
  name_pl: string;
  name_en: string;
  character: RegionCharacter;
  vibe: RegionVibe;
  overview_pl: string;
  overview_en: string;
  stay_hint_pl: string;
  stay_hint_en: string;
  center_lat: string;
  center_lon: string;
  sort_order: string;
  picks_json: string;
};

const EMPTY_FORM: RegionFormState = {
  id: "",
  slug: "",
  destination_keys: "",
  name_pl: "",
  name_en: "",
  character: "mixed",
  vibe: "balanced",
  overview_pl: "",
  overview_en: "",
  stay_hint_pl: "",
  stay_hint_en: "",
  center_lat: "",
  center_lon: "",
  sort_order: "0",
  picks_json: "[]",
};

export function TouristRegionsAdmin() {
  const [regions, setRegions] = useState<TouristRegion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState<RegionFormState>({ ...EMPTY_FORM });

  const loadRegions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/tourist-regions");
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
      setRegions(data.regions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRegions();
  }, [loadRegions]);

  async function seedDefaults() {
    setSeeding(true);
    setError(null);
    setMessage(null);
    try {
      const r = await fetch("/api/admin/tourist-regions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed" }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
      setMessage(`Załadowano ${data.upserted ?? 0} regionów z seeda.`);
      await loadRegions();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSeeding(false);
    }
  }

  function editRegion(region: TouristRegion) {
    setForm({
      id: region.id,
      slug: region.slug,
      destination_keys: region.destination_keys.join(", "),
      name_pl: region.name_pl,
      name_en: region.name_en,
      character: region.character,
      vibe: region.vibe,
      overview_pl: region.overview_pl,
      overview_en: region.overview_en,
      stay_hint_pl: region.stay_hint_pl,
      stay_hint_en: region.stay_hint_en,
      center_lat: String(region.center_lat),
      center_lon: String(region.center_lon),
      sort_order: "0",
      picks_json: JSON.stringify(region.picks, null, 2),
    });
    setMessage(null);
  }

  async function saveRegion() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      let picks: unknown;
      try {
        picks = JSON.parse(form.picks_json);
      } catch {
        throw new Error("Picks JSON jest nieprawidłowy.");
      }

      const payload = {
        id: form.id.trim(),
        slug: form.slug.trim(),
        destination_keys: form.destination_keys
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
        name_pl: form.name_pl.trim(),
        name_en: form.name_en.trim(),
        character: form.character,
        vibe: form.vibe,
        overview_pl: form.overview_pl.trim(),
        overview_en: form.overview_en.trim(),
        stay_hint_pl: form.stay_hint_pl.trim(),
        stay_hint_en: form.stay_hint_en.trim(),
        center_lat: Number(form.center_lat),
        center_lon: Number(form.center_lon),
        sort_order: Number(form.sort_order) || 0,
        picks,
      };

      const r = await fetch("/api/admin/tourist-regions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
      setMessage(`Zapisano region „${payload.id}”.`);
      setForm({ ...EMPTY_FORM });
      await loadRegions();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function deleteRegion(id: string) {
    if (!window.confirm(`Usunąć region ${id}?`)) return;
    setError(null);
    setMessage(null);
    try {
      const r = await fetch(`/api/admin/tourist-regions?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
      setMessage(`Usunięto ${id}.`);
      await loadRegions();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader title="Regiony turystyczne (karty w wyszukiwarce)" />
      <CardBody className="space-y-4">
        <p className="text-sm text-text-secondary">
          Kuratorskie bazy noclegowe z picks dopasowanymi do planu dni. Po migracji
          019 uruchom seed — potem możesz dodawać kolejne kraje ręcznie.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button size="sm" variant="secondary" disabled={loading} onClick={loadRegions}>
            Odśwież listę
          </Button>
          <Button size="sm" disabled={seeding} onClick={seedDefaults}>
            {seeding ? "Seeduję…" : `Seed z domyślnych (${SEED_TOURIST_REGIONS.length} regionów)`}
          </Button>
        </div>

        {message && <p className="text-sm text-success">{message}</p>}
        {error && <p className="text-sm text-danger">{error}</p>}

        {loading ? (
          <p className="text-sm text-text-secondary">Ładuję regiony…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-xs">
              <thead>
                <tr className="border-b border-border-default text-text-tertiary">
                  <th className="py-2 pr-3">ID</th>
                  <th className="py-2 pr-3">Nazwa</th>
                  <th className="py-2 pr-3">Klucze destynacji</th>
                  <th className="py-2 pr-3">Picks</th>
                  <th className="py-2">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {regions.map((region) => (
                  <tr key={region.id} className="border-b border-border-default/60">
                    <td className="py-1.5 pr-3 font-mono">{region.id}</td>
                    <td className="py-1.5 pr-3">{regionDisplayName(region, "pl")}</td>
                    <td className="py-1.5 pr-3 text-text-secondary">
                      {region.destination_keys.join(", ")}
                    </td>
                    <td className="py-1.5 pr-3">{region.picks.length}</td>
                    <td className="py-1.5">
                      <button
                        type="button"
                        className="mr-3 text-brand-700 hover:underline"
                        onClick={() => editRegion(region)}
                      >
                        Edytuj
                      </button>
                      <button
                        type="button"
                        className="text-danger hover:underline"
                        onClick={() => void deleteRegion(region.id)}
                      >
                        Usuń
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="rounded-xl border border-border-default bg-bg-soft/40 p-4">
          <h3 className="mb-3 font-semibold text-text-primary">
            {form.id ? `Edycja: ${form.id}` : "Nowy region"}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["id", "ID (np. hr-dubrovnik)"],
                ["slug", "Slug URL"],
                ["name_pl", "Nazwa PL"],
                ["name_en", "Nazwa EN"],
                ["destination_keys", "Klucze destynacji (po przecinku)"],
                ["center_lat", "Szer. geogr."],
                ["center_lon", "Dł. geogr."],
                ["sort_order", "Kolejność"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-sm">
                <span className="font-medium text-text-primary">{label}</span>
                <input
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-border-default px-3 py-2"
                />
              </label>
            ))}
            <label className="block text-sm">
              <span className="font-medium text-text-primary">Charakter</span>
              <select
                value={form.character}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    character: e.target.value as RegionCharacter,
                  }))
                }
                className="mt-1 w-full rounded-md border border-border-default px-3 py-2"
              >
                <option value="resort">Kurort</option>
                <option value="historic">Historyczny</option>
                <option value="wild">Dziko</option>
                <option value="mixed">Mix</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-medium text-text-primary">Vibe</span>
              <select
                value={form.vibe}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    vibe: e.target.value as RegionVibe,
                  }))
                }
                className="mt-1 w-full rounded-md border border-border-default px-3 py-2"
              >
                <option value="popular">Popularny</option>
                <option value="balanced">Zbalansowany</option>
                <option value="offbeat">Mniej znany</option>
              </select>
            </label>
          </div>

          {(
            [
              ["overview_pl", "Opis PL"],
              ["overview_en", "Opis EN"],
              ["stay_hint_pl", "Wskazówka pobytu PL"],
              ["stay_hint_en", "Wskazówka pobytu EN"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="mt-3 block text-sm">
              <span className="font-medium text-text-primary">{label}</span>
              <textarea
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                rows={2}
                className="mt-1 w-full rounded-md border border-border-default px-3 py-2"
              />
            </label>
          ))}

          <label className="mt-3 block text-sm">
            <span className="font-medium text-text-primary">Picks (JSON)</span>
            <textarea
              value={form.picks_json}
              onChange={(e) => setForm((f) => ({ ...f, picks_json: e.target.value }))}
              rows={8}
              className="mt-1 w-full rounded-md border border-border-default px-3 py-2 font-mono text-xs"
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button disabled={saving} onClick={saveRegion}>
              {saving ? "Zapisuję…" : "Zapisz region"}
            </Button>
            <Button variant="ghost" onClick={() => setForm({ ...EMPTY_FORM })}>
              Wyczyść formularz
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

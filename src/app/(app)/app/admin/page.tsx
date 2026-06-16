"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageContainer, Breadcrumb } from "@/components/layout/Header";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EUROPE_SCRAPE_REGIONS, scrapeRegionByName } from "@/lib/api/osm-scrape-regions";
import { OSM_SCRAPE_CATEGORIES } from "@/lib/api/osm-scrape-categories";
import { TouristRegionsAdmin } from "@/components/features/TouristRegionsAdmin";
import {
  subdivideBbox,
  tileGridForScrape,
  tileLabel,
} from "@/lib/api/bbox-tiles";

type SetupStatus = {
  user: { email: string; is_admin: boolean };
  supabase_host: string | null;
  service_role_ok: boolean;
  service_role_error: string | null;
  admin_emails_configured: boolean;
  google_places_configured: boolean;
  counts: {
    activities: number;
    attractions: number;
    tags: number;
    osm_mappings: number;
  };
  search_ready: boolean;
  issues: string[];
};

type ScrapeResponse = {
  success?: boolean;
  warnings?: string[];
  duration_ms?: number;
  summary?: {
    fetched: number;
    persisted: number;
    scrape_errors: number;
    attractions_tagged: number;
    tags_created: number;
    attractions_with_tags?: number;
    tagging_errors?: number;
  };
  results?: unknown;
  error?: string;
  hint?: string;
  detail?: string;
};

type CoverageReport = {
  totals: { attractions: number; tags: number };
  destinations: Array<{
    name: string;
    country: string;
    region: string | null;
    attractions: number;
    tags: number;
    status: "ok" | "sparse" | "empty" | "untagged";
  }>;
  europeRegions: Array<{
    name: string;
    attractions: number;
    taggedAttractions: number;
    tags: number;
    needsScrape: boolean;
  }>;
  emptyDestinations: string[];
  regionsNeedingScrape: string[];
};

type QueueStep = {
  region: string;
  ok: boolean;
  summary?: ScrapeResponse["summary"];
  error?: string;
  durationMs?: number;
};

type ScrapeStepResult = ScrapeResponse & {
  httpOk: boolean;
  httpStatus: number;
  durationMs: number;
};

async function postScrapeRequest(params: URLSearchParams): Promise<ScrapeStepResult> {
  const started = Date.now();
  const query = params.toString();

  let httpOk = false;
  let httpStatus = 0;
  let data: ScrapeResponse = {};

  try {
    const r = await fetch(`/api/admin/initial-scrape?${query}`, { method: "POST" });
    httpOk = r.ok;
    httpStatus = r.status;
    try {
      data = (await r.json()) as ScrapeResponse;
    } catch {
      data = {
        error: `Nieprawidłowa odpowiedź serwera (HTTP ${r.status}). Prawdopodobny timeout Vercel — scrape podzielony na mniejsze kroki.`,
      };
    }
  } catch (e) {
    data = { error: e instanceof Error ? e.message : String(e) };
  }

  const durationMs = Date.now() - started;

  return { ...data, httpOk, httpStatus, durationMs };
}

function stepFromResult(label: string, result: ScrapeStepResult): QueueStep {
  const scrapeErrors = result.summary?.scrape_errors ?? 0;
  const warningText = result.warnings?.filter(Boolean).join(" | ");
  let error = result.error;
  if (!error && !result.httpOk) {
    error = `HTTP ${result.httpStatus}${result.durationMs > 280_000 ? " (timeout?)" : ""}`;
  }
  if (!error && scrapeErrors > 0) {
    error = `${scrapeErrors} błędów Overpass`;
  }
  if (!error && warningText && scrapeErrors > 0) {
    error = warningText;
  }

  return {
    region: label,
    ok: result.httpOk && scrapeErrors === 0 && !result.error,
    summary: result.summary,
    error,
    durationMs: result.durationMs,
  };
}

function countScrapeSteps(regions: string[]): number {
  let total = 0;
  for (const region of regions) {
    const def = scrapeRegionByName(region);
    if (!def) {
      total += OSM_SCRAPE_CATEGORIES.length;
      continue;
    }
    for (const category of OSM_SCRAPE_CATEGORIES) {
      const grid = tileGridForScrape(def.bbox, category);
      total += grid * grid;
    }
  }
  return total;
}

async function scrapeRegionByCategories(
  region: string,
  steps: QueueStep[],
  stepOffset: number,
  totalSteps: number,
  onProgress: (label: string, steps: QueueStep[]) => void,
): Promise<QueueStep[]> {
  const next = [...steps];
  const def = scrapeRegionByName(region);
  if (!def) {
    const label = `${region} (nieznany region)`;
    next.push({
      region: label,
      ok: false,
      error: "Nie rozpoznano regionu scrape",
    });
    return next;
  }

  let stepIndex = stepOffset;
  for (const category of OSM_SCRAPE_CATEGORIES) {
    const grid = tileGridForScrape(def.bbox, category);
    const tiles = subdivideBbox(def.bbox, grid);

    for (let ti = 0; ti < tiles.length; ti++) {
      const tile = tiles[ti]!;
      stepIndex += 1;
      const suffix = tileLabel(grid, ti);
      const label = `${region} / ${category}${suffix}`;
      onProgress(`Scrape: ${label} (${stepIndex}/${totalSteps})…`, next);

      const params = new URLSearchParams({
        bbox: region,
        category,
        skipTagging: "true",
        south: String(tile.south),
        north: String(tile.north),
        west: String(tile.west),
        east: String(tile.east),
      });
      const result = await postScrapeRequest(params);
      next.push(stepFromResult(label, result));
      onProgress(`Scrape: ${label} (${stepIndex}/${totalSteps})…`, next);
    }
  }
  return next;
}

const EUROPE_SCRAPE_BUTTONS = [
  {
    label: "Regiony turystyczne (puste)",
    action: "tourist-regions-empty" as const,
  },
  {
    label: "Regiony turystyczne (wszystkie)",
    action: "tourist-regions-all" as const,
  },
  { label: "Europa — kolejka (puste regiony)", action: "queue-empty" as const },
  { label: "Europa — kolejka (wszystkie)", action: "queue-all" as const },
  { label: "Grecja + Cypr", bbox: "Greece + Cyprus" },
  { label: "Bałkany", bbox: "Balkans" },
  { label: "Włochy + Malta", bbox: "Italy + Malta" },
  { label: "Francja + Benelux", bbox: "France + Benelux" },
  { label: "Hiszpania + Wyspy", bbox: "Iberia + Madeira + Canary" },
  { label: "Niemcy + Alpy", bbox: "Germany + Alps" },
  { label: "UK + Irlandia", bbox: "UK + Ireland" },
  { label: "Nordyki", bbox: "Nordics" },
  { label: "Europa Środkowa", bbox: "Central Europe" },
  { label: "Turcja", bbox: "Turkey" },
  { label: "Polska + sąsiedzi", bbox: "Poland + neighbors" },
  { label: "Ukraina + Białoruś + Mołdawia", bbox: "Ukraine + Belarus + Moldova" },
  { label: "Rosja (Europa)", bbox: "Russia (European)" },
] as const;

export default function AdminSetupPage() {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<ScrapeResponse | null>(null);
  const [coverage, setCoverage] = useState<CoverageReport | null>(null);
  const [coverageLoading, setCoverageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queueProgress, setQueueProgress] = useState<QueueStep[]>([]);
  const [queueLabel, setQueueLabel] = useState<string | null>(null);

  async function loadStatus() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/setup-status");
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
      setStatus(data as SetupStatus);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    if (!status?.user.is_admin || !status.service_role_ok) return;
    void loadCoverage();
  }, [status]);

  async function loadCoverage() {
    setCoverageLoading(true);
    try {
      const r = await fetch("/api/admin/osm-audit");
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
      setCoverage(data as CoverageReport);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCoverageLoading(false);
    }
  }

  async function runScrape(bbox?: string, options?: { skipTagging?: boolean }) {
    setScraping(true);
    setScrapeResult(null);
    setError(null);
    setQueueProgress([]);
    try {
      if (options?.skipTagging) {
        const result = await postScrapeRequest(
          new URLSearchParams({ skipScrape: "true" }),
        );
        setScrapeResult(result);
        if (!result.httpOk) setError(result.error ?? `HTTP ${result.httpStatus}`);
        await loadStatus();
        await loadCoverage();
        return result;
      }

      if (bbox) {
        setQueueLabel(`Scrape: ${bbox}…`);
        const totalSteps = countScrapeSteps([bbox]) + 1;
        let steps: QueueStep[] = [];
        steps = await scrapeRegionByCategories(
          bbox,
          steps,
          0,
          totalSteps,
          (label, s) => {
            setQueueLabel(label);
            setQueueProgress([...s]);
          },
        );

        setQueueLabel("Tagowanie aktywności…");
        const tagResult = await postScrapeRequest(
          new URLSearchParams({ skipScrape: "true" }),
        );
        setScrapeResult(tagResult);
        if (!tagResult.httpOk) {
          setError(tagResult.error ?? `HTTP ${tagResult.httpStatus}`);
        } else if (tagResult.warnings?.length) {
          setError(tagResult.warnings.join(" | "));
        }
        const failed = steps.filter((s) => !s.ok);
        if (failed.length > 0 && !tagResult.error) {
          setError(
            `${failed.length} kroków scrape z błędami (np. ${failed[0]?.region}: ${failed[0]?.error ?? "błąd"})`,
          );
        }
      } else {
        const result = await postScrapeRequest(new URLSearchParams());
        setScrapeResult(result);
        if (!result.httpOk) setError(result.error ?? `HTTP ${result.httpStatus}`);
        else if (result.warnings?.length) setError(result.warnings.join(" | "));
      }

      await loadStatus();
      await loadCoverage();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setScraping(false);
      setQueueLabel(null);
    }
  }

  async function runScrapeEuropeQueue(mode: "empty" | "all") {
    setScraping(true);
    setScrapeResult(null);
    setError(null);
    setQueueProgress([]);
    setQueueLabel(
      mode === "all"
        ? "Uzupełnianie wszystkich regionów Europy…"
        : "Uzupełnianie pustych regionów Europy…",
    );

    try {
      if (!coverage) {
        await loadCoverage();
      }

      const auditRes = await fetch("/api/admin/osm-audit");
      const audit = (await auditRes.json()) as CoverageReport;
      if (!auditRes.ok) {
        throw new Error((audit as { error?: string }).error ?? `HTTP ${auditRes.status}`);
      }
      setCoverage(audit);

      const regions =
        mode === "all"
          ? [...EUROPE_SCRAPE_REGIONS]
          : audit.regionsNeedingScrape.length > 0
            ? [...audit.regionsNeedingScrape]
            : [...EUROPE_SCRAPE_REGIONS];

      if (regions.length === 0) {
        setQueueLabel("Regiony OK — uruchamiam tagowanie…");
        const tagResult = await postScrapeRequest(
          new URLSearchParams({ skipScrape: "true" }),
        );
        setScrapeResult(tagResult);
        await loadStatus();
        await loadCoverage();
        setQueueLabel("Tagowanie zakończone.");
        return;
      }

      const totalSteps = countScrapeSteps(regions);
      let steps: QueueStep[] = [];

      for (const region of regions) {
        const offset = steps.length;
        steps = await scrapeRegionByCategories(
          region,
          steps,
          offset,
          totalSteps,
          (label, s) => {
            setQueueLabel(label);
            setQueueProgress([...s]);
          },
        );
      }

      const failed = steps.filter((s) => !s.ok);
      if (failed.length > 0) {
        setError(
          `${failed.length}/${steps.length} kroków z błędami. Pierwszy: ${failed[0]?.region} — ${failed[0]?.error ?? "błąd"}`,
        );
      }

      setQueueLabel("Tagowanie aktywności…");
      const tagResult = await postScrapeRequest(
        new URLSearchParams({ skipScrape: "true" }),
      );
      setScrapeResult(tagResult);
      if (!tagResult.httpOk) {
        setError(tagResult.error ?? `HTTP ${tagResult.httpStatus}`);
      }

      await loadStatus();
      await loadCoverage();
      setQueueLabel("Kolejka Europy zakończona.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setScraping(false);
    }
  }

  async function runTouristRegionScrapeQueue(mode: "empty" | "all") {
    setScraping(true);
    setScrapeResult(null);
    setError(null);
    setQueueProgress([]);
    setQueueLabel(
      mode === "all"
        ? "OSM dla wszystkich regionów turystycznych…"
        : "OSM dla pustych regionów turystycznych…",
    );

    try {
      const listRes = await fetch(
        `/api/admin/scrape-tourist-regions?mode=${mode}`,
      );
      const listData = (await listRes.json()) as {
        error?: string;
        regions?: Array<{ id: string; name_pl: string; attractions: number }>;
      };
      if (!listRes.ok) {
        throw new Error(listData.error ?? `HTTP ${listRes.status}`);
      }

      const regions = listData.regions ?? [];
      if (regions.length === 0) {
        setQueueLabel("Regiony turystyczne OK — nic do uzupełnienia.");
        await loadCoverage();
        return;
      }

      const steps: QueueStep[] = [];

      for (let i = 0; i < regions.length; i++) {
        const region = regions[i]!;
        setQueueLabel(
          `Region turystyczny ${i + 1}/${regions.length}: ${region.name_pl}…`,
        );

        const started = Date.now();
        const r = await fetch(
          `/api/admin/scrape-tourist-regions?regionId=${encodeURIComponent(region.id)}`,
          { method: "POST" },
        );
        const data = (await r.json()) as {
          error?: string;
          result?: {
            persisted: number;
            tagged: number;
            attractionsBefore: number;
            attractionsAfter: number;
          };
        };
        const durationMs = Date.now() - started;

        steps.push({
          region: region.name_pl,
          ok: r.ok,
          durationMs,
          error: data.error,
          summary: data.result
            ? {
                fetched: data.result.persisted,
                persisted: data.result.persisted,
                scrape_errors: 0,
                attractions_tagged: data.result.tagged,
                tags_created: data.result.tagged,
              }
            : undefined,
        });
        setQueueProgress([...steps]);
      }

      const failed = steps.filter((s) => !s.ok);
      if (failed.length > 0) {
        setError(
          `${failed.length}/${steps.length} regionów z błędem. Pierwszy: ${failed[0]?.region}`,
        );
      }

      await loadStatus();
      await loadCoverage();
      setQueueLabel("Scrape regionów turystycznych zakończony.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setScraping(false);
    }
  }

  async function runTaggingOnly() {
    setScraping(true);
    setScrapeResult(null);
    try {
      const result = await postScrapeRequest(
        new URLSearchParams({ skipScrape: "true" }),
      );
      setScrapeResult(result);
      if (!result.httpOk) setError(result.error ?? `HTTP ${result.httpStatus}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setScraping(false);
    }
  }

  return (
    <PageContainer>
      <Breadcrumb
        items={[
          { label: "Start", href: "/app" },
          { label: "Admin — konfiguracja bazy" },
        ]}
      />

      <h1 className="font-display mb-2 text-3xl font-bold text-text-primary">
        Konfiguracja bazy atrakcji
      </h1>
      <p className="mb-6 text-sm text-text-secondary">
        Diagnostyka i uruchomienie scrape OSM. Tylko dla kont z{" "}
        <code className="rounded bg-bg-soft px-1">ADMIN_EMAILS</code>.
      </p>

      {loading && <p className="text-sm text-text-secondary">Ładuję status...</p>}
      {error && <p className="mb-4 text-sm text-danger">Błąd: {error}</p>}

      {status && (
        <>
          <Card className="mb-6">
            <CardHeader title="Status bazy" />
            <CardBody className="space-y-3 text-sm">
              <p>
                <strong>Konto:</strong> {status.user.email}{" "}
                {status.user.is_admin ? (
                  <span className="text-success">(admin)</span>
                ) : (
                  <span className="text-danger">(nie admin)</span>
                )}
              </p>
              <p>
                <strong>Supabase:</strong>{" "}
                {status.supabase_host ?? "nieznany"}
              </p>
              <p>
                <strong>Service role:</strong>{" "}
                {status.service_role_ok ? (
                  <span className="text-success">OK</span>
                ) : (
                  <span className="text-danger">
                    BŁĄD — {status.service_role_error}
                  </span>
                )}
              </p>
              <p>
                <strong>Google Places:</strong>{" "}
                {status.google_places_configured ? (
                  <span className="text-success">OK — wypożyczalnie, quady, nurkowanie</span>
                ) : (
                  <span className="text-danger">
                    Brak GOOGLE_PLACES_API_KEY — usługi komercyjne nie będą znajdowane
                  </span>
                )}
              </p>
              <dl className="grid gap-2 sm:grid-cols-2">
                <Stat label="Aktywności" value={status.counts.activities} />
                <Stat label="Mapowania OSM" value={status.counts.osm_mappings} />
                <Stat label="Atrakcje" value={status.counts.attractions} />
                <Stat label="Tagi" value={status.counts.tags} />
              </dl>
              <p>
                <strong>Wyszukiwarka gotowa:</strong>{" "}
                {status.search_ready ? (
                  <span className="text-success">Tak</span>
                ) : (
                  <span className="text-warning">Nie</span>
                )}
              </p>
              {status.issues.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-text-secondary">
                  {status.issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          {status.user.is_admin && status.service_role_ok && (
            <>
              <TouristRegionsAdmin />

              <Card className="mb-6">
                <CardHeader title="Pokrycie OSM — destynacje europejskie" />
                <CardBody className="space-y-4">
                  <p className="text-sm text-text-secondary">
                    Sprawdza każdą destynację z katalogu (Cypr, Chorwacja, Włochy,
                    Francja…) i regiony scrape. Puste regiony trzeba uzupełnić
                    przyciskiem poniżej.
                  </p>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={coverageLoading || scraping}
                    onClick={loadCoverage}
                  >
                    {coverageLoading ? "Sprawdzam..." : "Sprawdź pokrycie"}
                  </Button>

                  {coverage && (
                    <div className="space-y-4 text-sm">
                      {coverage.emptyDestinations.length > 0 && (
                        <p className="text-warning">
                          <strong>Puste destynacje:</strong>{" "}
                          {coverage.emptyDestinations.join(", ")}
                        </p>
                      )}
                      {coverage.regionsNeedingScrape.length > 0 && (
                        <p className="text-warning">
                          <strong>Regiony do scrape:</strong>{" "}
                          {coverage.regionsNeedingScrape.join(", ")}
                        </p>
                      )}

                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[32rem] text-left text-xs">
                          <thead>
                            <tr className="border-b border-border-default text-text-tertiary">
                              <th className="py-2 pr-3">Destynacja</th>
                              <th className="py-2 pr-3">Atrakcje</th>
                              <th className="py-2 pr-3">Tagi</th>
                              <th className="py-2">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {coverage.destinations.map((d) => (
                              <tr
                                key={d.name}
                                className="border-b border-border-default/60"
                              >
                                <td className="py-1.5 pr-3">
                                  {d.name}{" "}
                                  <span className="text-text-tertiary">
                                    ({d.country})
                                  </span>
                                </td>
                                <td className="py-1.5 pr-3">{d.attractions}</td>
                                <td className="py-1.5 pr-3">{d.tags}</td>
                                <td className="py-1.5">
                                  <CoverageBadge status={d.status} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>

              <Card className="mb-6">
                <CardHeader title="Uruchom scrape" />
                <CardBody className="space-y-4">
                  <p className="text-sm text-text-secondary">
                    <strong>Najprościej:</strong> po seedzie regionów turystycznych
                    kliknij <strong>„Regiony turystyczne (puste)”</strong> — OSM
                    pobierze atrakcje wokół każdej karty (Ksamil, Paryż, Bałkany…)
                    bez zgadywania bboxów. Przy normalnym wyszukiwaniu użytkownika
                    baza też uzupełnia się automatycznie przy pierwszym zapytaniu.
                  </p>
                  <p className="text-sm text-text-secondary">
                    Duże regiony (np. Włochy) są dzielone na kafelki 2×2–4×4,
                    żeby nie przekroczyć limitu 5 min Vercel. Postęp aktualizuje
                    się co ok. 20–90 s. Nie zamykaj karty.
                  </p>
                  <p className="text-sm text-text-secondary">
                    Scrape OSM uzupełnia plaże, muzea, zamki itd.{" "}
                    <strong>Nie</strong> wypożyczalnie rowerów, quadów, nurkowanie —
                    te pobierane są z Google Places przy wyszukiwaniu (wymaga{" "}
                    <code className="rounded bg-bg-soft px-1">GOOGLE_PLACES_API_KEY</code>
                    ).
                  </p>
                  {queueLabel && (
                    <p className="text-sm font-medium text-brand-800">{queueLabel}</p>
                  )}
                  {queueProgress.length > 0 && (
                    <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg bg-bg-soft p-3 text-xs">
                      {queueProgress.map((step) => (
                        <li key={step.region}>
                          <span className={step.ok ? "text-success" : "text-danger"}>
                            {step.ok ? "✓" : "✗"}
                          </span>{" "}
                          {step.region}
                          {step.summary
                            ? ` — ${step.summary.persisted} zapisanych, ${step.summary.fetched} pobranych, ${step.summary.scrape_errors} błędów`
                            : ""}
                          {step.durationMs
                            ? ` (${Math.round(step.durationMs / 1000)}s)`
                            : ""}
                          {step.error ? ` (${step.error})` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex flex-wrap gap-3">
                    {EUROPE_SCRAPE_BUTTONS.map((btn) => (
                      <Button
                        key={btn.label}
                        size="sm"
                        disabled={scraping}
                        variant={
                          "action" in btn &&
                          (btn.action === "tourist-regions-empty" ||
                            btn.action === "queue-empty")
                            ? "primary"
                            : "secondary"
                        }
                        onClick={() =>
                          "action" in btn
                            ? btn.action === "queue-all" || btn.action === "queue-empty"
                              ? runScrapeEuropeQueue(
                                  btn.action === "queue-all" ? "all" : "empty",
                                )
                              : runTouristRegionScrapeQueue(
                                  btn.action === "tourist-regions-all"
                                    ? "all"
                                    : "empty",
                                )
                            : runScrape(btn.bbox)
                        }
                      >
                        {scraping && queueLabel ? "Trwa..." : btn.label}
                      </Button>
                    ))}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={scraping}
                      onClick={() => runScrape()}
                    >
                      Świat (wszystkie regiony)
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={scraping}
                      onClick={runTaggingOnly}
                    >
                      Tylko tagowanie
                    </Button>
                    <Button size="sm" variant="ghost" onClick={loadStatus}>
                      Odśwież status
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </>
          )}

          {status.user.is_admin && !status.service_role_ok && (
            <Card className="mb-6 border-amber-200 bg-amber-50/40">
              <CardHeader title="Scrape niedostępny" />
              <CardBody className="space-y-3 text-sm text-text-secondary">
                <p>
                  Jesteś administratorem, ale przyciski scrape (w tym{" "}
                  <strong>Europa — kolejka (wszystkie)</strong>) są ukryte, bo{" "}
                  <code className="rounded bg-bg-soft px-1">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
                  nie działa na tym środowisku.
                </p>
                <p>
                  Ustaw klucz w Vercel → Settings → Environment Variables, zrób redeploy,
                  albo uruchom scrape lokalnie:{" "}
                  <code className="rounded bg-bg-soft px-1">npm run scrape:europe</code>
                </p>
                {status.service_role_error && (
                  <p className="text-danger">Błąd: {status.service_role_error}</p>
                )}
              </CardBody>
            </Card>
          )}

          {scrapeResult && (
            <Card className="mb-6">
              <CardHeader title="Wynik ostatniego scrape" />
              <CardBody className="space-y-2 text-sm">
                {scrapeResult.error && (
                  <p className="text-danger">{scrapeResult.error}</p>
                )}
                {scrapeResult.hint && (
                  <p className="text-text-secondary">{scrapeResult.hint}</p>
                )}
                {scrapeResult.detail && (
                  <p className="text-text-secondary">{scrapeResult.detail}</p>
                )}
                {scrapeResult.warnings?.map((w) => (
                  <p key={w} className="text-warning">
                    {w}
                  </p>
                ))}
                {scrapeResult.summary && (
                  <pre className="overflow-x-auto rounded-lg bg-bg-soft p-3 text-xs">
                    {JSON.stringify(scrapeResult.summary, null, 2)}
                  </pre>
                )}
                {scrapeResult.results != null && (
                  <details>
                    <summary className="cursor-pointer text-brand-700">
                      Pełna odpowiedź API
                    </summary>
                    <pre className="mt-2 max-h-96 overflow-auto rounded-lg bg-bg-soft p-3 text-xs">
                      {JSON.stringify(scrapeResult.results, null, 2)}
                    </pre>
                  </details>
                )}
              </CardBody>
            </Card>
          )}
        </>
      )}

      <Link href="/app#search" className="text-sm font-semibold text-brand-700 hover:underline">
        ← Wróć do wyszukiwarki
      </Link>
    </PageContainer>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border-default bg-bg-soft/50 px-3 py-2">
      <dt className="text-xs text-text-tertiary">{label}</dt>
      <dd className="font-display text-lg font-bold text-text-primary">
        {value}
      </dd>
    </div>
  );
}

function CoverageBadge({
  status,
}: {
  status: CoverageReport["destinations"][number]["status"];
}) {
  const styles = {
    ok: "text-success",
    sparse: "text-warning",
    empty: "text-danger font-semibold",
    untagged: "text-warning font-semibold",
  };
  const labels = {
    ok: "OK",
    sparse: "Mało",
    empty: "Puste",
    untagged: "Bez tagów",
  };
  return <span className={styles[status]}>{labels[status]}</span>;
}

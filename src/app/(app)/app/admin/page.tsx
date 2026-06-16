"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageContainer, Breadcrumb } from "@/components/layout/Header";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EUROPE_SCRAPE_REGIONS } from "@/lib/api/osm-scrape-regions";

type SetupStatus = {
  user: { email: string; is_admin: boolean };
  supabase_host: string | null;
  service_role_ok: boolean;
  service_role_error: string | null;
  admin_emails_configured: boolean;
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
};

const EUROPE_SCRAPE_BUTTONS = [
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
    try {
      const params = new URLSearchParams();
      if (bbox) params.set("bbox", bbox);
      if (options?.skipTagging) params.set("skipTagging", "true");
      const url = `/api/admin/initial-scrape${params.size ? `?${params}` : ""}`;
      const r = await fetch(url, { method: "POST" });
      const data = (await r.json()) as ScrapeResponse;
      setScrapeResult(data);
      if (!r.ok) {
        setError(data.error ?? `HTTP ${r.status}`);
      }
      await loadStatus();
      await loadCoverage();
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setScraping(false);
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
        const tagRes = await fetch("/api/admin/initial-scrape?skipScrape=true", {
          method: "POST",
        });
        const tagData = (await tagRes.json()) as ScrapeResponse;
        setScrapeResult(tagData);
        await loadStatus();
        await loadCoverage();
        setQueueLabel("Tagowanie zakończone.");
        return;
      }

      const steps: QueueStep[] = [];

      for (const region of regions) {
        setQueueLabel(`Scrape: ${region} (${steps.length + 1}/${regions.length})…`);
        const params = new URLSearchParams({
          bbox: region,
          skipTagging: "true",
        });
        const r = await fetch(`/api/admin/initial-scrape?${params}`, {
          method: "POST",
        });
        const data = (await r.json()) as ScrapeResponse;
        steps.push({
          region,
          ok: r.ok && (data.summary?.persisted ?? 0) >= 0,
          summary: data.summary,
          error: data.error ?? (r.ok ? undefined : `HTTP ${r.status}`),
        });
        setQueueProgress([...steps]);
      }

      setQueueLabel("Tagowanie aktywności…");
      const tagRes = await fetch("/api/admin/initial-scrape?skipScrape=true", {
        method: "POST",
      });
      const tagData = (await tagRes.json()) as ScrapeResponse;
      setScrapeResult(tagData);
      if (!tagRes.ok) {
        setError(tagData.error ?? `HTTP ${tagRes.status}`);
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

  async function runTaggingOnly() {
    setScraping(true);
    setScrapeResult(null);
    try {
      const r = await fetch(
        "/api/admin/initial-scrape?skipScrape=true",
        { method: "POST" },
      );
      const data = (await r.json()) as ScrapeResponse;
      setScrapeResult(data);
      await loadStatus();
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
                    Jeden region trwa ok. 3–8 min (limit Vercel). Kolejka uruchamia
                    regiony po kolei, na końcu tagowanie. Nie zamykaj karty do
                    końca kolejki.
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
                            ? ` — ${step.summary.persisted} zapisanych, ${step.summary.scrape_errors} błędów`
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
                          "action" in btn ? "primary" : "secondary"
                        }
                        onClick={() =>
                          "action" in btn
                            ? runScrapeEuropeQueue(
                                btn.action === "queue-all" ? "all" : "empty",
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

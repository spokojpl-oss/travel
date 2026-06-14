"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageContainer, Breadcrumb } from "@/components/layout/Header";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

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

export default function AdminSetupPage() {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<ScrapeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  async function runScrape(bbox?: string) {
    setScraping(true);
    setScrapeResult(null);
    setError(null);
    try {
      const url = bbox
        ? `/api/admin/initial-scrape?bbox=${encodeURIComponent(bbox)}`
        : "/api/admin/initial-scrape";
      const r = await fetch(url, { method: "POST" });
      const data = (await r.json()) as ScrapeResponse;
      setScrapeResult(data);
      if (!r.ok) {
        setError(data.error ?? `HTTP ${r.status}`);
      }
      await loadStatus();
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
            <Card className="mb-6">
              <CardHeader title="Uruchom scrape" />
              <CardBody className="space-y-4">
                <p className="text-sm text-text-secondary">
                  Najpierw test na Polsce (~3 min), potem pełny scrape (~15–20
                  min). Nie zamykaj karty podczas działania.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    size="sm"
                    disabled={scraping}
                    onClick={() => runScrape("Poland + neighbors")}
                  >
                    {scraping ? "Trwa..." : "Scrape: Polska"}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={scraping}
                    onClick={() => runScrape()}
                  >
                    {scraping ? "Trwa..." : "Scrape: wszystkie regiony"}
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

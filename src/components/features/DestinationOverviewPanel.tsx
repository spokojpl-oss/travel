"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SkeletonList } from "@/components/ui/Skeleton";
import type { DestinationOverview } from "@/lib/search/destination-overview";
import type { ActivityGroup, Activity } from "@/types/domain";
import { useT, useLocale } from "@/i18n/locale-provider";

function excerpt(text: string | undefined, max = 600): string | null {
  if (!text?.trim()) return null;
  const t = text.trim();
  return t.length > max ? `${t.slice(0, max).trim()}…` : t;
}

export function DestinationOverviewPanel({
  overview,
  loading,
  error,
  taxonomy,
  onContinue,
}: {
  overview: DestinationOverview | null;
  loading: boolean;
  error: string | null;
  taxonomy: Array<ActivityGroup & { activities: Activity[] }>;
  onContinue: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();

  if (loading) {
    return (
      <Card className="mb-8">
        <CardBody>
          <SkeletonList count={4} />
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mb-8 border-warning/40">
        <CardBody>
          <p className="text-danger">{error}</p>
          <Button className="mt-4" onClick={onContinue}>
            {t("search.continueToActivities")}
          </Button>
        </CardBody>
      </Card>
    );
  }

  if (!overview) return null;

  const wv = overview.wikivoyage;
  const topActivities = taxonomy
    .flatMap((g) =>
      g.activities.map((a) => ({
        slug: a.slug,
        name: locale === "en" ? a.name_en : a.name_pl,
        count: overview.activity_counts[a.slug] ?? 0,
      })),
    )
    .filter((a) => a.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  return (
    <>
      <Card className="mb-6">
        <CardHeader title={overview.destination_label.split(",")[0] ?? overview.destination_label} />
        <CardBody className="space-y-4 text-sm text-text-secondary">
          <p className="text-base text-text-primary">{overview.scope_intro}</p>
          {wv?.intro && <p>{excerpt(wv.intro, 900)}</p>}
          {wv?.sections.understand && (
            <>
              <h3 className="font-semibold text-text-primary">
                {t("search.overviewUnderstand")}
              </h3>
              <p>{excerpt(wv.sections.understand)}</p>
            </>
          )}
        </CardBody>
      </Card>

      {overview.weather && (
        <Card className="mb-6">
          <CardHeader title={t("search.overviewWeather")} />
          <CardBody className="text-sm text-text-secondary">
            <p>
              {overview.weather.date_from} – {overview.weather.date_to}:{" "}
              <strong className="text-text-primary">
                {overview.weather.avg_temp_min}–{overview.weather.avg_temp_max}°C
              </strong>
              {overview.weather.rainy_days > 0 &&
                ` · ${overview.weather.rainy_days} ${t("search.overviewRainyDays")}`}
              {overview.weather.avg_uv_index > 5 &&
                ` · UV ~${overview.weather.avg_uv_index}`}
            </p>
          </CardBody>
        </Card>
      )}

      {excerpt(wv?.sections.see) && (
        <Card className="mb-6">
          <CardHeader title={t("search.overviewSee")} />
          <CardBody className="text-sm text-text-secondary">
            <p>{excerpt(wv?.sections.see, 1200)}</p>
          </CardBody>
        </Card>
      )}

      {(excerpt(wv?.sections.do) || topActivities.length > 0) && (
        <Card className="mb-6">
          <CardHeader title={t("search.overviewDo")} />
          <CardBody className="space-y-3 text-sm text-text-secondary">
            {excerpt(wv?.sections.do) && (
              <p>{excerpt(wv?.sections.do, 1000)}</p>
            )}
            {topActivities.length > 0 && (
              <p className="text-text-primary">
                {t("search.overviewActivitiesHint")}
              </p>
            )}
          </CardBody>
        </Card>
      )}

      {excerpt(wv?.sections.eat) && (
        <Card className="mb-6">
          <CardHeader title={t("search.overviewEat")} />
          <CardBody className="text-sm text-text-secondary">
            <p>{excerpt(wv?.sections.eat, 800)}</p>
          </CardBody>
        </Card>
      )}

      {excerpt(wv?.sections.getAround) && (
        <Card className="mb-6">
          <CardHeader title={t("search.overviewGettingAround")} />
          <CardBody className="text-sm text-text-secondary">
            <p>{excerpt(wv?.sections.getAround, 600)}</p>
          </CardBody>
        </Card>
      )}

      {wv?.sourceUrl && (
        <p className="mb-6 text-xs text-text-tertiary">
          {t("search.overviewSource")}{" "}
          <a
            href={wv.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-700 hover:underline"
          >
            Wikivoyage
          </a>
        </p>
      )}

      <Button size="lg" onClick={onContinue}>
        {t("search.continueToActivities")}
      </Button>
    </>
  );
}

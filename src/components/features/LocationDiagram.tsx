"use client";

import { cn } from "@/lib/utils/cn";
import { Icon } from "@/components/ui/Icon";

export type DiagramPoint = {
  id: string;
  type: "airport" | "hotel" | "attraction" | "centroid";
  label: string;
  lat: number;
  lon: number;
  badge?: string;
};

export type DiagramLine = {
  from: string;
  to: string;
  distance_km: number;
  duration_min?: number;
};

export function LocationDiagram({
  points,
  lines,
  className,
  size = "md",
}: {
  points: DiagramPoint[];
  lines: DiagramLine[];
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  if (points.length === 0) {
    return (
      <div
        className={cn(
          "flex h-48 items-center justify-center rounded-xl border border-border-default bg-bg-soft text-sm text-text-tertiary",
          className,
        )}
      >
        Brak danych lokalizacji
      </div>
    );
  }

  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const padLat = Math.max((maxLat - minLat) * 0.2, 0.01);
  const padLon = Math.max((maxLon - minLon) * 0.2, 0.01);

  const W = size === "sm" ? 400 : size === "md" ? 800 : 1000;
  const H = size === "sm" ? 280 : size === "md" ? 450 : 560;

  const project = (lat: number, lon: number) => {
    const x =
      ((lon - (minLon - padLon)) / (maxLon + padLon - (minLon - padLon))) * W;
    const y =
      H -
      ((lat - (minLat - padLat)) / (maxLat + padLat - (minLat - padLat))) * H;
    return { x, y };
  };

  const pointMap = new Map(
    points.map((p) => [p.id, { ...p, ...project(p.lat, p.lon) }]),
  );

  return (
    <div
      className={cn(
        "location-diagram relative overflow-hidden rounded-2xl border border-border-default bg-gradient-to-br from-bg-soft to-white shadow-card",
        className,
      )}
    >
      {size !== "sm" && (
        <>
          <div className="absolute top-4 left-4 z-10">
            <div className="inline-flex items-center gap-2 rounded-lg border border-border-default bg-white px-3 py-1.5 text-xs font-semibold text-text-secondary shadow-sm">
              <Icon name="map-pin" size={14} className="text-brand-700" />
              Mapa lokalizacji (schemat)
            </div>
          </div>
          <div className="absolute top-4 right-4 z-10 rounded-lg border border-border-default bg-white px-3 py-2 text-xs shadow-sm">
            <div className="flex items-center gap-4">
              <LegendItem color="#003faa" shape="triangle" label="Lotnisko" />
              <LegendItem color="#ff5b00" shape="square" label="Hotel" />
              <LegendItem color="#16a34a" shape="circle" label="Atrakcja" />
            </div>
          </div>
        </>
      )}

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ aspectRatio: `${W}/${H}` }}
      >
        <defs>
          <pattern
            id="lightgrid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="#e0e6ed"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#lightgrid)" />

        {lines.map((line, i) => {
          const from = pointMap.get(line.from);
          const to = pointMap.get(line.to);
          if (!from || !to) return null;
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;
          return (
            <g key={i}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="#8a96a3"
                strokeWidth="1.5"
                strokeDasharray="6 4"
              />
              <rect
                x={midX - 28}
                y={midY - 10}
                width="56"
                height="20"
                fill="white"
                stroke="#e0e6ed"
                rx="4"
              />
              <text
                x={midX}
                y={midY + 4}
                fill="#1a2b3c"
                fontSize="11"
                fontWeight="600"
                textAnchor="middle"
              >
                {Math.round(line.distance_km)} km
              </text>
            </g>
          );
        })}

        {Array.from(pointMap.values()).map((p) => (
          <g key={p.id}>
            <PointMarker x={p.x} y={p.y} type={p.type} />
            {size !== "sm" && (
              <>
                <rect
                  x={p.x + 12}
                  y={p.y - 10}
                  width={Math.max(p.label.length * 6.5 + 12, 60)}
                  height={p.badge ? 32 : 20}
                  fill="white"
                  stroke="#e0e6ed"
                  rx="4"
                />
                <text
                  x={p.x + 18}
                  y={p.y + 4}
                  fill="#1a2b3c"
                  fontSize="12"
                  fontWeight="600"
                >
                  {p.label}
                </text>
                {p.badge && (
                  <text x={p.x + 18} y={p.y + 18} fill="#5a6878" fontSize="10">
                    {p.badge}
                  </text>
                )}
              </>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

export function LocationDiagramMini(props: {
  points: DiagramPoint[];
  lines: DiagramLine[];
}) {
  return <LocationDiagram {...props} size="sm" className="h-full" />;
}

function PointMarker({
  x,
  y,
  type,
}: {
  x: number;
  y: number;
  type: DiagramPoint["type"];
}) {
  switch (type) {
    case "airport":
      return (
        <polygon
          points={`${x},${y - 8} ${x - 7},${y + 5} ${x + 7},${y + 5}`}
          fill="#003faa"
          stroke="white"
          strokeWidth="2"
        />
      );
    case "hotel":
      return (
        <rect
          x={x - 6}
          y={y - 6}
          width="12"
          height="12"
          fill="#ff5b00"
          stroke="white"
          strokeWidth="2"
        />
      );
    case "attraction":
      return (
        <circle
          cx={x}
          cy={y}
          r="6"
          fill="#16a34a"
          stroke="white"
          strokeWidth="2"
        />
      );
    case "centroid":
      return (
        <g>
          <circle
            cx={x}
            cy={y}
            r="8"
            fill="white"
            stroke="#ff5b00"
            strokeWidth="2"
          />
          <text
            x={x}
            y={y + 4}
            fill="#ff5b00"
            fontSize="12"
            fontWeight="bold"
            textAnchor="middle"
          >
            +
          </text>
        </g>
      );
  }
}

function LegendItem({
  color,
  shape,
  label,
}: {
  color: string;
  shape: "triangle" | "square" | "circle";
  label: string;
}) {
  return (
    <span className="flex items-center gap-1.5 text-text-secondary">
      {shape === "triangle" && (
        <svg width="10" height="10" viewBox="0 0 10 10">
          <polygon points="5,0 0,10 10,10" fill={color} />
        </svg>
      )}
      {shape === "square" && (
        <svg width="10" height="10" viewBox="0 0 10 10">
          <rect width="10" height="10" fill={color} />
        </svg>
      )}
      {shape === "circle" && (
        <svg width="10" height="10" viewBox="0 0 10 10">
          <circle cx="5" cy="5" r="5" fill={color} />
        </svg>
      )}
      <span className="font-medium">{label}</span>
    </span>
  );
}

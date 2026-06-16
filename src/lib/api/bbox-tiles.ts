import type { OsmCategory } from "@/lib/api/osm";
import type { BoundingBox } from "@/types/domain";

export function bboxSpan(bbox: BoundingBox): number {
  return Math.abs(bbox.north - bbox.south) + Math.abs(bbox.east - bbox.west);
}

/** Im gęstsza kategoria / większy bbox, tym więcej kafelków (N×N). */
export function tileGridForScrape(bbox: BoundingBox, category: OsmCategory): number {
  const span = bboxSpan(bbox);
  const dense = new Set<OsmCategory>([
    "tourism_attraction",
    "beach",
    "museum",
    "viewpoint",
    "hiking",
    "archaeological_site",
  ]).has(category);

  if (dense) {
    if (span >= 18) return 4;
    if (span >= 10) return 3;
    if (span >= 5) return 2;
    return 1;
  }

  if (span >= 22) return 3;
  if (span >= 14) return 2;
  return 1;
}

export function subdivideBbox(bbox: BoundingBox, grid: number): BoundingBox[] {
  if (grid <= 1) return [bbox];

  const tiles: BoundingBox[] = [];
  const latStep = (bbox.north - bbox.south) / grid;
  const lonStep = (bbox.east - bbox.west) / grid;

  for (let row = 0; row < grid; row++) {
    for (let col = 0; col < grid; col++) {
      tiles.push({
        south: bbox.south + row * latStep,
        north: bbox.south + (row + 1) * latStep,
        west: bbox.west + col * lonStep,
        east: bbox.west + (col + 1) * lonStep,
      });
    }
  }

  return tiles;
}

export function tileLabel(grid: number, index: number): string {
  if (grid <= 1) return "";
  const row = Math.floor(index / grid) + 1;
  const col = (index % grid) + 1;
  return ` [${row},${col}/${grid}×${grid}]`;
}

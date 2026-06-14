export function Skeleton({
  height = 20,
  width = "100%",
}: {
  height?: number | string;
  width?: number | string;
}) {
  return (
    <div
      className="rounded skeleton-shimmer"
      style={{
        height: typeof height === "number" ? `${height}px` : height,
        width: typeof width === "number" ? `${width}px` : width,
      }}
    />
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <Skeleton height={20} width="60%" />
          <div className="mt-2">
            <Skeleton height={14} width="80%" />
          </div>
        </div>
      ))}
    </div>
  );
}

const DRIVE_SCRIPT_ATTRS = {
  nowprocket: "",
  "data-noptimize": "1",
  "data-cfasync": "false",
  "data-wpfc-render": "false",
  "seraph-accel-crit": "1",
  "data-no-defer": "1",
} as const;

function driveScriptSrc(driveId: string): string {
  const encodedId = Buffer.from(driveId, "utf8").toString("base64");
  return `https://emrld.ltd/${encodedId}.js?t=${driveId}`;
}

export function TravelpayoutsDriveScript() {
  const driveId = process.env.NEXT_PUBLIC_TRAVELPAYOUTS_DRIVE_ID?.trim();
  if (!driveId) return null;

  const src = driveScriptSrc(driveId);

  return (
    <script
      {...DRIVE_SCRIPT_ATTRS}
      dangerouslySetInnerHTML={{
        __html: `(function () {
    var script = document.createElement("script");
    script.async = 1;
    script.src = '${src}';
    document.head.appendChild(script);
  })();`,
      }}
    />
  );
}

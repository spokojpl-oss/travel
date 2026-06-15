import type { ScriptHTMLAttributes } from "react";

const DRIVE_SCRIPT_PROPS = {
  nowprocket: "",
  "data-noptimize": "1",
  "data-cfasync": "false",
  "data-wpfc-render": "false",
  "seraph-accel-crit": "1",
  "data-no-defer": "1",
  dangerouslySetInnerHTML: {
    __html: `(function () {
    var script = document.createElement("script");
    script.async = 1;
    script.src = 'https://emrld.ltd/NTM5NzEy.js?t=539712';
    document.head.appendChild(script);
  })();`,
  },
} satisfies ScriptHTMLAttributes<HTMLScriptElement> & Record<string, string | { __html: string }>;

/**
 * Travelpayouts Drive — skrypt z panelu (Manual installation → head).
 * ID projektu: 539712 → https://emrld.ltd/NTM5NzEy.js?t=539712
 */
export function TravelpayoutsDriveScript() {
  return <script {...DRIVE_SCRIPT_PROPS} />;
}

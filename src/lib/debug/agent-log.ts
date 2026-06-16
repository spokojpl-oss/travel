import { appendFileSync, mkdirSync } from "fs";
import { join } from "path";

const ENDPOINT =
  "http://127.0.0.1:7245/ingest/173647fd-e041-4dc5-8254-79e68a12fc0f";
const SESSION = "ac6478";
const LOG_PATH = join(process.cwd(), ".cursor/debug-ac6478.log");

export function agentLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
  runId = "pre-fix",
): void {
  const payload = {
    sessionId: SESSION,
    runId,
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };

  // #region agent log
  try {
    mkdirSync(join(process.cwd(), ".cursor"), { recursive: true });
    appendFileSync(LOG_PATH, `${JSON.stringify(payload)}\n`);
  } catch {
    /* ignore fs errors */
  }

  fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": SESSION,
    },
    body: JSON.stringify(payload),
  }).catch(() => {});
  // #endregion
}

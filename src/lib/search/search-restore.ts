const STORAGE_KEY = "restore_search_activities";
const RERUN_KEY = "restore_search_rerun";

export type SearchRestoreState = {
  activities: string[];
  step: number;
  rerunSearch?: boolean;
};

export function storeSearchRestoreState(state: SearchRestoreState): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (state.rerunSearch) {
    sessionStorage.setItem(RERUN_KEY, "1");
  }
}

export function readSearchRestoreState(): SearchRestoreState | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SearchRestoreState> & {
      activities?: string[];
    };
    if (!parsed.activities?.length) return null;
    return {
      activities: parsed.activities,
      step: parsed.step ?? 6,
      rerunSearch: parsed.rerunSearch,
    };
  } catch {
    return null;
  }
}

export function clearSearchRestoreState(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}

export function consumeSearchRerunFlag(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  if (sessionStorage.getItem(RERUN_KEY) !== "1") return false;
  sessionStorage.removeItem(RERUN_KEY);
  return true;
}

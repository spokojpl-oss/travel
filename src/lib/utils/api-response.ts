export async function readApiError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const data = JSON.parse(text) as { error?: unknown; issues?: unknown };
    if (typeof data.error === "string") return data.error;
    if (data.issues) return "Nieprawidłowe dane formularza";
    return `Błąd ${res.status}`;
  } catch {
    if (res.status === 401) return "Wymagane logowanie";
    if (res.status === 404) return "Nie znaleziono zasobu";
    return `Błąd serwera (${res.status})`;
  }
}

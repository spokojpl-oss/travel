"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type LoginMode = "password" | "magic_link";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "sent" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus("error");
        setErrorMessage(translateAuthError(data.error ?? "Logowanie nieudane"));
        return;
      }

      router.push("/app");
      router.refresh();
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Błąd połączenia z serwerem",
      );
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus("error");
        setErrorMessage(translateAuthError(data.error ?? "Wysyłka nieudana"));
        return;
      }

      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Błąd połączenia z serwerem",
      );
    }
  }

  return (
    <div className="p-8 max-w-md">
      <h1 className="text-2xl font-bold mb-4">Logowanie</h1>

      <div className="flex gap-4 mb-6 text-sm">
        <button
          type="button"
          onClick={() => {
            setMode("password");
            setStatus("idle");
            setErrorMessage("");
          }}
          className={mode === "password" ? "font-bold underline" : "underline"}
        >
          Email i hasło
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("magic_link");
            setStatus("idle");
            setErrorMessage("");
          }}
          className={mode === "magic_link" ? "font-bold underline" : "underline"}
        >
          Magic link
        </button>
      </div>

      {status === "sent" && mode === "magic_link" ? (
        <p>
          Sprawdź email – wysłaliśmy link do logowania na{" "}
          <strong>{email}</strong>
        </p>
      ) : mode === "password" ? (
        <form onSubmit={handlePasswordLogin} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={status === "loading"}
            className="border px-3 py-2 rounded"
          />
          <input
            type="password"
            placeholder="Hasło"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            disabled={status === "loading"}
            className="border px-3 py-2 rounded"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="border px-4 py-2 rounded bg-black text-white disabled:opacity-50"
          >
            {status === "loading" ? "Loguję..." : "Zaloguj się"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleMagicLink} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={status === "loading"}
            className="border px-3 py-2 rounded"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="border px-4 py-2 rounded bg-black text-white disabled:opacity-50"
          >
            {status === "loading" ? "Wysyłam..." : "Wyślij link logowania"}
          </button>
          <p className="text-sm text-gray-600">
            Magic link wymaga działającej poczty w Supabase. Na darmowym planie
            limit to ~4 maile/godz. Jeśli nie przychodzi – użyj email i hasło.
          </p>
        </form>
      )}

      {status === "error" && (
        <p className="text-red-600 mt-3">Błąd: {errorMessage}</p>
      )}

      <p className="mt-4">
        <a href="/" className="underline">
          ← Strona główna
        </a>
      </p>
    </div>
  );
}

function translateAuthError(message: string): string {
  if (message.includes("Invalid login credentials")) {
    return "Nieprawidłowy email lub hasło.";
  }
  if (message.includes("Email not confirmed")) {
    return "Email nie został potwierdzony. W Supabase wyłącz „Confirm email” lub potwierdź konto.";
  }
  if (message.includes("rate limit")) {
    return "Za dużo prób. Poczekaj chwilę i spróbuj ponownie.";
  }
  return message;
}

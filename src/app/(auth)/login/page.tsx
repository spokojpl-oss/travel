"use client";

import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
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
    <div className="flex min-h-full flex-col bg-bg-soft">
      <Header variant="public" />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-border-default bg-white p-8 shadow-card">
          <h1 className="font-display mb-2 text-2xl font-bold text-text-primary">
            Zaloguj się
          </h1>
          <p className="mb-6 text-sm text-text-secondary">
            Planuj wakacje dopasowane do Twojej rodziny
          </p>

          <div className="mb-6 flex gap-2 rounded-lg bg-bg-soft p-1 text-sm">
            <button
              type="button"
              onClick={() => {
                setMode("password");
                setStatus("idle");
                setErrorMessage("");
              }}
              className={`flex-1 rounded-md px-3 py-2 font-medium transition-colors ${
                mode === "password"
                  ? "bg-white text-text-primary shadow-sm"
                  : "text-text-secondary"
              }`}
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
              className={`flex-1 rounded-md px-3 py-2 font-medium transition-colors ${
                mode === "magic_link"
                  ? "bg-white text-text-primary shadow-sm"
                  : "text-text-secondary"
              }`}
            >
              Magic link
            </button>
          </div>

          {status === "sent" && mode === "magic_link" ? (
            <p className="text-text-secondary">
              Sprawdź email – wysłaliśmy link do logowania na{" "}
              <strong className="text-text-primary">{email}</strong>
            </p>
          ) : mode === "password" ? (
            <form onSubmit={handlePasswordLogin} className="flex flex-col gap-4">
              <Input
                type="email"
                label="Email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={status === "loading"}
              />
              <Input
                type="password"
                label="Hasło"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={status === "loading"}
              />
              <Button type="submit" disabled={status === "loading"} className="w-full">
                {status === "loading" ? "Loguję..." : "Zaloguj się"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleMagicLink} className="flex flex-col gap-4">
              <Input
                type="email"
                label="Email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={status === "loading"}
              />
              <Button type="submit" disabled={status === "loading"} className="w-full">
                {status === "loading" ? "Wysyłam..." : "Wyślij link logowania"}
              </Button>
              <p className="text-xs text-text-tertiary">
                Magic link wymaga działającej poczty w Supabase. Na darmowym planie
                limit to ~4 maile/godz. Jeśli nie przychodzi – użyj email i hasło.
              </p>
            </form>
          )}

          {status === "error" && (
            <p className="mt-4 text-sm text-danger">Błąd: {errorMessage}</p>
          )}

          <p className="mt-6 text-center text-sm">
            <Link href="/" className="text-brand-700 hover:underline">
              ← Strona główna
            </Link>
          </p>
        </div>
      </main>
      <Footer />
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

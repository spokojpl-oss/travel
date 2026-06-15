"use client";

import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/i18n/locale-provider";

type LoginMode = "password" | "magic_link";

export default function LoginPage() {
  const t = useT();
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "sent" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  function translateAuthError(message: string): string {
    if (message.includes("Invalid login credentials")) {
      return t("login.invalidCredentials");
    }
    if (message.includes("Email not confirmed")) {
      return t("login.emailNotConfirmed");
    }
    if (message.includes("rate limit")) {
      return t("login.rateLimit");
    }
    return message;
  }

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
        setErrorMessage(translateAuthError(data.error ?? t("login.loginFailed")));
        return;
      }

      router.push("/app");
      router.refresh();
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : t("login.connectionError"),
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
        setErrorMessage(translateAuthError(data.error ?? t("login.sendFailed")));
        return;
      }

      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : t("login.connectionError"),
      );
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-bg-soft">
      <Header variant="public" />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-border-default bg-white p-8 shadow-card">
          <h1 className="font-display mb-2 text-2xl font-bold text-text-primary">
            {t("login.title")}
          </h1>
          <p className="mb-6 text-sm text-text-secondary">
            {t("login.subtitle")}
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
              {t("login.passwordTab")}
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
              {t("login.magicTab")}
            </button>
          </div>

          {status === "sent" && mode === "magic_link" ? (
            <p className="text-text-secondary">
              {t("login.magicSent")}{" "}
              <strong className="text-text-primary">{email}</strong>
            </p>
          ) : mode === "password" ? (
            <form onSubmit={handlePasswordLogin} className="flex flex-col gap-4">
              <Input
                type="email"
                label={t("login.email")}
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={status === "loading"}
              />
              <Input
                type="password"
                label={t("login.password")}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={status === "loading"}
              />
              <Button type="submit" disabled={status === "loading"} className="w-full">
                {status === "loading" ? t("login.submitting") : t("login.submit")}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleMagicLink} className="flex flex-col gap-4">
              <Input
                type="email"
                label={t("login.email")}
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={status === "loading"}
              />
              <Button type="submit" disabled={status === "loading"} className="w-full">
                {status === "loading" ? t("login.sending") : t("login.sendLink")}
              </Button>
              <p className="text-xs text-text-tertiary">{t("login.magicHint")}</p>
            </form>
          )}

          {status === "error" && (
            <p className="mt-4 text-sm text-danger">
              {t("login.error")} {errorMessage}
            </p>
          )}

          <p className="mt-6 text-center text-sm">
            <Link href="/" className="text-brand-700 hover:underline">
              {t("login.backHome")}
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

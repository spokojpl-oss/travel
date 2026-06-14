"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <div className="p-8 max-w-md">
      <h1 className="text-2xl font-bold mb-4">Logowanie</h1>
      {status === "sent" ? (
        <p>
          Sprawdź email – wysłaliśmy link do logowania na <strong>{email}</strong>
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={status === "sending"}
            className="border px-3 py-2 rounded"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="border px-4 py-2 rounded bg-black text-white disabled:opacity-50"
          >
            {status === "sending" ? "Wysyłam..." : "Wyślij link logowania"}
          </button>
          {status === "error" && (
            <p className="text-red-600">Błąd: {errorMessage}</p>
          )}
        </form>
      )}
      <p className="mt-4">
        <a href="/" className="underline">
          ← Strona główna
        </a>
      </p>
    </div>
  );
}

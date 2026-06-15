"use client";

import { useState } from "react";
import Link from "next/link";
import { updateProfile } from "@/app/(app)/app/groups/actions";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

type ProfileFormProps = {
  email: string;
  displayName: string;
  defaultGroupId: string | null;
  groups: { id: string; name: string }[];
};

export function ProfileForm({
  email,
  displayName,
  defaultGroupId,
  groups,
}: ProfileFormProps) {
  const [name, setName] = useState(displayName);
  const [defaultId, setDefaultId] = useState(defaultGroupId ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setError(null);

    const result = await updateProfile({
      display_name: name,
      default_group_id: defaultId || null,
    });

    if (result && "error" in result) {
      setStatus("error");
      setError(result.error ?? "Nieznany błąd");
      return;
    }

    setStatus("saved");
  }

  return (
    <Card className="max-w-lg">
      <CardHeader title="Ustawienia konta" />
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            type="email"
            label="Email"
            value={email}
            disabled
            className="bg-bg-soft text-text-secondary"
          />

          <Input
            type="text"
            label="Wyświetlana nazwa"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="np. Ania i Tomek"
          />

          <div className="w-full">
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Domyślna grupa
            </label>
            <select
              value={defaultId}
              onChange={(e) => setDefaultId(e.target.value)}
              className={cn(
                "block w-full rounded-md border border-border-default bg-white px-3 py-2.5 text-base text-text-primary transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100",
              )}
            >
              <option value="">— brak —</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-text-tertiary">
              {groups.length === 0 ? (
                <>
                  Nie masz jeszcze grup.{" "}
                  <Link href="/app/groups/new" className="text-brand-700 hover:underline">
                    Stwórz grupę
                  </Link>
                </>
              ) : (
                "Uzupełnia pasażerów w formularzu wyszukiwania oraz przy zapisanych wyjazdach."
              )}
            </p>
          </div>

          {error && <p className="text-sm text-danger">Błąd: {error}</p>}
          {status === "saved" && (
            <p className="text-sm text-success">Profil zapisany.</p>
          )}

          <Button type="submit" disabled={status === "saving"}>
            {status === "saving" ? "Zapisuję..." : "Zapisz"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { updateProfile } from "@/app/(app)/app/groups/actions";

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
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <div>
        <label className="block mb-1 font-medium">Email</label>
        <input
          type="email"
          value={email}
          disabled
          className="border px-3 py-2 rounded w-full bg-gray-50"
        />
      </div>

      <div>
        <label className="block mb-1 font-medium">Wyświetlana nazwa</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="border px-3 py-2 rounded w-full"
        />
      </div>

      <div>
        <label className="block mb-1 font-medium">Domyślna grupa</label>
        <select
          value={defaultId}
          onChange={(e) => setDefaultId(e.target.value)}
          className="border px-3 py-2 rounded w-full"
        >
          <option value="">— brak —</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-red-600">Błąd: {error}</p>}
      {status === "saved" && (
        <p className="text-green-700">Profil zapisany.</p>
      )}

      <button
        type="submit"
        disabled={status === "saving"}
        className="border px-4 py-2 rounded bg-black text-white disabled:opacity-50"
      >
        {status === "saving" ? "Zapisuję..." : "Zapisz"}
      </button>
    </form>
  );
}

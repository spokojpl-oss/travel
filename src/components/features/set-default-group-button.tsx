"use client";

import { setDefaultGroup } from "@/app/(app)/app/groups/actions";
import { useTransition } from "react";

export function SetDefaultGroupButton({ groupId }: { groupId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() =>
        startTransition(async () => {
          await setDefaultGroup(groupId);
        })
      }
      disabled={pending}
      className="border px-4 py-2 rounded underline disabled:opacity-50"
    >
      {pending ? "Zapisuję..." : "Ustaw jako domyślną"}
    </button>
  );
}

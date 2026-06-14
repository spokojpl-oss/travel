"use client";

import { deleteGroup } from "@/app/(app)/app/groups/actions";
import { useTransition } from "react";

export function DeleteGroupButton({ groupId }: { groupId: string }) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (
      !confirm(
        "Czy na pewno chcesz usunąć tę grupę? Tej operacji nie można cofnąć.",
      )
    ) {
      return;
    }

    startTransition(async () => {
      await deleteGroup(groupId);
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      className="border px-4 py-2 rounded text-red-600 disabled:opacity-50"
    >
      {pending ? "Usuwam..." : "Usuń grupę"}
    </button>
  );
}

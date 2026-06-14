"use client";

import { deleteGroup } from "@/app/(app)/app/groups/actions";
import { useTransition } from "react";
import { Button } from "@/components/ui/Button";

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
    <Button
      type="button"
      variant="danger"
      size="sm"
      onClick={handleDelete}
      disabled={pending}
    >
      {pending ? "Usuwam..." : "Usuń grupę"}
    </Button>
  );
}

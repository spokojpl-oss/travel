"use client";

import { setDefaultGroup } from "@/app/(app)/app/groups/actions";
import { useTransition } from "react";
import { Button } from "@/components/ui/Button";

export function SetDefaultGroupButton({ groupId }: { groupId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={() =>
        startTransition(async () => {
          await setDefaultGroup(groupId);
        })
      }
      disabled={pending}
    >
      {pending ? "Zapisuję..." : "Ustaw jako domyślną"}
    </Button>
  );
}

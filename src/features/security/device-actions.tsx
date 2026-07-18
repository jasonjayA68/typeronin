"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { trustDevice, untrustDevice } from "@/features/security/actions";
import { Button } from "@/shared/components/ui/button";

/** Trust or reopen one device — the admin override. */
export function DeviceRowActions({ id, trusted }: { id: string; trusted: boolean }) {
  const [pending, startTransition] = useTransition();

  const run = (fn: typeof trustDevice, label: string) =>
    startTransition(async () => {
      const result = await fn(id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(label);
    });

  return trusted ? (
    <Button
      variant="ghost"
      size="xs"
      disabled={pending}
      onClick={() => run(untrustDevice, "Device reopened")}
    >
      Reopen
    </Button>
  ) : (
    <Button
      variant="ghost"
      size="xs"
      disabled={pending}
      onClick={() => run(trustDevice, "Device trusted")}
    >
      Trust
    </Button>
  );
}

"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { deleteSubscriber, unsubscribeSubscriber } from "@/features/admin/content-actions";
import { Button } from "@/shared/components/ui/button";

/**
 * Row actions for one subscriber.
 *
 * Unsubscribe is offered first and deliberately: it keeps the address on file
 * as a record that this person asked to be left alone, which a later import
 * cannot then undo. Delete is the harder verb, for an erasure request.
 */
export function SubscriberRowActions({
  subscriberId,
  email,
  canUnsubscribe,
}: {
  subscriberId: string;
  email: string;
  canUnsubscribe: boolean;
}) {
  const [pending, startTransition] = useTransition();

  const unsubscribe = () =>
    startTransition(async () => {
      const result = await unsubscribeSubscriber(subscriberId);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`${email} unsubscribed`);
    });

  const remove = () =>
    startTransition(async () => {
      const result = await deleteSubscriber(subscriberId);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`${email} removed`);
    });

  return (
    <span className="flex items-center justify-end gap-1">
      {canUnsubscribe ? (
        <Button variant="ghost" size="sm" disabled={pending} onClick={unsubscribe}>
          Unsubscribe
        </Button>
      ) : null}
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
        disabled={pending}
        onClick={remove}
      >
        Delete
      </Button>
    </span>
  );
}

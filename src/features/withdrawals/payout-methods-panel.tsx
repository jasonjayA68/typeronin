"use client";

import { PlusIcon, QrCodeIcon, StarIcon, Trash2Icon } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  deletePayoutMethod,
  savePayoutMethod,
  setDefaultPayoutMethod,
  type PayoutMethodResult,
} from "@/features/withdrawals/payout-methods-actions";
import {
  QR_MIME_TYPES,
  methodTakesQr,
} from "@/features/withdrawals/payout-methods";
import {
  PAYOUT_METHODS,
  PAYOUT_METHOD_INFO,
  type PayoutMethodValue,
} from "@/features/withdrawals/model";
import type { SavedPayoutMethod } from "@/features/withdrawals/payout-methods-queries";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

function toastResult(result: PayoutMethodResult, ok: string) {
  if (result.ok) toast.success(result.message ?? ok);
  else toast.error(result.message);
}

/** Resize a QR image to a square PNG (lossless, so the code stays scannable). */
async function toQrPng(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const size = Math.min(1024, Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas context");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  const scale = Math.min(size / bitmap.width, size / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encode failed"))), "image/png")
  );
}

type FormState = {
  id: string | null;
  method: PayoutMethodValue;
  accountName: string;
  accountRef: string;
  details: string;
  makeDefault: boolean;
};

const BLANK: FormState = {
  id: null,
  method: "GCASH",
  accountName: "",
  accountRef: "",
  details: "",
  makeDefault: false,
};

export function PayoutMethodsPanel({ methods }: { methods: SavedPayoutMethod[] }) {
  const [pending, start] = useTransition();
  const [form, setForm] = useState<FormState | null>(null);
  const qrBlob = useRef<Blob | null>(null);
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  const qrInput = useRef<HTMLInputElement>(null);

  const info = form ? PAYOUT_METHOD_INFO[form.method] : null;

  const openNew = () => {
    qrBlob.current = null;
    setQrPreview(null);
    setForm({ ...BLANK });
  };
  const openEdit = (m: SavedPayoutMethod) => {
    qrBlob.current = null;
    setQrPreview(m.qrUrl);
    setForm({
      id: m.id,
      method: m.method as PayoutMethodValue,
      accountName: m.accountName,
      accountRef: m.accountRef,
      details: m.details ?? "",
      makeDefault: m.isDefault,
    });
  };
  const close = () => {
    setForm(null);
    qrBlob.current = null;
    setQrPreview(null);
  };

  const onPickQr = async (file: File) => {
    if (!(QR_MIME_TYPES as readonly string[]).includes(file.type)) {
      toast.error("Use a JPEG, PNG, or WebP image.");
      return;
    }
    try {
      const blob = await toQrPng(file);
      qrBlob.current = blob;
      setQrPreview(URL.createObjectURL(blob));
    } catch {
      toast.error("That image could not be read.");
    }
  };

  const save = () => {
    if (!form) return;
    const data = new FormData();
    if (form.id) data.set("id", form.id);
    data.set("method", form.method);
    data.set("accountName", form.accountName);
    data.set("accountRef", form.accountRef);
    data.set("details", form.details);
    data.set("makeDefault", String(form.makeDefault));
    if (qrBlob.current) data.set("qr", qrBlob.current, "qr.png");
    start(async () => {
      const result = await savePayoutMethod(data);
      toastResult(result, "Saved.");
      if (result.ok) close();
    });
  };

  return (
    <div>
      {/* Saved methods */}
      {methods.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {methods.map((m) => (
            <li
              key={m.id}
              className={cn(
                "flex gap-3 rounded-xl border p-3",
                m.isDefault ? "border-sakura/50 bg-sakura/5" : "border-border/60"
              )}
            >
              {m.qrUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- user-supplied host; next/image would need each allow-listed.
                <img
                  src={m.qrUrl}
                  alt={`${PAYOUT_METHOD_INFO[m.method as PayoutMethodValue].label} QR`}
                  className="size-16 shrink-0 rounded-lg border border-border object-cover"
                />
              ) : (
                <span className="grid size-16 shrink-0 place-items-center rounded-lg border border-dashed border-border text-muted-foreground">
                  <QrCodeIcon className="size-6" aria-hidden="true" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-medium">
                  {PAYOUT_METHOD_INFO[m.method as PayoutMethodValue].label}
                  {m.isDefault ? (
                    <span className="rounded-full bg-sakura/15 px-1.5 py-0.5 text-[0.6rem] font-semibold tracking-wide text-sakura uppercase">
                      Default
                    </span>
                  ) : null}
                </p>
                <p className="truncate text-xs text-muted-foreground">{m.accountName}</p>
                <p className="truncate text-xs text-muted-foreground">{m.accountRef}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {!m.isDefault ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      disabled={pending}
                      onClick={() =>
                        start(async () =>
                          toastResult(await setDefaultPayoutMethod(m.id), "Default updated.")
                        )
                      }
                    >
                      <StarIcon aria-hidden="true" />
                      Make default
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={pending}
                    onClick={() => openEdit(m)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                    disabled={pending}
                    onClick={() =>
                      start(async () =>
                        toastResult(await deletePayoutMethod(m.id), "Removed.")
                      )
                    }
                  >
                    <Trash2Icon aria-hidden="true" />
                    Remove
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-border px-6 py-6 text-center text-sm text-muted-foreground">
          No saved payout methods yet. Add one to withdraw faster next time.
        </p>
      )}

      {/* Add / edit form */}
      {form ? (
        <div className="mt-4 space-y-4 rounded-xl border border-border/60 bg-background/40 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pm-method">Method</Label>
              <select
                id="pm-method"
                value={form.method}
                disabled={pending}
                onChange={(e) => setForm({ ...form, method: e.target.value as PayoutMethodValue })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
              >
                {PAYOUT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {PAYOUT_METHOD_INFO[method].label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pm-name">Account holder name</Label>
              <Input
                id="pm-name"
                value={form.accountName}
                disabled={pending}
                maxLength={120}
                onChange={(e) => setForm({ ...form, accountName: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pm-ref">{info?.refLabel}</Label>
            <Input
              id="pm-ref"
              value={form.accountRef}
              disabled={pending}
              maxLength={160}
              placeholder={info?.refPlaceholder}
              onChange={(e) => setForm({ ...form, accountRef: e.target.value })}
            />
          </div>

          {form.method === "BANK" ? (
            <div className="space-y-2">
              <Label htmlFor="pm-details">Bank name / extra details</Label>
              <Input
                id="pm-details"
                value={form.details}
                disabled={pending}
                maxLength={200}
                onChange={(e) => setForm({ ...form, details: e.target.value })}
              />
            </div>
          ) : null}

          {methodTakesQr(form.method) ? (
            <div className="space-y-2">
              <Label>Payout QR code (optional)</Label>
              <div className="flex items-center gap-3">
                {qrPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local/user-supplied.
                  <img
                    src={qrPreview}
                    alt=""
                    className="size-16 rounded-lg border border-border object-cover"
                  />
                ) : (
                  <span className="grid size-16 place-items-center rounded-lg border border-dashed border-border text-muted-foreground">
                    <QrCodeIcon className="size-6" aria-hidden="true" />
                  </span>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => qrInput.current?.click()}
                >
                  {qrPreview ? "Change QR" : "Upload QR"}
                </Button>
                <input
                  ref={qrInput}
                  type="file"
                  accept={QR_MIME_TYPES.join(",")}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void onPickQr(file);
                    e.target.value = "";
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Scan-ready image of your {info?.label} QR. JPEG, PNG, or WebP.
              </p>
            </div>
          ) : null}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.makeDefault}
              disabled={pending}
              onChange={(e) => setForm({ ...form, makeDefault: e.target.checked })}
              className="size-4 rounded border-border"
            />
            Use this as my default payout method
          </label>

          <div className="flex gap-2">
            <Button onClick={save} disabled={pending} variant="dojo" size="sm">
              {pending ? "Saving…" : form.id ? "Update method" : "Save method"}
            </Button>
            <Button onClick={close} disabled={pending} variant="ghost" size="sm">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button onClick={openNew} variant="outline" size="sm" className="mt-4">
          <PlusIcon aria-hidden="true" />
          Add payout method
        </Button>
      )}
    </div>
  );
}

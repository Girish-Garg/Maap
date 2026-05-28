"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePrices, useUpdatePrices, DEFAULT_PRICES } from "@/lib/db/prices";
import type { Prices } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BackIcon } from "@/components/icons";

/** Fields in display order, with the bucket key they write to. */
const FIELDS: { key: keyof Prices; label: string }[] = [
  { key: "frame_3_4", label: 'Frame 3" & 4"' },
  { key: "patia_1_5_to_4", label: "Patia 1.5' to 4'" },
  { key: "patia_4_5_to_5", label: "Patia 4.5' to 5'" },
  { key: "patia_5_5_to_up", label: "Patia 5.5' and up" },
  { key: "pawa", label: "Pawa" },
];

/** Edit per-project prices (design.md §7.5). One field per bucket, in ₹/CFT. */
export function PricingForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { data } = usePrices(projectId);
  const updatePrices = useUpdatePrices(projectId);
  const [values, setValues] = useState<Prices>(DEFAULT_PRICES);

  // Seed the form once prices load.
  useEffect(() => {
    if (data) setValues(data);
  }, [data]);

  function setField(key: keyof Prices, raw: string) {
    setValues((v) => ({ ...v, [key]: raw === "" ? 0 : Number(raw) }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await updatePrices.mutateAsync(values);
    router.push(`/projects/${projectId}`);
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center gap-2">
        <Link
          href={`/projects/${projectId}`}
          aria-label="Back to project"
          className="-ml-2 rounded p-2 text-text-2 hover:bg-surface-2"
        >
          <BackIcon width={20} height={20} />
        </Link>
        <h1 className="text-lg tracking-tight">Prices</h1>
      </header>

      <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
        {FIELDS.map(({ key, label }) => (
          <Input
            key={key}
            label={`${label} (₹ / CFT)`}
            type="number"
            inputMode="numeric"
            numeric
            min={0}
            value={String(values[key])}
            onChange={(e) => setField(key, e.target.value)}
          />
        ))}
        <div className="flex gap-3">
          <Button type="submit" disabled={updatePrices.isPending}>
            {updatePrices.isPending ? "Saving…" : "Save prices"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(`/projects/${projectId}`)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

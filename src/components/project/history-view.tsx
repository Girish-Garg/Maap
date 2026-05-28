"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePatiaEntries, usePawaEntries } from "@/lib/db/entries";
import { usePrices, DEFAULT_PRICES } from "@/lib/db/prices";
import { calculateSummary } from "@/lib/calc";
import {
  useSnapshots,
  useSaveSnapshot,
  useRestoreSnapshot,
  buildSnapshotData,
  type Snapshot,
  type SnapshotData,
} from "@/lib/db/snapshots";
import { formatINR, formatDateTime } from "@/lib/format";
import { BackIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function HistoryView({ projectId }: { projectId: string }) {
  const patia = usePatiaEntries(projectId);
  const pawa = usePawaEntries(projectId);
  const prices = usePrices(projectId);
  const snapshots = useSnapshots(projectId);
  const save = useSaveSnapshot(projectId);
  const restore = useRestoreSnapshot(projectId);

  const [confirming, setConfirming] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");

  const summary = useMemo(
    () =>
      calculateSummary(
        patia.data ?? [],
        pawa.data ?? [],
        prices.data ?? DEFAULT_PRICES,
      ),
    [patia.data, pawa.data, prices.data],
  );

  /** Current project state as a snapshot payload. */
  function currentData(): SnapshotData {
    return buildSnapshotData(
      patia.data ?? [],
      pawa.data ?? [],
      prices.data ?? DEFAULT_PRICES,
      summary.grandTotal,
    );
  }

  async function handleSave() {
    setError("");
    try {
      await save.mutateAsync({ label: null, data: currentData() });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save snapshot.");
    }
  }

  async function handleRestore(snapshot: Snapshot) {
    setError("");
    try {
      // Snapshot the current state first so a restore is itself undoable.
      await save.mutateAsync({ label: "Before restore", data: currentData() });
      await restore.mutateAsync(snapshot.id);
      setConfirming(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't restore snapshot.");
    }
  }

  const list = snapshots.data ?? [];
  const busy = save.isPending || restore.isPending;

  return (
    <div className="flex max-w-lg flex-col gap-5">
      <header className="flex items-center gap-2">
        <Link
          href={`/projects/${projectId}`}
          aria-label="Back to project"
          className="-ml-2 rounded p-2 text-text-2 hover:bg-surface-2"
        >
          <BackIcon width={20} height={20} />
        </Link>
        <h1 className="flex-1 text-lg tracking-tight">History</h1>
        <Button variant="secondary" onClick={handleSave} disabled={busy}>
          {save.isPending ? "Saving…" : "Save snapshot"}
        </Button>
      </header>

      {error && <p className="text-sm text-error">{error}</p>}

      {list.length === 0 ? (
        <p className="py-8 text-center text-text-2">No snapshots yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((snap) => {
            const data = snap.data as unknown as SnapshotData;
            return (
              <li key={snap.id}>
                <Card>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-sm text-text">
                        {formatDateTime(snap.created_at)}
                      </span>
                      <span className="text-xs text-text-3">
                        {snap.label ?? "Manual snapshot"}
                      </span>
                      <span className="mt-1 font-mono text-sm text-text-2">
                        {formatINR(data?.grandTotal ?? 0)}
                      </span>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => setConfirming(snap)}
                      disabled={busy}
                    >
                      Restore
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {confirming && (
        <div className="fixed inset-0 z-30 flex items-end justify-center md:items-center">
          <button
            aria-label="Cancel"
            onClick={() => setConfirming(null)}
            className="absolute inset-0 bg-[rgba(28,25,23,0.5)]"
          />
          <div
            role="dialog"
            aria-label="Confirm restore"
            className="relative w-full max-w-sm rounded-t-lg bg-surface p-5 shadow-xl md:rounded-lg"
          >
            <h2 className="font-medium text-text">Restore snapshot?</h2>
            <p className="mt-2 text-sm text-text-2">
              This replaces the current data with the snapshot from{" "}
              <span className="font-mono">
                {formatDateTime(confirming.created_at)}
              </span>
              . Your current data is saved first, so you can undo this.
            </p>
            <div className="mt-5 flex gap-2">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setConfirming(null)}
              >
                Keep current
              </Button>
              <Button
                fullWidth
                disabled={busy}
                onClick={() => handleRestore(confirming)}
              >
                {restore.isPending ? "Restoring…" : "Restore"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

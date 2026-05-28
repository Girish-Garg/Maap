"use client";

import { createElement, useState } from "react";
import { useProfile } from "@/lib/db/profile";
import { useSaveSnapshot, buildSnapshotData } from "@/lib/db/snapshots";
import type { Prices } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { clsx } from "@/lib/clsx";
import type { ProjectSummary } from "@/lib/types";
import type { PatiaEntry, PawaEntry } from "@/lib/db/entries";
import type { Project } from "@/lib/db/projects";

interface Props {
  project: Project;
  summary: ProjectSummary;
  patiaEntries: PatiaEntry[];
  pawaEntries: PawaEntry[];
  /** Dimension axes for the reference grids (widths/thicknesses, lengths/sizes). */
  dimensions: {
    patia_widths_in: number[];
    patia_thicknesses_in: number[];
    pawa_lengths_in: number[];
    pawa_sizes: number[];
  };
}

/** Sanitises a project name into a safe-ish file name stem. */
function fileStem(name: string): string {
  return (name.trim() || "maap").replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
}

/** A YYYYMMDD-HHMMSS stamp so repeat downloads save under distinct names. */
function timestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/**
 * "Export" button + chooser. The user picks any combination of the quotation
 * bill and the Patia / Pawa reference grids; everything selected goes into one
 * PDF (bill first, then references). The bill needs a non-zero total; each
 * reference needs entries.
 *
 * The heavy @react-pdf renderer and document module are imported only on
 * download, keeping them out of the initial bundle.
 */
export function ExportDialog({
  project,
  summary,
  patiaEntries,
  pawaEntries,
  dimensions,
}: Props) {
  const { data: profile } = useProfile();
  const saveSnapshot = useSaveSnapshot(project.id);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // A bill/reference doc must carry the seller's identity, so exporting needs a
  // business name (set in Settings).
  const hasBusinessName = !!profile?.business_name?.trim();
  const canBill = summary.grandTotal > 0;
  const hasPatia = patiaEntries.some((e) => e.quantity > 0);
  const hasPawa = pawaEntries.some((e) => e.quantity > 0);

  const [bill, setBill] = useState(true);
  const [patia, setPatia] = useState(false);
  const [pawa, setPawa] = useState(false);

  const selected =
    (bill && canBill) || (patia && hasPatia) || (pawa && hasPawa);

  async function download() {
    setBusy(true);
    setError("");
    try {
      // Auto-snapshot the project before producing the bill (architecture
      // §Save snapshot). Best-effort: a snapshot failure must not block export.
      try {
        const prices: Prices = {
          frame_3_4: summary.frame_3_4.rate,
          patia_1_5_to_4: summary.patia_1_5_to_4.rate,
          patia_4_5_to_5: summary.patia_4_5_to_5.rate,
          patia_5_5_to_up: summary.patia_5_5_to_up.rate,
          pawa: summary.pawa.rate,
        };
        await saveSnapshot.mutateAsync({
          label: "Before PDF download",
          data: buildSnapshotData(patiaEntries, pawaEntries, prices, summary.grandTotal),
        });
      } catch {
        // Ignore - exporting is more important than the snapshot.
      }

      const [{ pdf }, { MaapDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/lib/pdf/maap-document"),
      ]);
      // MaapDocument renders a <Document>; cast to pdf()'s element type.
      const element = createElement(MaapDocument, {
        data: {
          profile: profile ?? null,
          project,
          summary,
          patiaEntries,
          pawaEntries,
          dimensions,
          options: {
            bill: bill && canBill,
            patia: patia && hasPatia,
            pawa: pawa && hasPawa,
          },
        },
      }) as Parameters<typeof pdf>[0];
      const blob = await pdf(element).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileStem(project.name)}-${timestamp()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't generate the PDF.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        disabled={!hasBusinessName}
        title={
          hasBusinessName
            ? undefined
            : "Add your business name in Settings to export"
        }
        onClick={() => setOpen(true)}
      >
        Export
      </Button>

      {open && (
        <div className="fixed inset-0 z-30 flex items-end justify-center md:items-center">
          <button
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[rgba(28,25,23,0.5)]"
          />
          <div
            role="dialog"
            aria-label="Export PDF"
            className="relative w-full max-w-sm rounded-t-lg bg-surface p-5 shadow-xl md:rounded-lg"
          >
            <h2 className="font-medium text-text">Export PDF</h2>
            <p className="mt-1 text-sm text-text-2">
              Choose what to include. References list every piece for the buyer to
              verify counts.
            </p>

            <div className="mt-4 flex flex-col">
              <ExportOption
                label="Quotation (bill)"
                description={canBill ? "Summary with prices and total" : "Add quantities first"}
                checked={bill && canBill}
                disabled={!canBill}
                onChange={setBill}
              />
              <ExportOption
                label="Patia details"
                description={hasPatia ? "Itemised reference of every plank" : "No Patia entries"}
                checked={patia && hasPatia}
                disabled={!hasPatia}
                onChange={setPatia}
              />
              <ExportOption
                label="Pawa details"
                description={hasPawa ? "Itemised reference of every post" : "No Pawa entries"}
                checked={pawa && hasPawa}
                disabled={!hasPawa}
                onChange={setPawa}
              />
            </div>

            {error && <p className="mt-3 text-sm text-error">{error}</p>}

            <div className="mt-5 flex gap-2">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button fullWidth disabled={!selected || busy} onClick={download}>
                {busy ? "Generating…" : "Download"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ExportOption({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={clsx(
        "flex items-start gap-3 rounded-md px-2 py-2.5",
        disabled ? "opacity-50" : "cursor-pointer hover:bg-surface-2",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-accent"
      />
      <span className="flex flex-col">
        <span className="text-sm text-text">{label}</span>
        <span className="text-xs text-text-3">{description}</span>
      </span>
    </label>
  );
}

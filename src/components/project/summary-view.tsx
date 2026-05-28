"use client";

import Link from "next/link";
import type { ProjectSummary, BucketResult } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { formatINR, formatCFT } from "@/lib/format";

/** Display labels for each bucket, in the order the Summary lists them. */
const ROWS: { key: keyof ProjectSummary; label: string }[] = [
  { key: "frame_3_4", label: 'Frame 3" & 4"' },
  { key: "patia_1_5_to_4", label: "Patia 1.5' to 4'" },
  { key: "patia_4_5_to_5", label: "Patia 4.5' to 5'" },
  { key: "patia_5_5_to_up", label: "Patia 5.5' and up" },
  { key: "pawa", label: "Pawa" },
];

function LineItem({ label, bucket }: { label: string; bucket: BucketResult }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-text-2">{label}</p>
          <p className="mt-0.5 font-mono text-sm text-text-3">
            {formatCFT(bucket.cft)} CFT × {formatINR(bucket.rate)}
          </p>
        </div>
        <p className="font-mono text-base text-text">{formatINR(bucket.total)}</p>
      </div>
    </Card>
  );
}

/**
 * Summary tab (design.md §7.4). Line items, then the total card - the only
 * element on the page that carries the amber accent (isolation + accent).
 */
export function SummaryView({
  summary,
  projectId,
}: {
  summary: ProjectSummary;
  projectId: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      {ROWS.filter((r) => summary[r.key as keyof ProjectSummary]).map((r) => {
        const bucket = summary[r.key] as BucketResult;
        // Skip empty buckets to keep the summary focused on what's measured.
        if (bucket.cft === 0) return null;
        return <LineItem key={r.key} label={r.label} bucket={bucket} />;
      })}

      <div className="mt-3 rounded-md border-2 border-accent bg-accent-soft p-6 text-center">
        <p className="text-sm text-accent-text">Total</p>
        <p className="mt-2 font-mono text-2xl text-accent-text">
          {formatINR(summary.grandTotal)}
        </p>
        <p className="mt-1 font-mono text-xs text-accent-text/80">
          {formatCFT(summary.totalCFT)} CFT
        </p>
      </div>

      <Link
        href={`/projects/${projectId}/pricing`}
        className="self-center text-sm text-text-2 underline-offset-4 hover:underline"
      >
        Edit prices
      </Link>
    </div>
  );
}

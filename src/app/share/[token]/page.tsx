import { createClient } from "@/lib/supabase/server";
import { calculateSummary } from "@/lib/calc";
import type { Prices, ProjectSummary, BucketResult } from "@/lib/types";
import { formatINR, formatCFT, formatDate } from "@/lib/format";
import { Wordmark } from "@/components/wordmark";

interface SharedData {
  project: {
    name: string;
    client_name: string | null;
    client_address: string | null;
    project_date: string;
  };
  business: {
    business_name: string;
    business_address: string | null;
    business_phone: string | null;
    logo_url: string | null;
  } | null;
  prices: Prices | null;
  patia: {
    length_ft: number;
    width_in: number;
    thickness_in: number;
    quantity: number;
  }[];
  pawa: { length_in: number; size_side: number; quantity: number }[];
}

const ROWS: { key: keyof ProjectSummary; label: string }[] = [
  { key: "frame_3_4", label: 'Frame 3" & 4"' },
  { key: "patia_1_5_to_4", label: "Patia 1.5' to 4'" },
  { key: "patia_4_5_to_5", label: "Patia 4.5' to 5'" },
  { key: "patia_5_5_to_up", label: "Patia 5.5' and up" },
  { key: "pawa", label: "Pawa" },
];

const DEFAULT_PRICES: Prices = {
  frame_3_4: 320,
  patia_1_5_to_4: 420,
  patia_4_5_to_5: 520,
  patia_5_5_to_up: 620,
  pawa: 510,
};

async function fetchShared(token: string): Promise<SharedData | null> {
  // UUID guard so a malformed token doesn't error the RPC.
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_shared_project", {
    share_token: token,
  });
  if (error || !data) return null;
  return data as unknown as SharedData;
}

function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <Wordmark className="text-2xl" />
      <p className="text-text-2">This link isn&apos;t available.</p>
      <p className="text-sm text-text-3">
        The bill may have been unshared or the link is incorrect.
      </p>
    </main>
  );
}

export default async function SharedBillPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const shared = await fetchShared(token);
  if (!shared) return <NotFound />;

  const summary = calculateSummary(
    shared.patia,
    shared.pawa,
    shared.prices ?? DEFAULT_PRICES,
  );
  const business = shared.business;

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-6 px-5 py-8">
      {/* Business header */}
      <header className="flex items-start justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-lg font-bold text-text">
            {business?.business_name?.trim() || "Quotation"}
          </h1>
          {business?.business_address?.trim() && (
            <p className="mt-1 text-sm text-text-2">{business.business_address}</p>
          )}
          {business?.business_phone?.trim() && (
            <p className="text-sm text-text-2">Phone: {business.business_phone}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-text-3">Date</p>
          <p className="font-mono text-sm text-text">
            {formatDate(shared.project.project_date)}
          </p>
        </div>
      </header>

      {/* Client */}
      <div>
        <p className="text-xs uppercase tracking-wide text-text-3">Bill to</p>
        <p className="text-text">
          {shared.project.client_name?.trim() || shared.project.name}
        </p>
        {shared.project.client_address?.trim() && (
          <p className="text-sm text-text-2">{shared.project.client_address}</p>
        )}
      </div>

      {/* Line items */}
      <div className="flex flex-col gap-2">
        {ROWS.map((r) => {
          const bucket = summary[r.key] as BucketResult;
          if (bucket.cft === 0) return null;
          return (
            <div
              key={r.key}
              className="flex items-start justify-between gap-4 border-b border-border py-2"
            >
              <div>
                <p className="text-text">{r.label}</p>
                <p className="font-mono text-xs text-text-3">
                  {formatCFT(bucket.cft)} CFT × {formatINR(bucket.rate)}
                </p>
              </div>
              <p className="font-mono text-text">{formatINR(bucket.total)}</p>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="rounded-md border-2 border-accent bg-accent-soft p-5 text-center">
        <p className="text-sm text-accent-text">Total</p>
        <p className="mt-1 font-mono text-2xl text-accent-text">
          {formatINR(summary.grandTotal)}
        </p>
        <p className="mt-1 font-mono text-xs text-accent-text/80">
          {formatCFT(summary.totalCFT)} CFT
        </p>
      </div>

      <footer className="mt-auto flex items-center justify-center gap-1.5 pt-6 text-xs text-text-3">
        <span>Shared via</span>
        <Wordmark className="text-sm" />
      </footer>
    </main>
  );
}

"use client";

import { useState } from "react";
import {
  useDimensions,
  useUpdateDimensions,
  countProjectsUsingDimension,
  DEFAULT_DIMENSIONS,
  type DimensionKey,
} from "@/lib/db/dimensions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const LISTS: { key: DimensionKey; label: string; unit: string }[] = [
  { key: "patia_lengths_ft", label: "Patia lengths", unit: "ft" },
  { key: "patia_widths_in", label: "Patia widths", unit: "in" },
  { key: "patia_thicknesses_in", label: "Patia thicknesses", unit: "in" },
  { key: "pawa_lengths_in", label: "Pawa lengths", unit: "in" },
  { key: "pawa_sizes", label: "Pawa sizes", unit: "in" },
];

interface Pending {
  key: DimensionKey;
  value: number;
  count: number;
}

export function DimensionsEditor() {
  const { data: dims, isLoading } = useDimensions();
  const update = useUpdateDimensions();
  const [pending, setPending] = useState<Pending | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [error, setError] = useState("");

  if (isLoading || !dims) return <Card>Loading…</Card>;

  const resetToDefaults = () => {
    update.mutate({ ...DEFAULT_DIMENSIONS });
    setResetOpen(false);
  };

  const add = (key: DimensionKey, value: number) => {
    if (dims[key].includes(value)) return;
    const next = [...dims[key], value].sort((a, b) => a - b);
    update.mutate({ [key]: next });
  };

  const applyRemove = (key: DimensionKey, value: number) => {
    update.mutate({ [key]: dims[key].filter((v) => v !== value) });
    setPending(null);
  };

  const requestRemove = async (key: DimensionKey, value: number) => {
    setError("");
    try {
      const count = await countProjectsUsingDimension(key, value);
      if (count > 0) setPending({ key, value, count });
      else applyRemove(key, value);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't check usage.");
    }
  };

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="font-medium text-text">Dimensions</h2>
        <p className="text-sm text-text-2">
          The values available in every project&apos;s grids. Changes apply to
          new and existing projects.
        </p>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      {LISTS.map(({ key, label, unit }) => (
        <ChipList
          key={key}
          label={label}
          unit={unit}
          values={dims[key]}
          onAdd={(v) => add(key, v)}
          onRemove={(v) => requestRemove(key, v)}
        />
      ))}

      {pending && (
        <div className="fixed inset-0 z-30 flex items-end justify-center md:items-center">
          <button
            aria-label="Cancel"
            onClick={() => setPending(null)}
            className="absolute inset-0 bg-[rgba(28,25,23,0.5)]"
          />
          <div
            role="dialog"
            aria-label="Confirm remove dimension"
            className="relative w-full max-w-sm rounded-t-lg bg-surface p-5 shadow-xl md:rounded-lg"
          >
            <h2 className="font-medium text-text">Remove this value?</h2>
            <p className="mt-2 text-sm text-text-2">
              <span className="font-mono">{pending.value}</span> is used in{" "}
              {pending.count} {pending.count === 1 ? "project" : "projects"}.
              Removing it hides it from new grids; existing entries keep their
              value.
            </p>
            <div className="mt-5 flex gap-2">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setPending(null)}
              >
                Keep
              </Button>
              <Button
                fullWidth
                onClick={() => applyRemove(pending.key, pending.value)}
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <p className="text-xs text-text-3">
          Restore the original values.
        </p>
        <Button variant="secondary" onClick={() => setResetOpen(true)}>
          Reset to defaults
        </Button>
      </div>

      {resetOpen && (
        <div className="fixed inset-0 z-30 flex items-end justify-center md:items-center">
          <button
            aria-label="Cancel"
            onClick={() => setResetOpen(false)}
            className="absolute inset-0 bg-[rgba(28,25,23,0.5)]"
          />
          <div
            role="dialog"
            aria-label="Confirm reset dimensions"
            className="relative w-full max-w-sm rounded-t-lg bg-surface p-5 shadow-xl md:rounded-lg"
          >
            <h2 className="font-medium text-text">Reset all dimensions?</h2>
            <p className="mt-2 text-sm text-text-2">
              This replaces every list with the default values. Your custom
              additions and removals across all five lists are discarded.
              Existing project entries keep their values.
            </p>
            <div className="mt-5 flex gap-2">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setResetOpen(false)}
              >
                Cancel
              </Button>
              <Button fullWidth onClick={resetToDefaults}>
                Reset
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function ChipList({
  label,
  unit,
  values,
  onAdd,
  onRemove,
}: {
  label: string;
  unit: string;
  values: number[];
  onAdd: (value: number) => void;
  onRemove: (value: number) => void;
}) {
  const [draft, setDraft] = useState("");

  const submit = () => {
    const v = Number(draft);
    if (draft.trim() !== "" && Number.isFinite(v) && v > 0) {
      onAdd(v);
      setDraft("");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-text-2">
        {label} <span className="text-text-3">({unit})</span>
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {values.map((v) => (
          <span
            key={v}
            className="flex h-8 items-center gap-1.5 rounded-full border border-border bg-surface pl-3 pr-1.5 font-mono text-sm text-text"
          >
            {v}
            <button
              type="button"
              aria-label={`Remove ${v} ${unit}`}
              onClick={() => onRemove(v)}
              className="flex h-5 w-5 items-center justify-center rounded-full text-text-3 hover:bg-surface-2 hover:text-text"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="number"
          inputMode="decimal"
          step="0.5"
          min="0"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="add"
          className="h-8 w-16 rounded-full border border-dashed border-border-strong bg-surface px-3 text-center font-mono text-sm text-text placeholder:text-text-3 focus:border-accent focus:outline-none"
        />
        <button
          type="button"
          aria-label={`Add ${label}`}
          onClick={submit}
          disabled={draft.trim() === ""}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-lg leading-none text-white transition-colors hover:bg-accent-hover disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  );
}

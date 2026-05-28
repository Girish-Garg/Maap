"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useProject } from "@/lib/db/projects";
import { usePatiaEntries, usePawaEntries } from "@/lib/db/entries";
import { usePrices, DEFAULT_PRICES } from "@/lib/db/prices";
import { useDimensions, DEFAULT_DIMENSIONS } from "@/lib/db/dimensions";
import { calculateSummary } from "@/lib/calc";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { BackIcon } from "@/components/icons";
import { SummaryView } from "./summary-view";
import { PatiaGrid } from "./patia-grid";
import { PawaGrid } from "./pawa-grid";
import { ExportDialog } from "./export-dialog";
import { ProjectMenu } from "./project-menu";

type Tab = "patia" | "pawa" | "summary";
const TABS: readonly TabItem<Tab>[] = [
  { value: "patia", label: "Patia" },
  { value: "pawa", label: "Pawa" },
  { value: "summary", label: "Summary" },
];

export function ProjectDetail({ projectId }: { projectId: string }) {
  const [tab, setTab] = useState<Tab>("patia");

  const project = useProject(projectId);
  const patia = usePatiaEntries(projectId);
  const pawa = usePawaEntries(projectId);
  const prices = usePrices(projectId);
  const dimensions = useDimensions();

  const dims = dimensions.data ?? DEFAULT_DIMENSIONS;

  // Live summary - recomputed from the verified calc engine whenever the
  // underlying query data changes. Fallbacks live inside the memo so the deps
  // stay reference-stable between renders.
  const summary = useMemo(
    () =>
      calculateSummary(
        patia.data ?? [],
        pawa.data ?? [],
        prices.data ?? DEFAULT_PRICES,
      ),
    [patia.data, pawa.data, prices.data],
  );

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center gap-2">
        <Link
          href="/projects"
          aria-label="Back to projects"
          className="-ml-2 rounded p-2 text-text-2 hover:bg-surface-2"
        >
          <BackIcon width={20} height={20} />
        </Link>
        <h1 className="flex-1 truncate text-lg tracking-tight">
          {project.data?.name ?? "…"}
        </h1>
        <Link
          href={`/projects/${projectId}/history`}
          className="rounded px-3 py-2 text-sm text-text-2 hover:bg-surface-2"
        >
          History
        </Link>
        {project.data && (
          <>
            <ExportDialog
              project={project.data}
              summary={summary}
              patiaEntries={patia.data ?? []}
              pawaEntries={pawa.data ?? []}
              dimensions={dims}
            />
            <ProjectMenu project={project.data} />
          </>
        )}
      </header>

      <Tabs items={TABS} value={tab} onChange={setTab} />

      {tab === "patia" && (
        <PatiaGrid
          projectId={projectId}
          dimensions={dims}
          entries={patia.data ?? []}
        />
      )}
      {tab === "pawa" && (
        <PawaGrid
          projectId={projectId}
          dimensions={dims}
          entries={pawa.data ?? []}
        />
      )}
      {tab === "summary" && (
        <SummaryView summary={summary} projectId={projectId} />
      )}
    </div>
  );
}

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

  // A project can disappear underneath an open tab: deleted from another
  // device, or an id left in the offline cache that no longer exists. Say so
  // instead of holding the header on its loading placeholder forever.
  if (project.isError) return <MissingProject />;

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

/** Shown when the project behind this URL no longer exists. */
function MissingProject() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <h1 className="text-lg tracking-tight">This project no longer exists.</h1>
      <p className="max-w-sm text-sm text-text-2">
        It may have been deleted, or the link is out of date.
      </p>
      <Link
        href="/projects"
        className="mt-1 rounded bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
      >
        Back to projects
      </Link>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useProjects } from "@/lib/db/projects";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

/** Project list (design.md §7.2). The app's home. */
export default function ProjectsPage() {
  const { data: projects, isLoading, isError } = useProjects();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-xl tracking-tight">Projects</h1>
          {projects && projects.length > 0 && (
            <p className="text-sm text-text-2">{projects.length} active</p>
          )}
        </div>
        <Link href="/projects/new" className="hidden md:block">
          <Button>New project</Button>
        </Link>
      </header>

      {isLoading && <p className="text-sm text-text-3">Loading…</p>}

      {isError && (
        <p className="text-sm text-error">Couldn&apos;t load projects.</p>
      )}

      {projects && projects.length === 0 && (
        // Empty state (design.md §6.8): sentence + one primary, nothing else.
        <div className="flex flex-col items-center gap-6 py-16 text-center">
          <p className="text-text-2">No projects yet.</p>
          <Link href="/projects/new">
            <Button>New project</Button>
          </Link>
        </div>
      )}

      {projects && projects.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <li key={project.id}>
              <Link href={`/projects/${project.id}`} className="block h-full">
                <Card className="h-full transition-colors hover:bg-surface-2">
                  <p className="text-base text-text">{project.name}</p>
                  {project.client_name && (
                    <p className="text-sm text-text-2">{project.client_name}</p>
                  )}
                  <p className="mt-1 font-mono text-sm text-text-3">
                    {formatDate(project.project_date)}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

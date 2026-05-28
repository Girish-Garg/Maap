"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useProject, useUpdateProject } from "@/lib/db/projects";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

/** Edit an existing project's metadata. */
export function EditProjectForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { data: project, isLoading } = useProject(projectId);
  const update = useUpdateProject(projectId);

  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    if (project) {
      setName(project.name ?? "");
      setClientName(project.client_name ?? "");
      setClientAddress(project.client_address ?? "");
      setDate(project.project_date ?? "");
    }
  }, [project]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await update.mutateAsync({
      name: name.trim(),
      client_name: clientName.trim() || null,
      client_address: clientAddress.trim() || null,
      project_date: date,
    });
    router.push(`/projects/${projectId}`);
  }

  if (isLoading) return <p className="text-text-2">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl tracking-tight">Edit project</h1>
      <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
        <Input
          label="Project name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label="Client name"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
        />
        <Textarea
          label="Client address"
          value={clientAddress}
          onChange={(e) => setClientAddress(e.target.value)}
        />
        <Input
          label="Date"
          type="date"
          numeric
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        {update.isError && (
          <p className="text-sm text-error">Couldn&apos;t save. Try again.</p>
        )}
        <div className="flex gap-3">
          <Button type="submit" disabled={!name.trim() || update.isPending}>
            {update.isPending ? "Saving…" : "Save"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

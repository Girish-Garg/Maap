"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useCreateProject } from "@/lib/db/projects";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

/** New project form. Name is required; client and date are optional. */
export default function NewProjectPage() {
  const router = useRouter();
  const createProject = useCreateProject();
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const project = await createProject.mutateAsync({
      name: name.trim(),
      client_name: clientName.trim() || null,
      client_address: clientAddress.trim() || null,
      project_date: date,
    });
    router.push(`/projects/${project.id}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl tracking-tight">New project</h1>
      <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
        <Input
          label="Project name"
          required
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Sharma House"
        />
        <Input
          label="Client name"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          placeholder="Sharma & Sons"
        />
        <Textarea
          label="Client address"
          value={clientAddress}
          onChange={(e) => setClientAddress(e.target.value)}
          placeholder="Optional, shown on the bill"
        />
        <Input
          label="Date"
          type="date"
          numeric
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        {createProject.isError && (
          <p className="text-sm text-error">
            Couldn&apos;t create the project. Try again.
          </p>
        )}
        <div className="flex gap-3">
          <Button type="submit" disabled={!name.trim() || createProject.isPending}>
            {createProject.isPending ? "Creating…" : "Create project"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

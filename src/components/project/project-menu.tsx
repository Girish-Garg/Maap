"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useDeleteProject,
  useSetProjectShare,
  type Project,
} from "@/lib/db/projects";
import { Button } from "@/components/ui/button";
import { clsx } from "@/lib/clsx";

/** Overflow menu for a project: edit, share (read-only link), delete. */
export function ProjectMenu({ project }: { project: Project }) {
  const router = useRouter();
  const del = useDeleteProject();
  const share = useSetProjectShare(project.id);

  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [token, setToken] = useState<string | null>(project.public_share_id);
  const [copied, setCopied] = useState(false);

  const shareUrl =
    token && typeof window !== "undefined"
      ? `${window.location.origin}/share/${token}`
      : "";

  async function toggleShare(enable: boolean) {
    const result = await share.mutateAsync(enable);
    setToken(result);
    setCopied(false);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      /* clipboard blocked; user can select the text manually */
    }
  }

  async function confirmDelete() {
    await del.mutateAsync(project.id);
    router.push("/projects");
  }

  return (
    <>
      <div className="relative">
        <button
          type="button"
          aria-label="More actions"
          onClick={() => setMenuOpen((o) => !o)}
          className="flex h-9 w-9 items-center justify-center rounded text-text-2 hover:bg-surface-2"
        >
          <span className="text-xl leading-none">⋯</span>
        </button>
        {menuOpen && (
          <>
            <button
              aria-hidden
              tabIndex={-1}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-10 cursor-default"
            />
            <div className="absolute right-0 top-11 z-20 w-40 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-xl">
              <Link
                href={`/projects/${project.id}/edit`}
                className="block px-4 py-2 text-sm text-text hover:bg-surface-2"
                onClick={() => setMenuOpen(false)}
              >
                Edit
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setShareOpen(true);
                }}
                className="block w-full px-4 py-2 text-left text-sm text-text hover:bg-surface-2"
              >
                Share
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setDeleteOpen(true);
                }}
                className="block w-full px-4 py-2 text-left text-sm text-error hover:bg-surface-2"
              >
                Delete
              </button>
            </div>
          </>
        )}
      </div>

      {shareOpen && (
        <Modal label="Share project" onClose={() => setShareOpen(false)}>
          <h2 className="font-medium text-text">Read-only link</h2>
          <p className="mt-1 text-sm text-text-2">
            Anyone with the link can view this bill. They can&apos;t edit it; only
            you can change the data.
          </p>

          {token ? (
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2">
                <span className="flex-1 truncate font-mono text-xs text-text-2">
                  {shareUrl}
                </span>
                <button
                  type="button"
                  onClick={copyLink}
                  className="shrink-0 text-sm font-medium text-accent hover:text-accent-hover"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <Button
                variant="ghost"
                onClick={() => toggleShare(false)}
                disabled={share.isPending}
              >
                Stop sharing
              </Button>
            </div>
          ) : (
            <div className="mt-4">
              <Button onClick={() => toggleShare(true)} disabled={share.isPending}>
                {share.isPending ? "Creating…" : "Create link"}
              </Button>
            </div>
          )}
        </Modal>
      )}

      {deleteOpen && (
        <Modal label="Confirm delete" onClose={() => setDeleteOpen(false)}>
          <h2 className="font-medium text-text">Delete this project?</h2>
          <p className="mt-2 text-sm text-text-2">
            <span className="font-medium text-text">{project.name}</span> and all
            its entries, prices, and history will be permanently deleted. This
            can&apos;t be undone.
          </p>
          <div className="mt-5 flex gap-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              fullWidth
              disabled={del.isPending}
              onClick={confirmDelete}
              className="bg-error hover:bg-error"
            >
              {del.isPending ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

function Modal({
  label,
  onClose,
  children,
}: {
  label: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center md:items-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className={clsx("absolute inset-0 bg-[rgba(28,25,23,0.5)]")}
      />
      <div
        role="dialog"
        aria-label={label}
        className="relative w-full max-w-sm rounded-t-lg bg-surface p-5 shadow-xl md:rounded-lg"
      >
        {children}
      </div>
    </div>
  );
}

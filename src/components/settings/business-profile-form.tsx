"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import {
  useProfile,
  useUpdateProfile,
  useUploadLogo,
  useRemoveLogo,
} from "@/lib/db/profile";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

/**
 * Business profile editor (Settings). Feeds the PDF bill header: name, address,
 * phone, and an optional logo. The logo is genuinely optional - the bill renders
 * cleanly without one.
 */
export function BusinessProfileForm() {
  const { data: profile, isLoading } = useProfile();
  const update = useUpdateProfile();
  const uploadLogo = useUploadLogo();
  const removeLogo = useRemoveLogo();
  const fileInput = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [saved, setSaved] = useState(false);
  const [logoError, setLogoError] = useState("");

  // Seed the form once the profile loads.
  useEffect(() => {
    if (profile) {
      setName(profile.business_name ?? "");
      setAddress(profile.business_address ?? "");
      setPhone(profile.business_phone ?? "");
    }
  }, [profile]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaved(false);
    await update.mutateAsync({
      business_name: name.trim(),
      business_address: address.trim() || null,
      business_phone: phone.trim() || null,
    });
    setSaved(true);
  }

  async function handleLogoFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setLogoError("");
    try {
      await uploadLogo.mutateAsync(file);
      toast.success("Logo uploaded.");
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : "Upload failed.");
    }
  }

  async function handleLogoRemove() {
    setLogoError("");
    try {
      await removeLogo.mutateAsync();
      toast.success("Logo removed.");
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : "Couldn't remove logo.");
    }
  }

  if (isLoading) {
    return <Card>Loading…</Card>;
  }

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="font-medium text-text">Business profile</h2>
        <p className="text-sm text-text-2">
          Shown on the bills you export. The logo is optional.
        </p>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <Input
          label="Business name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          placeholder="e.g. Sharma Timber"
        />
        <Textarea
          label="Address"
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            setSaved(false);
          }}
          placeholder="Street, city, state"
        />
        <Input
          label="Phone"
          type="tel"
          inputMode="tel"
          numeric
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            setSaved(false);
          }}
          placeholder="e.g. 98765 43210"
        />

        <div className="flex items-center gap-3">
          <Button type="submit" loading={update.isPending}>
            {update.isPending ? "Saving…" : "Save"}
          </Button>
          {saved && <span className="text-sm text-success">Saved.</span>}
        </div>
      </form>

      {/* Logo */}
      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <span className="text-sm text-text-2">Logo</span>
        <div className="flex items-center gap-4">
          {profile?.logo_url ? (
            <Image
              src={profile.logo_url}
              alt="Business logo"
              width={64}
              height={64}
              unoptimized
              className="h-16 w-16 rounded border border-border object-contain"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded border border-dashed border-border-strong text-xs text-text-3">
              None
            </div>
          )}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => fileInput.current?.click()}
                loading={uploadLogo.isPending}
                disabled={removeLogo.isPending}
              >
                {uploadLogo.isPending
                  ? "Uploading…"
                  : profile?.logo_url
                    ? "Replace"
                    : "Upload"}
              </Button>
              {profile?.logo_url && (
                <Button
                  variant="ghost"
                  onClick={handleLogoRemove}
                  loading={removeLogo.isPending}
                  disabled={uploadLogo.isPending}
                >
                  {removeLogo.isPending ? "Removing…" : "Remove"}
                </Button>
              )}
            </div>
            <span className="text-xs text-text-3">PNG, JPG, or WebP. Max 1 MB.</span>
          </div>
        </div>
        {logoError && <p className="text-xs text-error">{logoError}</p>}
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleLogoFile}
          className="hidden"
        />
      </div>
    </Card>
  );
}

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { signOut } from "@/app/auth/actions";
import { BusinessProfileForm } from "@/components/settings/business-profile-form";
import { DimensionsEditor } from "@/components/settings/dimensions-editor";
import { ThemeToggle } from "@/components/settings/theme-toggle";

/** Settings: appearance, business profile (for bills), dimensions, account. */
export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <h1 className="text-xl tracking-tight">Settings</h1>

      {/* Two columns on large screens; stacks in a sensible order on mobile. */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex flex-1 flex-col gap-6">
          <ThemeToggle />
          <BusinessProfileForm />
        </div>
        <div className="flex flex-1 flex-col gap-6">
          <DimensionsEditor />
          <Card className="flex flex-col gap-3">
            <h2 className="font-medium text-text">Account</h2>
            <p className="text-sm text-text-2">
              Signed in as <span className="font-mono">{user?.email}</span>
            </p>
            <form action={signOut}>
              <Button variant="secondary" type="submit">
                Sign out
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

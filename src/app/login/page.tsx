import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Wordmark } from "@/components/wordmark";
import { LoginForm } from "./login-form";

/**
 * Auth screen (design.md §7.1): isolation. Nothing on screen but the wordmark,
 * a one-line tagline, and the email field. Already-authenticated users skip
 * straight to the project list.
 */
export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-1">
          <Wordmark className="text-3xl" />
          <p className="text-sm text-text-2">Precise wood measurement.</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}

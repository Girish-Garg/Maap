"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Mode = "signin" | "signup";

/**
 * Email + password auth. We use passwords (not magic links) because the family
 * signs in often and the free-tier email cap throttles link delivery. Signup
 * creates an immediate session as long as "Confirm email" is off in Supabase
 * (see README); no email is sent either way.
 */
export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const supabase = createClient();

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(
          error.message === "Invalid login credentials"
            ? "Wrong email or password."
            : error.message,
        );
        setBusy(false);
        return;
      }
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }
      // With email confirmation on, no session is returned until the user
      // confirms. We surface that honestly instead of silently failing.
      if (!data.session) {
        setNotice("Account created. Check your email to confirm, then sign in.");
        setMode("signin");
        setBusy(false);
        return;
      }
    }

    // Session cookie is set; refresh so Server Components see it, then go home.
    router.push("/projects");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <Input
        label="Email address"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        label="Password"
        type="password"
        autoComplete={mode === "signin" ? "current-password" : "new-password"}
        required
        minLength={6}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        hint={mode === "signup" ? "At least 6 characters." : undefined}
        error={error || undefined}
      />
      {notice && <p className="text-sm text-text-2">{notice}</p>}
      <Button type="submit" fullWidth disabled={busy}>
        {busy
          ? mode === "signin"
            ? "Signing in…"
            : "Creating account…"
          : mode === "signin"
            ? "Sign in"
            : "Create account"}
      </Button>
      <button
        type="button"
        onClick={() => {
          setMode((m) => (m === "signin" ? "signup" : "signin"));
          setError("");
          setNotice("");
        }}
        className="text-sm text-text-2 underline-offset-4 hover:underline"
      >
        {mode === "signin"
          ? "New here? Create an account"
          : "Have an account? Sign in"}
      </button>
    </form>
  );
}

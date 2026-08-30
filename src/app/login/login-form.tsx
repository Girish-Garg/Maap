"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithGoogle,
  signInWithPassword,
  signUpWithPassword,
} from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Mode = "signin" | "signup";

/**
 * Authentication: Continue with Google (OAuth) on top, with email + password
 * underneath. Google is the headline path; password works as a fallback and
 * for users without a Google account.
 *
 * Both paths go through Server Actions - credentials never reach any client-side
 * SDK, and the session cookie is set by Auth.js on the server.
 */
export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleGoogle() {
    setBusy(true);
    setError("");
    try {
      await signInWithGoogle();
      // On success the browser is navigating to Google; nothing more to do.
    } catch {
      setBusy(false);
      setError("Could not start Google sign-in. Try again.");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const formData = new FormData();
    formData.set("email", email);
    formData.set("password", password);

    const result =
      mode === "signin"
        ? await signInWithPassword(formData)
        : await signUpWithPassword(formData);

    if (result?.error) {
      setError(result.error);
      setBusy(false);
      return;
    }

    router.push("/projects");
    router.refresh();
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {error && <p className="text-sm text-error">{error}</p>}

      {googleEnabled && (
        <>
          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            className="flex h-12 w-full items-center justify-center gap-3 rounded border border-border-strong bg-surface text-sm font-medium text-text transition-colors hover:bg-surface-2 disabled:opacity-50 md:h-10 md:text-base"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="flex items-center gap-3 text-xs text-text-3">
            <hr className="flex-1 border-border" />
            <span>or</span>
            <hr className="flex-1 border-border" />
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
        />
        <Button type="submit" fullWidth loading={busy}>
          {busy
            ? mode === "signin"
              ? "Signing in…"
              : "Creating account…"
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode((m) => (m === "signin" ? "signup" : "signin"));
          setError("");
        }}
        className="text-sm text-text-2 underline-offset-4 hover:underline"
      >
        {mode === "signin"
          ? "New here? Create an account"
          : "Have an account? Sign in"}
      </button>
    </div>
  );
}

/** The Google "G" mark in its four brand colors (24x24). */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11A6.6 6.6 0 0 1 5.48 12c0-.73.13-1.44.36-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.95l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.29 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

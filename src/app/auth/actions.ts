"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { signIn, signOut as authSignOut } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Sign-in, sign-up, and sign-out.
 *
 * Auth.js verifies credentials but never creates accounts, so registration is
 * ours: hash the password, write the user, then sign the new account straight
 * in so nobody has to type it twice.
 */

/** What the login form renders; `null` means it worked and the page redirects. */
export type AuthResult = { error: string } | null;

const MIN_PASSWORD_LENGTH = 6;
/** bcrypt work factor. 12 is the usual balance of cost against brute force. */
const BCRYPT_ROUNDS = 12;

function normalizeEmail(value: FormDataEntryValue | null): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function validate(email: string, password: string): string | null {
  if (!email || !email.includes("@")) return "Enter a valid email address.";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

export async function signInWithPassword(
  formData: FormData,
): Promise<AuthResult> {
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  try {
    // The form does its own navigating, so Auth.js must not redirect here -
    // a thrown redirect would be indistinguishable from a failure below.
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) return { error: "Wrong email or password." };
    throw error;
  }
  return null;
}

export async function signUpWithPassword(
  formData: FormData,
): Promise<AuthResult> {
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");

  const invalid = validate(email, password);
  if (invalid) return { error: invalid };

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    return { error: "An account with this email already exists. Sign in instead." };
  }

  await prisma.user.create({
    data: { email, password_hash: await bcrypt.hash(password, BCRYPT_ROUNDS) },
  });

  return signInWithPassword(formData);
}

/** Starts the Google flow; Auth.js redirects to Google and back. */
export async function signInWithGoogle(): Promise<void> {
  await signIn("google", { redirectTo: "/projects" });
}

/** Ends the session and returns to the login screen. */
export async function signOut(): Promise<void> {
  await authSignOut({ redirectTo: "/login" });
}

"use client";

import { useState } from "react";
import { withdrawName } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/client";

type LoginFormProps = {
  nextPath: string;
  email: string | null;
  errorCode: string | null;
};

export function LoginForm({ nextPath, email, errorCode }: LoginFormProps) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    errorCode ? "error" : "idle",
  );
  const [message, setMessage] = useState(
    errorCode === "link"
      ? "That letter could not be honored."
      : "",
  );

  if (email) {
    return (
      <div className="space-y-6">
        <p className="text-sm leading-relaxed text-ink-muted">
          You are in the book as{" "}
          <span className="text-cream">{email}</span>.
        </p>
        <form action={withdrawName}>
          <button
            type="submit"
            className="text-sm tracking-[0.14em] text-ink-muted hover:text-gold focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold"
          >
            Withdraw.
          </button>
        </form>
      </div>
    );
  }

  async function onSubmit(formData: FormData) {
    const address = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    if (!address || !address.includes("@")) {
      setStatus("error");
      setMessage("A proper name, if you please.");
      return;
    }

    setStatus("sending");
    setMessage("");
    const supabase = createClient();
    const origin = window.location.origin;
    const redirectTo = new URL("/auth/callback", origin);
    redirectTo.searchParams.set("next", nextPath);

    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: {
        emailRedirectTo: redirectTo.toString(),
        shouldCreateUser: true,
      },
    });

    if (error) {
      setStatus("error");
      setMessage("The house could not send a letter.");
      return;
    }

    setStatus("sent");
    setMessage("A letter is on its way.");
  }

  return (
    <form action={onSubmit} className="space-y-6">
      <label className="block">
        <span className="text-xs tracking-[0.16em] text-ink-muted">
          Correspondence
        </span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="mt-2 w-full border border-gold/80 bg-background px-3 py-2 text-cream outline-none focus:border-gold"
        />
      </label>
      <button
        type="submit"
        disabled={status === "sending"}
        className="border border-gold/80 px-4 py-2 text-sm tracking-[0.14em] text-cream hover:border-gold hover:text-gold disabled:opacity-60 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold"
      >
        {status === "sending" ? "Sending…" : "Leave a name"}
      </button>
      {message ? (
        <p
          className={
            status === "error"
              ? "text-sm text-oxblood"
              : "text-sm text-ink-muted"
          }
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}

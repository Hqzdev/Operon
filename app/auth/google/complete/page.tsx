"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

function GoogleAuthComplete() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(searchParams.get("error"));

  useEffect(() => {
    const token = searchParams.get("token");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setError(errorParam);
      return;
    }

    if (!token) {
      setError("Google sign-in did not return a session token.");
      return;
    }

    const sessionToken = token;

    async function finishSignIn() {
      try {
        const response = await fetch("/api/users/me", {
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
        const user = await response.json();

        if (!response.ok) {
          throw new Error(user.message ?? "Unable to finish Google sign-in.");
        }

        localStorage.setItem("operon_token", sessionToken);
        localStorage.setItem("operon_user", JSON.stringify(user));
        router.replace(user.onboardingCompleted ? "/dashboard" : "/onboarding");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Google sign-in failed.");
      }
    }

    void finishSignIn();
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="w-full max-w-sm text-center">
        <Link href="/" className="font-display text-2xl tracking-tight">
          Operon
        </Link>
        <h1 className="mt-8 font-display text-3xl tracking-tight">
          {error ? "Google sign-in failed" : "Signing you in..."}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {error ?? "Finishing secure workspace access."}
        </p>
        {error ? (
          <Button asChild className="mt-6 w-full rounded-xl">
            <Link href="/login">Back to login</Link>
          </Button>
        ) : null}
      </div>
    </main>
  );
}

export default function GoogleAuthCompletePage() {
  return (
    <Suspense fallback={null}>
      <GoogleAuthComplete />
    </Suspense>
  );
}

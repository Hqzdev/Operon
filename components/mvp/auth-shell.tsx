"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, Sparkles } from "lucide-react";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthShellProps = {
  mode: "login" | "register";
  title: string;
  description: string;
  submitLabel: string;
  secondaryLabel: string;
  secondaryHref: string;
  fields: Array<{
    id: string;
    label: string;
    type?: string;
    placeholder: string;
  }>;
  leftCards?: Array<{ value: string; label: string }>;
};

const GOOGLE_ICON = (
  <svg className="size-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export function AuthShell({
  mode,
  title,
  description,
  submitLabel,
  secondaryLabel,
  secondaryHref,
  fields,
  leftCards,
}: AuthShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const isRegister = mode === "register";

  async function startCheckout(token: string) {
    const plan = searchParams.get("plan");
    const currency = searchParams.get("currency") ?? localStorage.getItem("operon_pricing_currency") ?? "USD";

    if (!plan || plan === "STARTER" || searchParams.get("checkout") !== "1") {
      return false;
    }

    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/payments/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ plan, currency }),
    });

    const payment = await response.json();
    if (!response.ok) {
      setError(payment.message ?? "Unable to start checkout");
      return true;
    }

    if (payment.confirmationUrl) {
      window.location.href = payment.confirmationUrl;
      return true;
    }

    router.push("/dashboard");
    return true;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    const apiBaseUrl = getApiBaseUrl();

    try {
      const response = await fetch(`${apiBaseUrl}/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.message ?? "Authentication failed");
        return;
      }

      localStorage.setItem("operon_token", data.token);
      localStorage.setItem("operon_user", JSON.stringify(data.user));
      const isCheckingOut = await startCheckout(data.token);
      if (isCheckingOut) return;

      if (mode === "register") {
        router.push("/onboarding");
      } else {
        const user = data.user as { onboardingCompleted?: boolean };
        router.push(user.onboardingCompleted ? "/dashboard" : "/onboarding");
      }
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const defaultCards = isRegister
    ? [
        { value: "Know what to scale", label: "before you overspend" },
        { value: "Catch losing ads fast", label: "before they drain budget" },
        { value: "Act with confidence", label: "not gut feeling" },
      ]
    : [
        { value: "CTR", label: "creative signal" },
        { value: "ROAS", label: "commercial signal" },
        { value: "Action", label: "final output" },
      ];

  const cards = leftCards ?? defaultCards;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(20,20,20,0.08),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(20,20,20,0.06),transparent_30%)]" />

      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 lg:px-10">
        {/* Header — logo only, no exit link */}
        <div className="mb-10 flex justify-center">
          <Link href="/" className="font-display text-2xl tracking-tight">
            Operon
          </Link>
        </div>

        <div className="grid flex-1 items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left panel — hidden on mobile */}
          <div className="hidden lg:block space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-foreground/10 px-4 py-2 font-mono text-xs text-muted-foreground">
              <Sparkles className="size-3.5" />
              {isRegister
                ? "Trusted by dropshippers on Meta and TikTok"
                : "AI decision layer for Shopify and DTC sellers"}
            </div>
            <div className="max-w-xl">
              <h1 className="font-display text-5xl leading-none tracking-tight lg:text-6xl">{title}</h1>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{description}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {cards.map((item) => (
                <div
                  key={item.value}
                  className="rounded-2xl border border-foreground/10 bg-card/60 p-5 backdrop-blur-sm"
                >
                  <div className="font-mono text-xs text-muted-foreground">{item.label}</div>
                  <div className="mt-3 font-display text-xl leading-snug">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel — auth card */}
          <Card className="border-foreground/10 bg-card/80 py-0 shadow-xl backdrop-blur">
            <CardHeader className="border-b border-foreground/10 px-6 py-6">
              <CardTitle className="font-display text-2xl tracking-tight">
                {isRegister ? "Create your free account" : "Welcome back"}
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                {isRegister
                  ? "Takes 30 seconds. No credit card required."
                  : "Sign in to see your live recommendations and verdict history."}
              </CardDescription>
            </CardHeader>

            <CardContent className="px-6 py-6">
              {/* Google OAuth — primary on register */}
              <Button
                asChild
                variant={isRegister ? "default" : "outline"}
                className="mb-5 h-11 w-full rounded-xl"
              >
                <Link href="/api/auth/google">
                  {GOOGLE_ICON}
                  {isRegister ? "Sign up with Google" : "Continue with Google"}
                </Link>
              </Button>

              <div className="mb-5 flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                or email
                <div className="h-px flex-1 bg-border" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {fields.map((field) => {
                  const isPassword = field.type === "password";

                  return (
                    <div key={field.id} className="space-y-1.5">
                      <Label htmlFor={field.id} className="text-[13px]">{field.label}</Label>
                      <div className="relative">
                        <Input
                          id={field.id}
                          name={field.id}
                          type={isPassword && showPassword ? "text" : field.type ?? "text"}
                          placeholder={field.placeholder}
                          required
                          autoComplete={
                            isPassword
                              ? isRegister ? "new-password" : "current-password"
                              : field.id === "email" ? "email" : field.id === "name" ? "name" : undefined
                          }
                          onBlur={isPassword ? () => setPasswordTouched(true) : undefined}
                          className={isPassword ? "h-11 rounded-xl pr-12 text-sm" : "h-11 rounded-xl text-sm"}
                        />
                        {isPassword ? (
                          <button
                            type="button"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                          >
                            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        ) : null}
                      </div>
                      {/* Show password requirements only after user has left the field */}
                      {isPassword && isRegister && passwordTouched ? (
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          At least 8 characters — uppercase, lowercase, number, and symbol.
                        </p>
                      ) : null}
                    </div>
                  );
                })}

                <Button type="submit" className="h-11 w-full rounded-xl" disabled={isSubmitting}>
                  {isSubmitting ? "Please wait..." : submitLabel}
                </Button>
              </form>

              {error ? (
                <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-400">
                  {error}
                </p>
              ) : null}

              {isRegister && (
                <p className="mt-4 text-center text-[11px] text-muted-foreground">
                  No credit card required · Cancel anytime
                </p>
              )}

              <div className="mt-5 text-center text-sm text-muted-foreground">
                {secondaryLabel}{" "}
                <Link href={secondaryHref} className="font-medium text-foreground underline underline-offset-4">
                  {secondaryHref === "/login" ? "Log in" : "Create account"}
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

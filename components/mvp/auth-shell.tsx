"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Sparkles } from "lucide-react";
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
};

export function AuthShell({
  mode,
  title,
  description,
  submitLabel,
  secondaryLabel,
  secondaryHref,
  fields,
}: AuthShellProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.message ?? "Authentication failed");
        return;
      }

      localStorage.setItem("operon_token", data.token);
      localStorage.setItem("operon_user", JSON.stringify(data.user));
      router.push("/dashboard");
    } catch {
      setError("Unable to reach the backend. Start the API server and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(20,20,20,0.08),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(20,20,20,0.06),transparent_30%)]" />
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 lg:px-10">
        <div className="mb-10 flex items-center justify-between">
          <Button asChild variant="ghost" className="rounded-full">
            <Link href="/">
              <ArrowLeft className="size-4" />
              Back to landing
            </Link>
          </Button>
          <Link href="/" className="font-display text-2xl tracking-tight">
            Operon
          </Link>
        </div>

        <div className="grid flex-1 items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-foreground/10 px-4 py-2 font-mono text-xs text-muted-foreground">
              <Sparkles className="size-3.5" />
              AI decision layer for Shopify and DTC sellers
            </div>
            <div className="max-w-xl">
              <h1 className="font-display text-5xl leading-none tracking-tight lg:text-6xl">
                {title}
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { value: "CTR", label: "creative signal" },
                { value: "ROAS", label: "commercial signal" },
                { value: "Action", label: "final output" },
              ].map((item) => (
                <div
                  key={item.value}
                  className="rounded-2xl border border-foreground/10 bg-card/60 p-5 backdrop-blur-sm"
                >
                  <div className="font-mono text-xs text-muted-foreground">
                    {item.label}
                  </div>
                  <div className="mt-3 font-display text-3xl">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <Card className="border-foreground/10 bg-card/80 py-0 shadow-xl backdrop-blur">
            <CardHeader className="border-b border-foreground/10 py-8">
              <div className="mb-4 flex size-12 items-center justify-center rounded-2xl border border-foreground/10">
                <LockKeyhole className="size-5" />
              </div>
              <CardTitle className="text-3xl font-display tracking-tight">
                Secure workspace access
              </CardTitle>
              <CardDescription className="text-base leading-relaxed">
                {title === "Create your workspace"
                  ? "Set up the first store, invite the team later, and start with manual metric entry."
                  : "Sign in to review live recommendations, product verdicts, and stored decision history."}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 py-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                {fields.map((field) => {
                  const isPassword = field.type === "password";

                  return (
                    <div key={field.id} className="space-y-2">
                      <Label htmlFor={field.id}>{field.label}</Label>
                      <div className="relative">
                        <Input
                          id={field.id}
                          name={field.id}
                          type={isPassword && showPassword ? "text" : field.type ?? "text"}
                          placeholder={field.placeholder}
                          required
                          className={isPassword ? "h-11 rounded-xl pr-12" : "h-11 rounded-xl"}
                        />
                        {isPassword ? (
                          <button
                            type="button"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            onClick={() => setShowPassword((visible) => !visible)}
                            className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                          >
                            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        ) : null}
                      </div>
                      {isPassword ? (
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.
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
                <p className="mt-4 text-sm text-red-600">{error}</p>
              ) : null}

              <div className="mt-6 text-center text-sm text-muted-foreground">
                {secondaryLabel}{" "}
                <Link
                  href={secondaryHref}
                  className="text-foreground underline underline-offset-4"
                >
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

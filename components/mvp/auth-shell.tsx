import Link from "next/link";
import { ArrowLeft, LockKeyhole, Sparkles } from "lucide-react";
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
  title,
  description,
  submitLabel,
  secondaryLabel,
  secondaryHref,
  fields,
}: AuthShellProps) {
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
              <form action="/dashboard" className="space-y-5">
                {fields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <Label htmlFor={field.id}>{field.label}</Label>
                    <Input
                      id={field.id}
                      name={field.id}
                      type={field.type ?? "text"}
                      placeholder={field.placeholder}
                      required
                      className="h-11 rounded-xl"
                    />
                  </div>
                ))}
                <Button type="submit" className="h-11 w-full rounded-xl">
                  {submitLabel}
                </Button>
              </form>

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

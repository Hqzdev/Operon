import type { Metadata } from "next";
import { AuthShell } from "@/components/mvp/auth-shell";

export const metadata: Metadata = {
  title: "Create your free account | Operon",
  description: "Sign up for Operon and get clear Scale, Fix, or Kill verdicts on your Meta and TikTok campaigns. Free to start.",
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <AuthShell
      mode="register"
      title="Stop guessing what to do with your ads"
      description="Operon reads your campaign numbers and tells you exactly whether to scale, stop, or fix — in seconds."
      submitLabel="Create free account"
      secondaryLabel="Already have an account?"
      secondaryHref="/login"
      fields={[
        {
          id: "name",
          label: "Full name",
          placeholder: "Yaroslav Fairfield",
        },
        {
          id: "email",
          label: "Email",
          type: "email",
          placeholder: "founder@store.com",
        },
        {
          id: "password",
          label: "Password",
          type: "password",
          placeholder: "Min. 8 characters",
        },
      ]}
      leftCards={[
        { value: "Know what to scale", label: "before you overspend" },
        { value: "Catch losing ads fast", label: "before they drain budget" },
        { value: "Act with confidence", label: "not gut feeling" },
      ]}
    />
  );
}

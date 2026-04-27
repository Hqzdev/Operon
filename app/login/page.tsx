import { AuthShell } from "@/components/mvp/auth-shell";

export default function LoginPage() {
  return (
    <AuthShell
      mode="login"
      title="Log in to Operon"
      description="Access the seller workspace where metrics become decisions. Review product verdicts, ad actions, and team execution in one place."
      submitLabel="Enter dashboard"
      secondaryLabel="No account yet?"
      secondaryHref="/register"
      fields={[
        {
          id: "email",
          label: "Work email",
          type: "email",
          placeholder: "founder@store.com",
        },
        {
          id: "password",
          label: "Password",
          type: "password",
          placeholder: "At least 8 characters",
        },
      ]}
    />
  );
}

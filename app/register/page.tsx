import { AuthShell } from "@/components/mvp/auth-shell";

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your workspace"
      description="Launch the MVP setup for your store, define the first operator account, and start saving metrics and decisions into PostgreSQL."
      submitLabel="Create account"
      secondaryLabel="Already have access?"
      secondaryHref="/login"
      fields={[
        {
          id: "name",
          label: "Full name",
          placeholder: "Yaroslav Fairfield",
        },
        {
          id: "email",
          label: "Work email",
          type: "email",
          placeholder: "founder@store.com",
        },
        {
          id: "store",
          label: "Store name",
          placeholder: "Operon Labs",
        },
        {
          id: "password",
          label: "Password",
          type: "password",
          placeholder: "Create a secure password",
        },
      ]}
    />
  );
}

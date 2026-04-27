import { AuthShell } from "@/components/mvp/auth-shell";

export default function RegisterPage() {
  return (
    <AuthShell
      mode="register"
      title="Create your workspace"
      description="Create your account, set up your seller workspace, and start using Operon with a real backend and saved account data."
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
          id: "storeName",
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

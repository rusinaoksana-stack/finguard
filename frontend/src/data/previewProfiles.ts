import type { PreviewProfile } from "../hooks/useAuth";

export const previewProfiles: Array<PreviewProfile & { label: string }> = [
  { label: "Customer workspace", name: "Emma Murphy", role: "user", email: "customer@finguard.ai" },
  { label: "Audit workspace", name: "FinGuard Auditor", role: "admin", email: "auditor@finguard.ai" },
];

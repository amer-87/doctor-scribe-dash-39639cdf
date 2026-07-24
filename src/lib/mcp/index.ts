import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listPatients from "./tools/list-patients";
import getPatient from "./tools/get-patient";
import listPrescriptions from "./tools/list-prescriptions";
import createPrescription from "./tools/create-prescription";

// The OAuth issuer MUST be the direct Supabase host — the publish-time proxy
// URL is rejected by mcp-js (RFC 8414 issuer mismatch). Read the project ref
// from the Vite-inlined literal so it survives publish.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "my-clinic-mcp",
  title: "My Clinic MCP",
  version: "0.1.0",
  instructions:
    "Tools for the Clinic management app. Each caller authenticates as a doctor (or their secretary/admin) via OAuth; all reads and writes are scoped to that user via row-level security.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listPatients, getPatient, listPrescriptions, createPrescription],
});

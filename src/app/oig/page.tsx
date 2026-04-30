import { redirect } from "next/navigation"

// OIG landing — for now redirects to Chief of Staff. Phase 5 turns this into
// the actual dashboard (brief panel + chat + run-triage button).
export default function OIGHome() {
  redirect("/oig/cos")
}

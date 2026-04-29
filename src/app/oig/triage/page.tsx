import { redirect } from "next/navigation"

// Triage is no longer a separate destination. It's a capability surfaced
// inside the Chief of Staff page. This redirect keeps any old links alive.
export default function TriagePage() {
  redirect("/oig/cos")
}

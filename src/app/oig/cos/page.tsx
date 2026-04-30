import PageHeader from "@/components/page-header"
import { getUser } from "@/lib/auth"
import { userHasAgentAccess } from "@/lib/agent-auth"
import { redirect } from "next/navigation"
import CosWorkspace from "./_components/cos-workspace"

export const dynamic = "force-dynamic"

const AGENT_SLUG = "chief-of-staff"

export default async function ChiefOfStaffPage() {
  const user = await getUser()
  if (!user) redirect("/login")

  const hasAccess = await userHasAgentAccess(user.id, AGENT_SLUG)

  return (
    <div>
      <PageHeader
        title="Chief of Staff"
        description="Calendar + structured memory for the day. Click Prep me on any meeting to brief the agent. Ask anything in chat."
        status={hasAccess ? "in-progress" : "coming-soon"}
      />
      {hasAccess ? (
        <CosWorkspace />
      ) : (
        <div className="px-6 py-10 text-sm text-muted">
          You don&apos;t have access to this agent yet.
        </div>
      )}
    </div>
  )
}

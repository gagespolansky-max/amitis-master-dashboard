import PageHeader from '@/components/page-header'
import AIInitiativesBoard from '@/components/ai-initiatives-board'

export default function AIInitiativesPage() {
  return (
    <div>
      <PageHeader
        title="AI Initiatives"
        description="Tracking and building internal AI tools, automations, and system improvements."
        status="active"
      />
      <AIInitiativesBoard />
    </div>
  )
}

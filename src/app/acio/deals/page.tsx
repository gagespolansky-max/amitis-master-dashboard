import PageHeader from '@/components/page-header'
import ACIOBoard from './_components/ACIOBoard'
import DocumentUploadPanel from '@/components/document-upload-panel'

export default function DealsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Deal Pipeline"
        description="Track and manage investment opportunities. Upload decks, memos, and emails for context."
        status="in-progress"
      />

      <DocumentUploadPanel workstream="Deal" />

      <div className="flex flex-col h-[calc(100vh-2rem)]">
        <div className="flex-1 rounded-xl border border-card-border bg-card-bg overflow-hidden">
          <ACIOBoard />
        </div>
      </div>
    </div>
  )
}

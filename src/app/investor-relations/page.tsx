import PageHeader from '@/components/page-header'
import DocumentUploadPanel from '@/components/document-upload-panel'

export default function InvestorRelationsPage() {
  return (
    <div>
      <PageHeader
        title="Investor Relations"
        description="Manage LP materials, communications, and marketing content. Upload documents and keep everything in one place."
        status="in-progress"
      />

      <DocumentUploadPanel workstream="IR" />
    </div>
  )
}

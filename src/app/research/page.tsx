import PageHeader from '@/components/page-header'
import DocumentUploadPanel from '@/components/document-upload-panel'
import PlaceholderCard from '@/components/placeholder-card'

export default function ResearchPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Research"
        description="Evaluate funds and deals. Upload research materials and organize insights."
        status="coming-soon"
      />

      <DocumentUploadPanel workstream="Research" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PlaceholderCard title="Fund Vetting" description="Sample data — real workflows coming next." />
        <PlaceholderCard title="Deal Evaluation" description="Sample data — real workflows coming next." />
      </div>
    </div>
  )
}

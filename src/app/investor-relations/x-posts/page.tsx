import PageHeader from '@/components/page-header'
import DraftForm from './_components/draft-form'

export default function XPostsPage() {
  return (
    <div>
      <PageHeader
        title="X Posts"
        description="Draft posts in Chris's voice. Paste a source (tweet URL or text) and an angle, get back 2-3 voice-matched variants."
      />
      <DraftForm />
    </div>
  )
}

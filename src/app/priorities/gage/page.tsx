import PageHeader from '@/components/page-header'
import GagePriorities from './_components/gage-priorities'

export default function GagePrioritiesPage() {
  return (
    <div>
      <PageHeader
        title="Gage's Priorities"
        description="Drop screenshots to extract and organize text. Edit, date, and annotate."
        status="active"
      />
      <GagePriorities />
    </div>
  )
}

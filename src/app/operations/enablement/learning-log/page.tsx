import PageHeader from '@/components/page-header'
import LearningLogTab from './_components/learning-log-tab'

export default function LearningLogPage() {
  return (
    <div>
      <PageHeader
        title="Learning Log"
        description="Technical concepts captured during work sessions and dashboard queries."
        status="active"
      />
      <LearningLogTab />
    </div>
  )
}

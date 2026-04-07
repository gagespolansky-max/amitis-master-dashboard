import PageHeader from '@/components/page-header'
import OrgTabs from './_components/org-tabs'

export default function OrganizationPage() {
  return (
    <div>
      <PageHeader
        title="Organization"
        description="Amitis Capital + Samara org structure, roles, responsibilities, and Notion workspace audit."
        status="active"
      />
      <OrgTabs />
    </div>
  )
}

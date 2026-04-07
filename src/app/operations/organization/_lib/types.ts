export interface OrgPerson {
  id: string
  name: string
  title: string | null
  email: string | null
  job_description: string | null
  responsibilities: string | null
  team: 'amitis' | 'samara' | 'external'
  parent_id: string | null
  entity: string | null
  location: string | null
  status: 'active' | 'incoming' | 'external'
  sort_order: number
  pos_x: number | null
  pos_y: number | null
  created_at: string
  updated_at: string
  tech_stack?: TechStackItem[]
  children?: OrgPerson[]
}

export interface OrgGroup {
  id: string
  label: string
  pos_x: number
  pos_y: number
  width: number
  height: number
  color: string
  created_at: string
}

export interface OrgEdge {
  id: string
  source_id: string
  target_id: string
  created_at: string
}

export interface TechStackItem {
  id: string
  person_id: string
  tool_name: string
  category: string | null
}

export interface OrgResponsibility {
  id: string
  area: string
  category: string | null
  created_at: string
}

export interface ResponsibilityAssignment {
  id: string
  person_id: string
  responsibility_id: string
  role: 'owner' | 'contributor' | 'backup'
}

export interface NotionPage {
  id: string
  notion_page_id: string
  page_title: string
  page_type: 'page' | 'database'
  parent_path: string | null
  teamspace: string | null
  created_by: string | null
  last_edited_by: string | null
  last_edited: string | null
  is_active: boolean
  consolidation_status: 'unreviewed' | 'keep' | 'consolidate' | 'archive'
  synced_at: string
}

export interface NotionAccess {
  id: string
  person_id: string
  notion_page_id: string
  access_level: 'viewer' | 'editor' | 'owner'
}

export interface ResponsibilityMatrixRow {
  responsibility: OrgResponsibility
  assignments: Record<string, ResponsibilityAssignment>
}

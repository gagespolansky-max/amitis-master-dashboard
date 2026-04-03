export interface FundReturn {
  id: string
  fund_key: string
  fund_name: string
  share_class: string
  return_month: string
  return_value: number
  return_type: string
  gross_net: string
  as_of_date: string
  source_type: string
  audit_url: string | null
  gmail_link: string | null
  verified: boolean
  verified_at: string | null
  created_at: string
  updated_at: string
}

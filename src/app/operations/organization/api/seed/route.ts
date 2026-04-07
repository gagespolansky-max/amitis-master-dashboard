import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

const PEOPLE = [
  {
    name: "Monica Monajem",
    title: "Founder & Managing Partner",
    email: null,
    job_description: "Founder of the Amitis Group. M&A/restructuring background covering TMT, ran a single family office in London, founded Amitis Group in 2017. Oversees entire group structure, chairs investment committee, manages intercompany accounting (Xero), ultimate decision-maker on all strategic moves including the Samara acquisition.",
    responsibilities: "Group oversight, investment committee chair, intercompany accounting, strategic decisions, Samara acquisition lead",
    team: "amitis" as const,
    entity: "AGH",
    location: null,
    status: "active" as const,
    sort_order: 1,
    parent_key: null,
    tech: [
      { tool_name: "Xero", category: "finance" },
      { tool_name: "Notion", category: "productivity" },
      { tool_name: "Microsoft 365", category: "productivity" },
    ],
  },
  {
    name: "Adam Feldheim",
    title: "Co-Founder & Managing Partner",
    email: null,
    job_description: "Co-Founder. High-yield/distressed debt at JPMorgan & Morgan Stanley, Blue Mountain Capital (metals & mining), co-founded magnesium alloys business. Chairs board meetings, leads ETP initiative, manages LP relationships, deal execution.",
    responsibilities: "Board chair, ETP initiative, LP relationship management, deal execution, Samara transaction lead",
    team: "amitis" as const,
    entity: "Amitis Capital",
    location: "London",
    status: "active" as const,
    sort_order: 2,
    parent_key: "Monica Monajem",
    tech: [
      { tool_name: "Notion", category: "productivity" },
      { tool_name: "Microsoft 365", category: "productivity" },
      { tool_name: "DocSend", category: "productivity" },
    ],
  },
  {
    name: "Chris Solarz",
    title: "CIO",
    email: null,
    job_description: "CIO. 20+ years: CIBC, SocGen, Antarctica AM, ING IM, Cliffwater (MD), Forest Road (CIO Digital Assets). Leads investment strategy, manager due diligence, portfolio monitoring, capital raising. Full CIO authority on ACDAM. BA UPenn, CFA/CPA/CAIA.",
    responsibilities: "Investment strategy, manager due diligence, portfolio monitoring, capital raising, ACDAM authority",
    team: "amitis" as const,
    entity: "Amitis Capital",
    location: "NYC",
    status: "active" as const,
    sort_order: 3,
    parent_key: "Monica Monajem",
    tech: [
      { tool_name: "Notion", category: "productivity" },
      { tool_name: "Microsoft 365", category: "productivity" },
      { tool_name: "Bloomberg", category: "finance" },
    ],
  },
  {
    name: "Gage Spolansky",
    title: "Investment Analyst",
    email: "gspolansky@amitiscapital.com",
    job_description: "Investment Analyst. Financial modeling, contract analysis, working capital, fund performance, admin oversight (NAV, IQEQ, auditors). Leads all tech, data room, AI initiatives — built master dashboard, fund returns pipeline, deal pipeline, internal tooling.",
    responsibilities: "Financial modeling, fund performance analysis, admin oversight, technology/AI lead, data room management, internal tooling",
    team: "amitis" as const,
    entity: "Amitis Capital",
    location: "NYC",
    status: "active" as const,
    sort_order: 4,
    parent_key: "Adam Feldheim",
    tech: [
      { tool_name: "Notion", category: "productivity" },
      { tool_name: "Microsoft 365", category: "productivity" },
      { tool_name: "Claude Code", category: "development" },
      { tool_name: "Attio", category: "crm" },
      { tool_name: "Google Workspace", category: "productivity" },
    ],
  },
  {
    name: "Pandora Stuart-Mills",
    title: "Operations / Fund Admin",
    email: null,
    job_description: "Operations / Fund Administration. Attends board meetings, handles intercompany accounting queries, manages internal admin. Based at The Amitis Group.",
    responsibilities: "Board meeting attendance, intercompany accounting queries, internal admin",
    team: "amitis" as const,
    entity: "AGH",
    location: null,
    status: "active" as const,
    sort_order: 5,
    parent_key: "Adam Feldheim",
    tech: [
      { tool_name: "Notion", category: "productivity" },
      { tool_name: "Xero", category: "finance" },
      { tool_name: "Microsoft 365", category: "productivity" },
    ],
  },
  {
    name: "Aram Ebrahimi",
    title: "Operations Support",
    email: null,
    job_description: "Operations Support. Attends board meetings on behalf of The Amitis Group. Handled initial Claude team account setup.",
    responsibilities: "Board meeting attendance, operations support, Claude team setup",
    team: "amitis" as const,
    entity: "AGH",
    location: null,
    status: "active" as const,
    sort_order: 6,
    parent_key: "Adam Feldheim",
    tech: [
      { tool_name: "Notion", category: "productivity" },
    ],
  },
  {
    name: "Adil Abdulali",
    title: "Co-CIO (Structured Products / Seeding)",
    email: "adil.abdulali@samara-am.com",
    job_description: "Founder and CIO of Samara Alpha Management. Primary decision-maker on Samara side — runs investment strategy and fund seeding business. Post-acquisition: Co-CIO, works alongside Chris on structured products and seeding strategy.",
    responsibilities: "Structured products strategy, fund seeding, Samara investment oversight",
    team: "samara" as const,
    entity: "Samara",
    location: null,
    status: "incoming" as const,
    sort_order: 7,
    parent_key: "Monica Monajem",
    tech: [
      { tool_name: "Notion", category: "productivity" },
      { tool_name: "Microsoft 365", category: "productivity" },
    ],
  },
  {
    name: "JP Gonzalez",
    title: "COO / Investment Operations",
    email: null,
    job_description: "COO-equivalent at Samara. Handles investor onboarding and investment operations. Primary on the ops/investment side.",
    responsibilities: "Investor onboarding, investment operations, operational processes",
    team: "samara" as const,
    entity: "Samara",
    location: null,
    status: "incoming" as const,
    sort_order: 8,
    parent_key: "Adil Abdulali",
    tech: [
      { tool_name: "Notion", category: "productivity" },
      { tool_name: "Microsoft 365", category: "productivity" },
    ],
  },
  {
    name: "Leyu Zou",
    title: "Investment Analyst / Quant",
    email: null,
    job_description: "Investment Analyst / Quant. Computer scientist, handles NAV reconciliation, position-level data, dashboards, risk management infrastructure. Very junior but highly technical.",
    responsibilities: "NAV reconciliation, position-level data, dashboards, risk management infrastructure",
    team: "samara" as const,
    entity: "Samara",
    location: null,
    status: "incoming" as const,
    sort_order: 9,
    parent_key: "Adil Abdulali",
    tech: [
      { tool_name: "Notion", category: "productivity" },
      { tool_name: "Microsoft 365", category: "productivity" },
    ],
  },
  {
    name: "Evita Shneberg",
    title: "Marketing / IR",
    email: null,
    job_description: "Marketing / Investor Relations. Manages HubSpot, website, tear sheets, investor outreach, monthly letters. Increasingly leveraging AI agents.",
    responsibilities: "HubSpot management, website, tear sheets, investor outreach, monthly letters, AI agent workflows",
    team: "samara" as const,
    entity: "Samara",
    location: null,
    status: "incoming" as const,
    sort_order: 10,
    parent_key: "Adil Abdulali",
    tech: [
      { tool_name: "HubSpot", category: "crm" },
      { tool_name: "Notion", category: "productivity" },
      { tool_name: "Canva", category: "design" },
    ],
  },
  {
    name: "Sean Kim",
    title: "Quant / Tech",
    email: null,
    job_description: "Quant / Tech. Works alongside Leyu building dashboards and risk management systems for Boreal's DeFi strategy.",
    responsibilities: "Dashboard development, risk management systems, DeFi strategy support",
    team: "samara" as const,
    entity: "Samara",
    location: null,
    status: "incoming" as const,
    sort_order: 11,
    parent_key: "Adil Abdulali",
    tech: [
      { tool_name: "Notion", category: "productivity" },
    ],
  },
  {
    name: "IQEQ",
    title: "Fund Administrator",
    email: null,
    job_description: "New fund administrator, replacing Oakbridge. Absorbing NAV Consulting's fund accounting work.",
    responsibilities: null,
    team: "external" as const,
    entity: "External",
    location: null,
    status: "external" as const,
    sort_order: 12,
    parent_key: null,
    tech: [],
  },
  {
    name: "Baker Tilly",
    title: "Auditors (Jersey)",
    email: null,
    job_description: "Auditors (Jersey). Key contacts: Sandy Cameron, Gerrit Heyneke.",
    responsibilities: null,
    team: "external" as const,
    entity: "External",
    location: "Jersey",
    status: "external" as const,
    sort_order: 13,
    parent_key: null,
    tech: [],
  },
  {
    name: "Hatstone",
    title: "Jersey / BVI Legal",
    email: null,
    job_description: "Jersey and BVI legal counsel. Carl O'Shea.",
    responsibilities: null,
    team: "external" as const,
    entity: "External",
    location: null,
    status: "external" as const,
    sort_order: 14,
    parent_key: null,
    tech: [],
  },
  {
    name: "Eric Flaye",
    title: "Cayman Legal",
    email: null,
    job_description: "Cayman legal counsel.",
    responsibilities: null,
    team: "external" as const,
    entity: "External",
    location: "Cayman",
    status: "external" as const,
    sort_order: 15,
    parent_key: null,
    tech: [],
  },
  {
    name: "NAV Consulting",
    title: "Fund Accounting",
    email: null,
    job_description: "Fund accounting, currently being transitioned to IQEQ.",
    responsibilities: null,
    team: "external" as const,
    entity: "External",
    location: null,
    status: "external" as const,
    sort_order: 16,
    parent_key: null,
    tech: [],
  },
  {
    name: "Oakbridge",
    title: "Outgoing Fund Admin",
    email: null,
    job_description: "Outgoing fund administrator. Robin Wilson and Alexander Smyth remain as Jersey directors on ACL board.",
    responsibilities: null,
    team: "external" as const,
    entity: "External",
    location: "Jersey",
    status: "external" as const,
    sort_order: 17,
    parent_key: null,
    tech: [],
  },
]

const RESPONSIBILITIES = [
  { area: "Investment Strategy", category: "Investment" },
  { area: "Manager Due Diligence", category: "Investment" },
  { area: "Portfolio Monitoring", category: "Investment" },
  { area: "Capital Raising", category: "Investment" },
  { area: "Structured Products / Seeding", category: "Investment" },
  { area: "Investor Onboarding", category: "Operations" },
  { area: "Fund Administration Oversight", category: "Operations" },
  { area: "NAV Reconciliation", category: "Operations" },
  { area: "Intercompany Accounting", category: "Operations" },
  { area: "Board / Governance", category: "Operations" },
  { area: "Compliance / Legal Coordination", category: "Operations" },
  { area: "Marketing Materials", category: "Marketing" },
  { area: "Investor Outreach", category: "Marketing" },
  { area: "Website / Digital Presence", category: "Marketing" },
  { area: "Monthly Letters / Newsletters", category: "Marketing" },
  { area: "Financial Modeling", category: "Research" },
  { area: "Deal Execution", category: "Research" },
  { area: "Technology / AI Initiatives", category: "Tech" },
  { area: "Dashboard Development", category: "Tech" },
  { area: "Risk Management Infrastructure", category: "Tech" },
  { area: "Data Room Management", category: "Tech" },
]

const ASSIGNMENTS: Record<string, { area: string; role: string }[]> = {
  "Monica Monajem": [
    { area: "Investment Strategy", role: "owner" },
    { area: "Intercompany Accounting", role: "owner" },
    { area: "Board / Governance", role: "owner" },
    { area: "Compliance / Legal Coordination", role: "owner" },
    { area: "Investor Onboarding", role: "contributor" },
  ],
  "Adam Feldheim": [
    { area: "Capital Raising", role: "owner" },
    { area: "Deal Execution", role: "owner" },
    { area: "Board / Governance", role: "contributor" },
    { area: "Investor Onboarding", role: "contributor" },
  ],
  "Chris Solarz": [
    { area: "Investment Strategy", role: "owner" },
    { area: "Manager Due Diligence", role: "owner" },
    { area: "Portfolio Monitoring", role: "owner" },
    { area: "Capital Raising", role: "contributor" },
  ],
  "Gage Spolansky": [
    { area: "Financial Modeling", role: "owner" },
    { area: "Technology / AI Initiatives", role: "owner" },
    { area: "Dashboard Development", role: "owner" },
    { area: "Data Room Management", role: "owner" },
    { area: "Fund Administration Oversight", role: "owner" },
    { area: "NAV Reconciliation", role: "contributor" },
    { area: "Investor Onboarding", role: "contributor" },
  ],
  "Pandora Stuart-Mills": [
    { area: "Intercompany Accounting", role: "contributor" },
    { area: "Board / Governance", role: "contributor" },
    { area: "Fund Administration Oversight", role: "contributor" },
  ],
  "Aram Ebrahimi": [
    { area: "Board / Governance", role: "contributor" },
  ],
  "Adil Abdulali": [
    { area: "Structured Products / Seeding", role: "owner" },
    { area: "Investment Strategy", role: "contributor" },
  ],
  "JP Gonzalez": [
    { area: "Investor Onboarding", role: "owner" },
    { area: "Fund Administration Oversight", role: "contributor" },
  ],
  "Leyu Zou": [
    { area: "NAV Reconciliation", role: "owner" },
    { area: "Risk Management Infrastructure", role: "owner" },
    { area: "Dashboard Development", role: "contributor" },
  ],
  "Evita Shneberg": [
    { area: "Marketing Materials", role: "owner" },
    { area: "Investor Outreach", role: "owner" },
    { area: "Website / Digital Presence", role: "owner" },
    { area: "Monthly Letters / Newsletters", role: "owner" },
  ],
  "Sean Kim": [
    { area: "Dashboard Development", role: "contributor" },
    { area: "Risk Management Infrastructure", role: "contributor" },
  ],
}

export async function POST() {
  const supabase = createServerClient()

  // Check if already seeded
  const { data: existing } = await supabase.from("org_people").select("id").limit(1)
  if (existing && existing.length > 0) {
    return NextResponse.json({ error: "Already seeded. Delete existing data first." }, { status: 409 })
  }

  // Insert people (parents first)
  const nameToId: Record<string, string> = {}

  // First pass: insert people without parent_id
  for (const p of PEOPLE) {
    const { tech, parent_key, ...fields } = p
    const { data, error } = await supabase
      .from("org_people")
      .insert({ ...fields, parent_id: null })
      .select("id")
      .single()

    if (error) return NextResponse.json({ error: `Failed to insert ${p.name}: ${error.message}` }, { status: 500 })
    nameToId[p.name] = data.id
  }

  // Second pass: set parent_ids
  for (const p of PEOPLE) {
    if (p.parent_key && nameToId[p.parent_key]) {
      await supabase
        .from("org_people")
        .update({ parent_id: nameToId[p.parent_key] })
        .eq("id", nameToId[p.name])
    }
  }

  // Insert tech stacks
  for (const p of PEOPLE) {
    if (p.tech.length > 0) {
      const items = p.tech.map((t) => ({
        person_id: nameToId[p.name],
        tool_name: t.tool_name,
        category: t.category,
      }))
      await supabase.from("org_tech_stack").insert(items)
    }
  }

  // Insert responsibilities
  const respNameToId: Record<string, string> = {}
  for (const r of RESPONSIBILITIES) {
    const { data, error } = await supabase
      .from("org_responsibilities")
      .insert(r)
      .select("id")
      .single()

    if (error) return NextResponse.json({ error: `Failed to insert responsibility ${r.area}: ${error.message}` }, { status: 500 })
    respNameToId[r.area] = data.id
  }

  // Insert assignments
  for (const [personName, assignments] of Object.entries(ASSIGNMENTS)) {
    const personId = nameToId[personName]
    if (!personId) continue

    for (const a of assignments) {
      const respId = respNameToId[a.area]
      if (!respId) continue

      await supabase.from("org_responsibility_assignments").insert({
        person_id: personId,
        responsibility_id: respId,
        role: a.role,
      })
    }
  }

  return NextResponse.json({
    ok: true,
    counts: {
      people: Object.keys(nameToId).length,
      responsibilities: Object.keys(respNameToId).length,
    },
  })
}

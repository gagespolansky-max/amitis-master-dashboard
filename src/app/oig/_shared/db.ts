import { createServerClient as createServiceRoleClient } from "@/lib/supabase-server"

// ============================================================================
// OIG database helpers — shared across Triage (writer), COS (reader), Audit.
//
// Hard rules baked in here, not in agent prompts:
// - Interactions upsert by (source_type, source_id). Re-running Triage over an
//   overlapping window must not create duplicates.
// - Organizations/people are looked up before insert (domain/email match) so
//   the same entity doesn't get a second row from a slightly different name.
// - Action items can be created or updated, but the dedupe decision (which
//   existing item to continue vs create new) is made by the agent — these
//   helpers are dumb lookups + writes.
// ============================================================================

// ----- types -----

export type OigSourceType = "gmail" | "slack" | "attio" | "tacd_iq" | "manual"
export type OigInteractionType =
  | "email"
  | "thread"
  | "dm"
  | "call"
  | "meeting"
  | "transcript"
  | "note"
export type OigPriority = "low" | "medium" | "high" | "critical"
export type OigActionStatus = "open" | "in_progress" | "blocked" | "done" | "dropped"
export type OigOrgType =
  | "customer"
  | "prospect"
  | "investor"
  | "partner"
  | "vendor"
  | "internal"

export interface InteractionRow {
  id: string
  source_type: OigSourceType
  source_id: string
  thread_id: string | null
  occurred_at: string
  title: string | null
  clean_summary: string | null
  interaction_type: OigInteractionType | null
  priority: OigPriority | null
  urgency: OigPriority | null
  status: string
  org_id: string | null
  primary_person_id: string | null
}

export interface ActionItemRow {
  id: string
  interaction_id: string
  title: string
  description: string | null
  owner_person_id: string | null
  requested_by_person_id: string | null
  due_date: string | null
  status: OigActionStatus
  priority: OigPriority | null
  category: string | null
  confidence: number | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

// ----- organizations -----

export async function findOrCreateOrganization(args: {
  name: string
  domain?: string | null
  org_type?: OigOrgType | null
}): Promise<{ id: string; created: boolean }> {
  const admin = createServiceRoleClient()
  const name = args.name.trim()
  const domain = args.domain?.trim().toLowerCase() || null

  // 1) match by domain (highest signal)
  if (domain) {
    const { data } = await admin
      .from("organizations")
      .select("id")
      .eq("domain", domain)
      .maybeSingle()
    if (data?.id) return { id: data.id, created: false }
  }

  // 2) match by case-insensitive name
  const { data: byName } = await admin
    .from("organizations")
    .select("id")
    .ilike("name", name)
    .maybeSingle()
  if (byName?.id) return { id: byName.id, created: false }

  // 3) insert
  const { data: created, error } = await admin
    .from("organizations")
    .insert({ name, domain, org_type: args.org_type ?? null })
    .select("id")
    .single()
  if (error || !created) throw new Error(`findOrCreateOrganization: ${error?.message ?? "no row"}`)
  return { id: created.id, created: true }
}

// ----- people -----

export async function findOrCreatePerson(args: {
  full_name: string
  email?: string | null
  company_id?: string | null
  role?: string | null
  relationship_type?: string | null
}): Promise<{ id: string; created: boolean }> {
  const admin = createServiceRoleClient()
  const full_name = args.full_name.trim()
  const email = args.email?.trim().toLowerCase() || null

  // 1) match by email
  if (email) {
    const { data } = await admin
      .from("people")
      .select("id")
      .ilike("email", email)
      .maybeSingle()
    if (data?.id) return { id: data.id, created: false }
  }

  // 2) match by exact name + (optional) same company
  let q = admin.from("people").select("id").ilike("full_name", full_name)
  if (args.company_id) q = q.eq("company_id", args.company_id)
  const { data: byName } = await q.maybeSingle()
  if (byName?.id) return { id: byName.id, created: false }

  // 3) insert
  const { data: created, error } = await admin
    .from("people")
    .insert({
      full_name,
      email,
      company_id: args.company_id ?? null,
      role: args.role ?? null,
      relationship_type: args.relationship_type ?? null,
    })
    .select("id")
    .single()
  if (error || !created) throw new Error(`findOrCreatePerson: ${error?.message ?? "no row"}`)
  return { id: created.id, created: true }
}

// ----- interactions -----

export async function findExistingInteraction(args: {
  source_type: OigSourceType
  source_id: string
}): Promise<InteractionRow | null> {
  const admin = createServiceRoleClient()
  const { data } = await admin
    .from("interactions")
    .select(
      "id, source_type, source_id, thread_id, occurred_at, title, clean_summary, interaction_type, priority, urgency, status, org_id, primary_person_id",
    )
    .eq("source_type", args.source_type)
    .eq("source_id", args.source_id)
    .maybeSingle()
  return (data as InteractionRow | null) ?? null
}

export async function upsertInteraction(args: {
  source_type: OigSourceType
  source_id: string
  thread_id?: string | null
  occurred_at: string
  title?: string | null
  raw_text?: string | null
  clean_summary?: string | null
  interaction_type?: OigInteractionType | null
  priority?: OigPriority | null
  urgency?: OigPriority | null
  status?: string
  org_id?: string | null
  primary_person_id?: string | null
  tags?: string[]
}): Promise<{ id: string; created: boolean }> {
  const admin = createServiceRoleClient()

  const existing = await findExistingInteraction({
    source_type: args.source_type,
    source_id: args.source_id,
  })

  if (existing) {
    const { error: upErr } = await admin
      .from("interactions")
      .update({
        thread_id: args.thread_id ?? existing.thread_id,
        title: args.title ?? existing.title,
        raw_text: args.raw_text ?? undefined,
        clean_summary: args.clean_summary ?? existing.clean_summary,
        interaction_type: args.interaction_type ?? existing.interaction_type,
        priority: args.priority ?? existing.priority,
        urgency: args.urgency ?? existing.urgency,
        status: args.status ?? existing.status,
        org_id: args.org_id ?? existing.org_id,
        primary_person_id: args.primary_person_id ?? existing.primary_person_id,
      })
      .eq("id", existing.id)
    if (upErr) throw new Error(`upsertInteraction (update): ${upErr.message}`)
    if (args.tags?.length) await addInteractionTags(existing.id, args.tags)
    return { id: existing.id, created: false }
  }

  const { data: inserted, error } = await admin
    .from("interactions")
    .insert({
      source_type: args.source_type,
      source_id: args.source_id,
      thread_id: args.thread_id ?? null,
      occurred_at: args.occurred_at,
      title: args.title ?? null,
      raw_text: args.raw_text ?? null,
      clean_summary: args.clean_summary ?? null,
      interaction_type: args.interaction_type ?? null,
      priority: args.priority ?? null,
      urgency: args.urgency ?? null,
      status: args.status ?? "open",
      org_id: args.org_id ?? null,
      primary_person_id: args.primary_person_id ?? null,
    })
    .select("id")
    .single()
  if (error || !inserted) throw new Error(`upsertInteraction (insert): ${error?.message ?? "no row"}`)
  if (args.tags?.length) await addInteractionTags(inserted.id, args.tags)
  return { id: inserted.id, created: true }
}

// ----- action items -----

export async function findOpenActionItemsByInteraction(
  interactionId: string,
): Promise<ActionItemRow[]> {
  const admin = createServiceRoleClient()
  const { data, error } = await admin
    .from("action_items")
    .select(
      "id, interaction_id, title, description, owner_person_id, requested_by_person_id, due_date, status, priority, category, confidence, created_at, updated_at, completed_at",
    )
    .eq("interaction_id", interactionId)
    .not("status", "in", "(done,dropped)")
  if (error) throw new Error(`findOpenActionItemsByInteraction: ${error.message}`)
  return (data ?? []) as ActionItemRow[]
}

export async function findOpenActionItemsByThread(
  source_type: OigSourceType,
  thread_id: string,
): Promise<ActionItemRow[]> {
  const admin = createServiceRoleClient()
  const { data: rows, error } = await admin
    .from("interactions")
    .select(`id, action_items!inner(
      id, interaction_id, title, description, owner_person_id, requested_by_person_id,
      due_date, status, priority, category, confidence, created_at, updated_at, completed_at
    )`)
    .eq("source_type", source_type)
    .eq("thread_id", thread_id)
  if (error) throw new Error(`findOpenActionItemsByThread: ${error.message}`)
  // Flatten nested action_items, drop closed states.
  // Type via unknown — supabase nested-select typing isn't worth a generic here.
  const out: ActionItemRow[] = []
  for (const r of (rows ?? []) as unknown as Array<{ action_items: ActionItemRow[] }>) {
    for (const a of r.action_items ?? []) {
      if (a.status !== "done" && a.status !== "dropped") out.push(a)
    }
  }
  return out
}

export async function writeActionItem(args: {
  interaction_id: string
  title: string
  description?: string | null
  owner_person_id?: string | null
  requested_by_person_id?: string | null
  due_date?: string | null
  status?: OigActionStatus
  priority?: OigPriority | null
  category?: string | null
  confidence?: number | null
  tags?: string[]
}): Promise<{ id: string }> {
  const admin = createServiceRoleClient()
  const { data, error } = await admin
    .from("action_items")
    .insert({
      interaction_id: args.interaction_id,
      title: args.title,
      description: args.description ?? null,
      owner_person_id: args.owner_person_id ?? null,
      requested_by_person_id: args.requested_by_person_id ?? null,
      due_date: args.due_date ?? null,
      status: args.status ?? "open",
      priority: args.priority ?? null,
      category: args.category ?? null,
      confidence: args.confidence ?? null,
    })
    .select("id")
    .single()
  if (error || !data) throw new Error(`writeActionItem: ${error?.message ?? "no row"}`)
  if (args.tags?.length) await addActionItemTags(data.id, args.tags)
  return { id: data.id }
}

export async function updateActionItem(args: {
  id: string
  status?: OigActionStatus
  due_date?: string | null
  priority?: OigPriority | null
  description?: string
  owner_person_id?: string | null
}): Promise<{ id: string; updated: boolean }> {
  const admin = createServiceRoleClient()
  // The CHECK constraint requires completed_at iff status=done.
  const update: Record<string, unknown> = {}
  if (args.status !== undefined) {
    update.status = args.status
    update.completed_at = args.status === "done" ? new Date().toISOString() : null
  }
  if (args.due_date !== undefined) update.due_date = args.due_date
  if (args.priority !== undefined) update.priority = args.priority
  if (args.description !== undefined) update.description = args.description
  if (args.owner_person_id !== undefined) update.owner_person_id = args.owner_person_id

  if (Object.keys(update).length === 0) return { id: args.id, updated: false }

  const { error } = await admin.from("action_items").update(update).eq("id", args.id)
  if (error) throw new Error(`updateActionItem: ${error.message}`)
  return { id: args.id, updated: true }
}

// ----- COS read helpers -----
//
// COS is the primary reader of OIG memory. These functions return denormalized
// rows (org name, person name, source link) so COS doesn't have to compose
// multiple round-trips. Triage and Audit may also use these later.
// ============================================================================

export interface ActionItemRead {
  id: string
  title: string
  description: string | null
  status: OigActionStatus
  priority: OigPriority | null
  category: string | null
  due_date: string | null
  confidence: number | null
  created_at: string
  updated_at: string
  completed_at: string | null
  owner_name: string | null
  owner_email: string | null
  requested_by_name: string | null
  requested_by_email: string | null
  organization_name: string | null
  source_type: OigSourceType
  source_id: string
  thread_id: string | null
  interaction_id: string
  interaction_title: string | null
  tags: string[]
}

export interface InteractionRead {
  id: string
  source_type: OigSourceType
  source_id: string
  thread_id: string | null
  occurred_at: string
  title: string | null
  clean_summary: string | null
  interaction_type: OigInteractionType | null
  priority: OigPriority | null
  urgency: OigPriority | null
  status: string
  organization_name: string | null
  primary_person_name: string | null
  primary_person_email: string | null
  open_action_items_count: number
  tags: string[]
}

export interface AuditFindingRead {
  id: string
  finding_type: string
  severity: "low" | "medium" | "high" | "critical"
  title: string
  details: string | null
  related_action_item_title: string | null
  related_action_item_id: string | null
  related_person_name: string | null
  related_org_name: string | null
  related_interaction_title: string | null
  created_at: string
  resolved_at: string | null
}

export async function readActionItems(args: {
  status?: OigActionStatus | "open_or_in_progress" | "all"
  owner_email?: string
  priority?: OigPriority
  due_before?: string // ISO date
  overdue_only?: boolean
  limit?: number
}): Promise<ActionItemRead[]> {
  const admin = createServiceRoleClient()
  const limit = Math.min(200, Math.max(1, args.limit ?? 50))

  let q = admin.from("action_items").select(`
    id, title, description, status, priority, category, due_date, confidence,
    created_at, updated_at, completed_at,
    interaction_id,
    owner:owner_person_id(full_name, email),
    requested_by:requested_by_person_id(full_name, email),
    interaction:interaction_id(
      title, source_type, source_id, thread_id,
      organization:org_id(name)
    ),
    tags:action_item_tags(tag)
  `).limit(limit)

  if (!args.status || args.status === "open_or_in_progress") {
    q = q.in("status", ["open", "in_progress", "blocked"])
  } else if (args.status !== "all") {
    q = q.eq("status", args.status)
  }
  if (args.priority) q = q.eq("priority", args.priority)
  if (args.due_before) q = q.lte("due_date", args.due_before)
  if (args.overdue_only) {
    q = q.lt("due_date", new Date().toISOString().slice(0, 10))
    q = q.in("status", ["open", "in_progress", "blocked"])
  }

  q = q.order("due_date", { ascending: true, nullsFirst: false }).order("priority", {
    ascending: false,
  })

  const { data, error } = await q
  if (error) throw new Error(`readActionItems: ${error.message}`)

  // Owner email filter is applied client-side because the join can't be filtered server-side cleanly.
  type Row = {
    id: string
    title: string
    description: string | null
    status: OigActionStatus
    priority: OigPriority | null
    category: string | null
    due_date: string | null
    confidence: number | null
    created_at: string
    updated_at: string
    completed_at: string | null
    interaction_id: string
    owner: { full_name: string | null; email: string | null } | null
    requested_by: { full_name: string | null; email: string | null } | null
    interaction: {
      title: string | null
      source_type: OigSourceType
      source_id: string
      thread_id: string | null
      organization: { name: string | null } | null
    } | null
    tags: { tag: string }[] | null
  }
  const rows = (data ?? []) as unknown as Row[]
  const filtered = args.owner_email
    ? rows.filter((r) => r.owner?.email?.toLowerCase() === args.owner_email!.toLowerCase())
    : rows

  return filtered.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    priority: r.priority,
    category: r.category,
    due_date: r.due_date,
    confidence: r.confidence,
    created_at: r.created_at,
    updated_at: r.updated_at,
    completed_at: r.completed_at,
    interaction_id: r.interaction_id,
    interaction_title: r.interaction?.title ?? null,
    source_type: r.interaction?.source_type ?? "manual",
    source_id: r.interaction?.source_id ?? "",
    thread_id: r.interaction?.thread_id ?? null,
    owner_name: r.owner?.full_name ?? null,
    owner_email: r.owner?.email ?? null,
    requested_by_name: r.requested_by?.full_name ?? null,
    requested_by_email: r.requested_by?.email ?? null,
    organization_name: r.interaction?.organization?.name ?? null,
    tags: (r.tags ?? []).map((t) => t.tag),
  }))
}

export async function readInteractions(args: {
  source_type?: OigSourceType
  org_name?: string
  person_email?: string
  days_back?: number
  has_open_action_items?: boolean
  limit?: number
}): Promise<InteractionRead[]> {
  const admin = createServiceRoleClient()
  const limit = Math.min(100, Math.max(1, args.limit ?? 25))

  let q = admin.from("interactions").select(`
    id, source_type, source_id, thread_id, occurred_at, title, clean_summary,
    interaction_type, priority, urgency, status,
    organization:org_id(name),
    primary_person:primary_person_id(full_name, email),
    tags:interaction_tags(tag),
    action_items:action_items(id, status)
  `).limit(limit)

  if (args.source_type) q = q.eq("source_type", args.source_type)
  if (args.days_back && args.days_back > 0) {
    const cutoff = new Date(Date.now() - args.days_back * 86_400_000).toISOString()
    q = q.gte("occurred_at", cutoff)
  }
  q = q.order("occurred_at", { ascending: false })

  const { data, error } = await q
  if (error) throw new Error(`readInteractions: ${error.message}`)

  type Row = {
    id: string
    source_type: OigSourceType
    source_id: string
    thread_id: string | null
    occurred_at: string
    title: string | null
    clean_summary: string | null
    interaction_type: OigInteractionType | null
    priority: OigPriority | null
    urgency: OigPriority | null
    status: string
    organization: { name: string | null } | null
    primary_person: { full_name: string | null; email: string | null } | null
    tags: { tag: string }[] | null
    action_items: { id: string; status: OigActionStatus }[] | null
  }
  let rows = (data ?? []) as unknown as Row[]
  if (args.org_name) {
    const needle = args.org_name.toLowerCase()
    rows = rows.filter((r) => r.organization?.name?.toLowerCase().includes(needle))
  }
  if (args.person_email) {
    const needle = args.person_email.toLowerCase()
    rows = rows.filter((r) => r.primary_person?.email?.toLowerCase() === needle)
  }
  if (args.has_open_action_items) {
    rows = rows.filter((r) =>
      (r.action_items ?? []).some((a) => a.status !== "done" && a.status !== "dropped"),
    )
  }

  return rows.map((r) => ({
    id: r.id,
    source_type: r.source_type,
    source_id: r.source_id,
    thread_id: r.thread_id,
    occurred_at: r.occurred_at,
    title: r.title,
    clean_summary: r.clean_summary,
    interaction_type: r.interaction_type,
    priority: r.priority,
    urgency: r.urgency,
    status: r.status,
    organization_name: r.organization?.name ?? null,
    primary_person_name: r.primary_person?.full_name ?? null,
    primary_person_email: r.primary_person?.email ?? null,
    open_action_items_count: (r.action_items ?? []).filter(
      (a) => a.status !== "done" && a.status !== "dropped",
    ).length,
    tags: (r.tags ?? []).map((t) => t.tag),
  }))
}

export async function readAuditFindings(args: {
  severity?: "low" | "medium" | "high" | "critical"
  unresolved_only?: boolean
  limit?: number
}): Promise<AuditFindingRead[]> {
  const admin = createServiceRoleClient()
  const limit = Math.min(100, Math.max(1, args.limit ?? 25))

  let q = admin.from("audit_findings").select(`
    id, finding_type, severity, title, details, created_at, resolved_at,
    related_action_item:related_action_item_id(id, title),
    related_person:related_person_id(full_name),
    related_org:related_org_id(name),
    related_interaction:related_interaction_id(title)
  `).limit(limit)

  if (args.severity) q = q.eq("severity", args.severity)
  if (args.unresolved_only !== false) q = q.is("resolved_at", null)
  q = q.order("severity", { ascending: false }).order("created_at", { ascending: false })

  const { data, error } = await q
  if (error) throw new Error(`readAuditFindings: ${error.message}`)

  type Row = {
    id: string
    finding_type: string
    severity: "low" | "medium" | "high" | "critical"
    title: string
    details: string | null
    created_at: string
    resolved_at: string | null
    related_action_item: { id: string; title: string } | null
    related_person: { full_name: string | null } | null
    related_org: { name: string | null } | null
    related_interaction: { title: string | null } | null
  }
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    finding_type: r.finding_type,
    severity: r.severity,
    title: r.title,
    details: r.details,
    created_at: r.created_at,
    resolved_at: r.resolved_at,
    related_action_item_id: r.related_action_item?.id ?? null,
    related_action_item_title: r.related_action_item?.title ?? null,
    related_person_name: r.related_person?.full_name ?? null,
    related_org_name: r.related_org?.name ?? null,
    related_interaction_title: r.related_interaction?.title ?? null,
  }))
}

// ----- atomic process-thread (Triage's main write) -----

export interface ProcessThreadInput {
  source_type: OigSourceType
  source_id: string
  thread_id: string | null
  occurred_at: string
  // Decision the agent made about whether this thread is worth recording
  // and if so, what to write. When `relevant=false`, only `reason` is honored.
  relevant: boolean
  reason?: string
  // Required when relevant=true
  title?: string
  clean_summary?: string
  interaction_type?: OigInteractionType
  priority?: OigPriority
  urgency?: OigPriority
  status?: string
  tags?: string[]
  organization?: { name: string; domain?: string | null; org_type?: OigOrgType | null }
  primary_person?: {
    full_name: string
    email?: string | null
    role?: string | null
    relationship_type?: string | null
  }
  action_items?: Array<{
    title: string
    description?: string | null
    due_date?: string | null
    priority?: OigPriority | null
    category?: string | null
    confidence?: number | null
    owner_email?: string | null
    requested_by_email?: string | null
    tags?: string[]
  }>
}

export interface ProcessThreadResult {
  relevant: boolean
  skipped_reason?: string
  interaction_id?: string
  interaction_created?: boolean
  organization_id?: string
  primary_person_id?: string
  action_items_created: number
  action_items_updated: number
}

/**
 * Atomic per-thread Triage write. The agent makes one decision per thread —
 * relevant or not, and what the structured extraction looks like — and this
 * function performs all dedup + writes server-side in one call.
 *
 * Replaces the previous chain of 6-7 separate tool calls per thread.
 */
export async function processThread(input: ProcessThreadInput): Promise<ProcessThreadResult> {
  if (!input.relevant) {
    return {
      relevant: false,
      skipped_reason: input.reason ?? "(no reason given)",
      action_items_created: 0,
      action_items_updated: 0,
    }
  }

  // Resolve org and primary person in parallel.
  const [orgResult, personResult] = await Promise.all([
    input.organization
      ? findOrCreateOrganization({
          name: input.organization.name,
          domain: input.organization.domain,
          org_type: input.organization.org_type,
        })
      : Promise.resolve(null),
    input.primary_person
      ? (async () => {
          // Person needs org_id; resolve org first if both are provided.
          return null // placeholder; real resolution below
        })()
      : Promise.resolve(null),
  ])
  const orgId = orgResult?.id ?? null

  let primaryPersonId: string | null = null
  if (input.primary_person) {
    const r = await findOrCreatePerson({
      full_name: input.primary_person.full_name,
      email: input.primary_person.email,
      company_id: orgId,
      role: input.primary_person.role,
      relationship_type: input.primary_person.relationship_type,
    })
    primaryPersonId = r.id
  }

  if (!input.clean_summary) {
    throw new Error("processThread: clean_summary is required when relevant=true")
  }

  const interactionResult = await upsertInteraction({
    source_type: input.source_type,
    source_id: input.source_id,
    thread_id: input.thread_id,
    occurred_at: input.occurred_at,
    title: input.title ?? null,
    clean_summary: input.clean_summary,
    interaction_type: input.interaction_type ?? null,
    priority: input.priority ?? null,
    urgency: input.urgency ?? null,
    status: input.status ?? "open",
    org_id: orgId,
    primary_person_id: primaryPersonId,
    tags: input.tags,
  })
  const interactionId = interactionResult.id

  // Action items: dedup by lowercased title against existing open items on this thread.
  let actionItemsCreated = 0
  let actionItemsUpdated = 0

  if (input.action_items && input.action_items.length > 0) {
    const existing = input.thread_id
      ? await findOpenActionItemsByThread(input.source_type, input.thread_id)
      : []
    const existingByTitle = new Map(
      existing.map((i) => [i.title.trim().toLowerCase(), i]),
    )

    for (const ai of input.action_items) {
      const titleKey = ai.title.trim().toLowerCase()
      const match = existingByTitle.get(titleKey)

      // Resolve owner/requester emails to person ids if provided.
      let ownerId: string | null = null
      let requesterId: string | null = null
      const promises: Promise<{ id: string } | null>[] = []
      if (ai.owner_email) {
        promises.push(
          findOrCreatePerson({
            full_name: ai.owner_email.split("@")[0],
            email: ai.owner_email,
            company_id: null,
          }),
        )
      } else {
        promises.push(Promise.resolve(null))
      }
      if (ai.requested_by_email) {
        promises.push(
          findOrCreatePerson({
            full_name: ai.requested_by_email.split("@")[0],
            email: ai.requested_by_email,
            company_id: null,
          }),
        )
      } else {
        promises.push(Promise.resolve(null))
      }
      const [ownerRes, reqRes] = await Promise.all(promises)
      ownerId = ownerRes?.id ?? null
      requesterId = reqRes?.id ?? null

      const tags = [...(ai.tags ?? [])]
      if (typeof ai.confidence === "number" && ai.confidence < 0.6) tags.push("low_confidence")

      if (match) {
        // Continuation of an existing commitment — update minimal fields.
        await updateActionItem({
          id: match.id,
          due_date: ai.due_date ?? undefined,
          priority: ai.priority ?? undefined,
          description: ai.description ?? undefined,
          owner_person_id: ownerId,
        })
        if (tags.length) await addActionItemTags(match.id, tags)
        actionItemsUpdated += 1
      } else {
        await writeActionItem({
          interaction_id: interactionId,
          title: ai.title,
          description: ai.description,
          owner_person_id: ownerId,
          requested_by_person_id: requesterId,
          due_date: ai.due_date,
          priority: ai.priority,
          category: ai.category,
          confidence: ai.confidence,
          tags,
        })
        actionItemsCreated += 1
      }
    }
  }

  return {
    relevant: true,
    interaction_id: interactionId,
    interaction_created: interactionResult.created,
    organization_id: orgId ?? undefined,
    primary_person_id: primaryPersonId ?? undefined,
    action_items_created: actionItemsCreated,
    action_items_updated: actionItemsUpdated,
  }
}

// ----- tags -----

export async function addInteractionTags(interactionId: string, tags: string[]): Promise<void> {
  if (tags.length === 0) return
  const admin = createServiceRoleClient()
  const rows = Array.from(new Set(tags.map((t) => t.trim().toLowerCase()))).map((tag) => ({
    interaction_id: interactionId,
    tag,
  }))
  const { error } = await admin.from("interaction_tags").upsert(rows, { onConflict: "interaction_id,tag" })
  if (error) throw new Error(`addInteractionTags: ${error.message}`)
}

export async function addActionItemTags(actionItemId: string, tags: string[]): Promise<void> {
  if (tags.length === 0) return
  const admin = createServiceRoleClient()
  const rows = Array.from(new Set(tags.map((t) => t.trim().toLowerCase()))).map((tag) => ({
    action_item_id: actionItemId,
    tag,
  }))
  const { error } = await admin
    .from("action_item_tags")
    .upsert(rows, { onConflict: "action_item_id,tag" })
  if (error) throw new Error(`addActionItemTags: ${error.message}`)
}

"use client"

import { useState, useEffect, useRef } from "react"
import {
  Activity, Store, FlaskConical, Wrench, Cpu, Layers, CheckCircle2,
  AlertTriangle, XCircle, Search, ExternalLink, MessageSquare, Bot,
  Send, Loader2, ChevronLeft, ChevronRight, FileText, Shield, Target,
  Zap, TrendingUp, Plus, X, Eye, Monitor, Terminal, Boxes, Star,
  GitFork, Download, RefreshCw, ChevronDown, Square, CheckSquare
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Skill {
  id: string; name: string; description: string; project: string;
  scope: string; environments: string[]; is_active: boolean; category: string;
  total_uses: number; uses_7d: number; uses_30d: number;
  last_used: string | null; success_count: number; failure_count: number;
  health_status: string; latest_eval_score: number | null;
  latest_eval_type: string | null; latest_eval_date: string | null;
  top_workflows?: string[];
}

interface UsageEntry {
  id: string; timestamp: string; project: string; platform: string;
  outcome: string; notes: string; duration_ms?: number;
}

interface CatalogSkill {
  id: string; name: string; description: string; author: string;
  source: string; source_url: string; category: string;
  compatibility: string[]; install_status: string; stars: number;
  skill_md_content?: string; suggested_workflows?: string[];
  success_rate_7d?: number | null; lifetime_uses?: number;
}

interface EvalResult {
  id: string; skill_name: string; eval_type: string; score: number;
  total_checks: number; passed_checks: number; notes: string;
  source: string; created_at: string; iteration?: number;
  tokens_used?: number; duration_ms?: number;
}

interface Proposal {
  id: string; title: string; description: string; requested_by: string;
  business_segment: string; target_workflow: string; priority: string;
  status: string; notes: string; created_at: string;
}

interface ChatMessage { role: "user" | "assistant"; content: string; }

interface SkillAnalysis {
  strengths: string[];
  weaknesses: string[];
  amitis_fit: { readiness: "ready" | "needs_customization" | "not_applicable"; assessment: string };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ENV_ICONS: Record<string, { icon: typeof Monitor; label: string; color: string }> = {
  "claude-ai": { icon: Monitor, label: "Claude.ai", color: "#6366f1" },
  "claude-code": { icon: Terminal, label: "Claude Code", color: "#22c55e" },
  "cowork": { icon: Boxes, label: "Cowork", color: "#f59e0b" },
}

const HEALTH: Record<string, { color: string; label: string }> = {
  green: { color: "#22c55e", label: "Healthy" },
  yellow: { color: "#eab308", label: "Needs Attention" },
  red: { color: "#ef4444", label: "Critical" },
  disabled: { color: "#6b7280", label: "Disabled" },
  unknown: { color: "#6b7280", label: "No Data" },
}

const CAT_COLORS: Record<string, string> = {
  document: "#3b82f6", workflow: "#8b5cf6", mcp: "#06b6d4",
  creative: "#f59e0b", code: "#10b981", data: "#ec4899",
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  proposal: { bg: "rgba(99,102,241,0.12)", text: "#a5b4fc" },
  approved: { bg: "rgba(34,197,94,0.12)", text: "#86efac" },
  drafting: { bg: "rgba(234,179,8,0.12)", text: "#fde047" },
  testing: { bg: "rgba(249,115,22,0.12)", text: "#fdba74" },
  ready: { bg: "rgba(34,197,94,0.12)", text: "#22c55e" },
  rejected: { bg: "rgba(239,68,68,0.12)", text: "#fca5a5" },
}

const TABS = [
  { id: "in-use", label: "Skills In Use", icon: Activity },
  { id: "marketplace", label: "Marketplace", icon: Store },
  { id: "development", label: "Development", icon: Wrench },
  { id: "evals", label: "Eval History", icon: FlaskConical },
] as const
type TabId = (typeof TABS)[number]["id"]

// ─── Styles ──────────────────────────────────────────────────────────────────

const st = {
  page: { minHeight: "100vh", background: "#0f1117", color: "#e2e8f0", fontFamily: "'Geist Sans', system-ui, sans-serif" } as React.CSSProperties,
  card: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 } as React.CSSProperties,
  input: { width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#e2e8f0", fontSize: 13, outline: "none" } as React.CSSProperties,
  label: { fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 6, display: "block" } as React.CSSProperties,
  pill: (color: string): React.CSSProperties => ({ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: `${color}22`, color, fontWeight: 600, whiteSpace: "nowrap" }),
  btn: (active: boolean, color = "#6366f1"): React.CSSProperties => ({
    padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
    background: active ? color : `${color}22`, color: active ? "#fff" : color,
    fontSize: 12, fontWeight: 600, transition: "all 0.15s",
  }),
}

// ─── GitHub Fetcher ──────────────────────────────────────────────────────────

function inferCat(name: string): string {
  const n = name.toLowerCase()
  if (/doc|pdf|word|pptx|xlsx|write|report/.test(n)) return "document"
  if (/frontend|design|css|ui|style/.test(n)) return "creative"
  if (/mcp|server|tool|integration/.test(n)) return "mcp"
  if (/code|test|debug|lint|git|deploy/.test(n)) return "code"
  if (/data|csv|sql|analytics|chart/.test(n)) return "data"
  return "workflow"
}

async function fetchGitHubSkills(): Promise<CatalogSkill[]> {
  const repos = [
    { owner: "anthropics", repo: "skills", source: "anthropic", author: "Anthropic" },
    { owner: "anthropics", repo: "anthropic-cookbook", source: "community", author: "Community" },
  ]
  const skills: CatalogSkill[] = []
  for (const r of repos) {
    try {
      const res = await fetch(`https://api.github.com/repos/${r.owner}/${r.repo}/contents/`, {
        headers: { Accept: "application/vnd.github.v3+json" },
      })
      if (!res.ok) continue
      const items = await res.json()
      if (!Array.isArray(items)) continue
      for (const dir of items.filter((i: Record<string, string>) => i.type === "dir" && !i.name.startsWith(".") && !["node_modules", ".github", "assets", "images"].includes(i.name))) {
        skills.push({
          id: `${r.source}-${dir.name}`,
          name: dir.name.replace(/[-_]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
          description: `${r.author} skill: ${dir.name.replace(/[-_]/g, " ")}`,
          author: r.author, source: r.source,
          source_url: dir.html_url || `https://github.com/${r.owner}/${r.repo}/tree/main/${dir.name}`,
          category: inferCat(dir.name), compatibility: ["claude-ai", "claude-code", "cowork"],
          install_status: "available", stars: 0, suggested_workflows: [], success_rate_7d: null, lifetime_uses: 0,
        })
      }
    } catch (e) { console.error(e) }
  }
  return skills
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function SkillsHub() {
  const [tab, setTab] = useState<TabId>("in-use")
  const [skills, setSkills] = useState<Skill[]>(MOCK_SKILLS)
  const [catalog, setCatalog] = useState<CatalogSkill[]>(MOCK_CATALOG)
  const [evals] = useState<EvalResult[]>(MOCK_EVALS)
  const [proposals, setProposals] = useState<Proposal[]>(MOCK_PROPOSALS)
  const [catalogLoading, setCatalogLoading] = useState(false)

  useEffect(() => {
    if (tab === "marketplace" && catalog.length <= MOCK_CATALOG.length) {
      setCatalogLoading(true)
      fetchGitHubSkills()
        .then((gh) => { setCatalog([...MOCK_CATALOG, ...gh]); setCatalogLoading(false) })
        .catch(() => setCatalogLoading(false))
    }
  }, [tab, catalog.length])

  function toggleSkill(id: string, active: boolean) {
    setSkills((prev) => prev.map((sk) => sk.id === id ? { ...sk, is_active: active, health_status: active ? "green" : "disabled" } : sk))
  }

  function addProposal(p: Omit<Proposal, "id" | "created_at">) {
    setProposals((prev) => [{ ...p, id: `p-${Date.now()}`, created_at: new Date().toISOString() }, ...prev])
  }

  return (
    <div style={st.page}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "24px 32px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Cpu size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>Skills Hub</h1>
            <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Manage, discover, and develop AI skills</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          {TABS.map((t) => {
            const Icon = t.icon; const active = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "10px 20px",
                background: active ? "rgba(99,102,241,0.12)" : "transparent",
                border: "none", borderBottom: active ? "2px solid #6366f1" : "2px solid transparent",
                color: active ? "#a5b4fc" : "#64748b", cursor: "pointer", fontSize: 13, fontWeight: 600,
                borderRadius: "8px 8px 0 0", transition: "all 0.15s",
              }}>
                <Icon size={15} /> {t.label}
                {t.id === "development" && proposals.filter((p) => p.status === "proposal").length > 0 && (
                  <span style={{ fontSize: 10, background: "#6366f1", color: "#fff", borderRadius: 10, padding: "1px 6px", marginLeft: 4 }}>
                    {proposals.filter((p) => p.status === "proposal").length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ padding: "24px 32px" }}>
        {tab === "in-use" ? <SkillsInUse skills={skills} onToggle={toggleSkill} />
          : tab === "marketplace" ? <Marketplace catalog={catalog} loading={catalogLoading} installed={skills} />
          : tab === "development" ? <Development proposals={proposals} onAdd={addProposal} />
          : <EvalHistory evals={evals} />}
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAB 1: Skills In Use
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function SkillsInUse({ skills, onToggle }: { skills: Skill[]; onToggle: (id: string, a: boolean) => void }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filter, setFilter] = useState("all")
  const [hoveredUses, setHoveredUses] = useState<string | null>(null)

  const filtered = skills.filter((sk) => {
    if (filter === "all") return true
    if (filter === "active") return sk.is_active && sk.health_status === "green"
    if (filter === "attention") return sk.health_status === "yellow" || sk.health_status === "red"
    if (filter === "disabled") return !sk.is_active
    return true
  })

  const counts = {
    all: skills.length,
    active: skills.filter((sk) => sk.is_active && sk.health_status === "green").length,
    attention: skills.filter((sk) => sk.health_status === "yellow" || sk.health_status === "red").length,
    disabled: skills.filter((sk) => !sk.is_active).length,
  }

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {([
          { key: "all", label: "Total Skills", icon: Layers, color: "#6366f1" },
          { key: "active", label: "Healthy", icon: CheckCircle2, color: "#22c55e" },
          { key: "attention", label: "Needs Attention", icon: AlertTriangle, color: "#eab308" },
          { key: "disabled", label: "Disabled", icon: XCircle, color: "#6b7280" },
        ] as const).map((c) => {
          const Icon = c.icon; const act = filter === c.key
          return (
            <button key={c.key} onClick={() => setFilter(c.key)} style={{
              ...st.card, padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14,
              borderColor: act ? `${c.color}44` : "rgba(255,255,255,0.06)", transition: "all 0.15s",
            }}>
              <Icon size={18} color={c.color} />
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{counts[c.key]}</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>{c.label}</div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Skill rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {filtered.map((sk) => {
          const open = expanded === sk.id
          const h = HEALTH[sk.health_status] || HEALTH.unknown
          const cc = CAT_COLORS[sk.category] || "#6b7280"
          const rate = sk.total_uses > 0 ? Math.round((sk.success_count / (sk.success_count + sk.failure_count)) * 100) : null

          return (
            <div key={sk.id} style={{ ...st.card, overflow: "hidden" }}>
              <div onClick={() => setExpanded(open ? null : sk.id)} style={{
                display: "grid", gridTemplateColumns: "28px 1.5fr 0.7fr 0.4fr 0.4fr 60px",
                alignItems: "center", padding: "14px 20px", cursor: "pointer", gap: 16,
              }}>
                {/* Health dot */}
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: h.color, boxShadow: `0 0 8px ${h.color}44` }} />

                {/* Name + workflows + platforms */}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{sk.name}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={st.pill(cc)}>{sk.category}</span>
                    {(sk.top_workflows || [sk.project]).slice(0, 2).map((w) => (
                      <span key={w} style={{ fontSize: 10, color: "#94a3b8", background: "rgba(255,255,255,0.04)", padding: "2px 6px", borderRadius: 4 }}>{w}</span>
                    ))}
                    <span style={{ width: 1, height: 12, background: "rgba(255,255,255,0.08)", margin: "0 2px" }} />
                    {sk.environments?.map((env) => {
                      const e = ENV_ICONS[env]
                      if (!e) return null
                      const Icon = e.icon
                      return <span key={env} title={e.label}><Icon size={12} color={e.color} /></span>
                    })}
                  </div>
                </div>

                {/* Success rate */}
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: rate !== null ? (rate >= 80 ? "#22c55e" : rate >= 50 ? "#eab308" : "#ef4444") : "#475569" }}>
                    {rate !== null ? `${rate}%` : "—"}
                  </div>
                  <div style={{ fontSize: 10, color: "#64748b" }}>success rate</div>
                </div>

                {/* Total uses with hover tooltip */}
                <div style={{ textAlign: "center", position: "relative" }}
                  onMouseEnter={() => setHoveredUses(sk.id)}
                  onMouseLeave={() => setHoveredUses(null)}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{sk.total_uses}</div>
                  <div style={{ fontSize: 10, color: "#64748b" }}>uses</div>
                  {hoveredUses === sk.id && (
                    <div style={{
                      position: "absolute", top: -50, left: "50%", transform: "translateX(-50%)",
                      background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
                      padding: "8px 12px", whiteSpace: "nowrap", zIndex: 10, fontSize: 11,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                    }}>
                      <div style={{ color: "#94a3b8" }}>30d: <strong style={{ color: "#e2e8f0" }}>{sk.uses_30d}</strong> uses</div>
                      <div style={{ color: "#94a3b8" }}>7d: <strong style={{ color: "#e2e8f0" }}>{sk.uses_7d}</strong> uses</div>
                      {sk.top_workflows && sk.top_workflows.map((w) => (
                        <div key={w} style={{ color: "#64748b", marginTop: 2 }}>↳ {w}</div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 7d trend */}
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: sk.uses_7d > 0 ? "#22c55e" : "#475569" }}>{sk.uses_7d}</div>
                  <div style={{ fontSize: 10, color: "#64748b" }}>7d</div>
                </div>

                {/* Toggle */}
                <div onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => onToggle(sk.id, !sk.is_active)} style={{
                    width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer",
                    background: sk.is_active ? "#6366f1" : "rgba(255,255,255,0.1)", position: "relative", transition: "background 0.2s",
                  }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: sk.is_active ? 21 : 3, transition: "left 0.2s" }} />
                  </button>
                </div>
              </div>

              {/* Expanded: Usage Log */}
              {open && <SkillUsageLog skill={sk} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SkillUsageLog({ skill }: { skill: Skill }) {
  const logs = MOCK_USAGE_LOG.filter((l) => l.project === skill.project || skill.name === "fund-returns")

  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", padding: "16px 20px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div>
          <div style={st.label}>Description</div>
          <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>{skill.description}</p>
          <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
            <span style={{ fontSize: 11, color: "#64748b" }}>Last used: <strong style={{ color: "#e2e8f0" }}>{skill.last_used ? new Date(skill.last_used).toLocaleDateString() : "Never"}</strong></span>
            <span style={{ fontSize: 11, color: "#64748b" }}>Scope: <strong style={{ color: "#e2e8f0" }}>{skill.scope}</strong></span>
          </div>
        </div>
        <div>
          <div style={st.label}>Latest Eval</div>
          {skill.latest_eval_score !== null ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 52, height: 52, borderRadius: "50%",
                border: `3px solid ${skill.latest_eval_score >= 80 ? "#22c55e" : skill.latest_eval_score >= 50 ? "#eab308" : "#ef4444"}`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700,
              }}>{Math.round(skill.latest_eval_score)}%</div>
              <div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>{skill.latest_eval_type} eval</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>{skill.latest_eval_date ? new Date(skill.latest_eval_date).toLocaleDateString() : ""}</div>
              </div>
            </div>
          ) : <p style={{ fontSize: 13, color: "#475569", fontStyle: "italic", margin: 0 }}>No evals run yet</p>}
        </div>
      </div>

      {/* Usage log table */}
      <div style={st.label}>Usage Log</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {logs.length === 0 ? (
          <div style={{ fontSize: 12, color: "#475569", padding: 12 }}>No usage entries recorded yet.</div>
        ) : logs.map((log) => (
          <div key={log.id} style={{
            display: "grid", gridTemplateColumns: "130px 80px 70px 1fr",
            gap: 12, padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 6, fontSize: 12, alignItems: "center",
          }}>
            <span style={{ color: "#64748b", fontFamily: "monospace", fontSize: 11 }}>{new Date(log.timestamp).toLocaleString()}</span>
            <span style={{ color: "#94a3b8" }}>{log.project}</span>
            <span style={{
              fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4,
              background: log.outcome === "success" ? "rgba(34,197,94,0.12)" : log.outcome === "partial" ? "rgba(234,179,8,0.12)" : "rgba(239,68,68,0.12)",
              color: log.outcome === "success" ? "#22c55e" : log.outcome === "partial" ? "#eab308" : "#ef4444",
              textAlign: "center",
            }}>
              {log.outcome === "success" ? "✓" : log.outcome === "partial" ? "⚠" : "✗"} {log.outcome}
            </span>
            <span style={{ color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.notes}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAB 2: Marketplace
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function Marketplace({ catalog, loading, installed }: { catalog: CatalogSkill[]; loading: boolean; installed: Skill[] }) {
  const [search, setSearch] = useState("")
  const [sourceFilter, setSourceFilter] = useState("all")
  const [catFilter, setCatFilter] = useState("all")
  const [selectedSkill, setSelectedSkill] = useState<CatalogSkill | null>(null)

  const filtered = catalog.filter((sk) => {
    const ms = !search || sk.name.toLowerCase().includes(search.toLowerCase()) || sk.description.toLowerCase().includes(search.toLowerCase())
    const src = sourceFilter === "all" || sk.source === sourceFilter
    const cat = catFilter === "all" || sk.category === catFilter
    return ms && src && cat
  })

  if (selectedSkill) return <SkillDetail skill={selectedSkill} onBack={() => setSelectedSkill(null)} installed={installed} catalog={catalog} />

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={14} color="#64748b" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search skills..." style={{ ...st.input, paddingLeft: 36 }} />
        </div>
        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} style={{ ...st.input, width: "auto" }}>
          <option value="all">All Sources</option>
          <option value="anthropic">Anthropic</option>
          <option value="community">Community</option>
          <option value="custom">Custom</option>
        </select>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} style={{ ...st.input, width: "auto" }}>
          <option value="all">All Categories</option>
          {Object.keys(CAT_COLORS).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.map((sk) => {
            const cc = CAT_COLORS[sk.category] || "#6b7280"
            return (
              <div key={sk.id} onClick={() => setSelectedSkill(sk)} style={{
                ...st.card, padding: "16px 20px", cursor: "pointer", display: "grid",
                gridTemplateColumns: "1.5fr 1fr 0.5fr 0.5fr 0.3fr",
                alignItems: "center", gap: 16, transition: "border-color 0.15s",
              }}>
                {/* Name + description */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{sk.name}</span>
                    <span style={st.pill(cc)}>{sk.category}</span>
                    <span style={{ fontSize: 10, color: "#64748b" }}>by {sk.author}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "#94a3b8", margin: "4px 0 0", lineHeight: 1.4 }}>{sk.description}</p>
                </div>

                {/* Suggested workflows */}
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {(sk.suggested_workflows || []).slice(0, 2).map((w) => (
                    <span key={w} style={{ fontSize: 10, color: "#a5b4fc", background: "rgba(99,102,241,0.08)", padding: "2px 6px", borderRadius: 4 }}>{w}</span>
                  ))}
                  {(!sk.suggested_workflows || sk.suggested_workflows.length === 0) && (
                    <span style={{ fontSize: 10, color: "#475569", fontStyle: "italic" }}>Click to assess fit</span>
                  )}
                </div>

                {/* 7d success */}
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: sk.success_rate_7d != null ? (sk.success_rate_7d >= 80 ? "#22c55e" : "#eab308") : "#475569" }}>
                    {sk.success_rate_7d != null ? `${sk.success_rate_7d}%` : "—"}
                  </div>
                  <div style={{ fontSize: 10, color: "#64748b" }}>7d success</div>
                </div>

                {/* Lifetime uses */}
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{sk.lifetime_uses || 0}</div>
                  <div style={{ fontSize: 10, color: "#64748b" }}>lifetime</div>
                </div>

                {/* Arrow */}
                <div style={{ textAlign: "right" }}>
                  <ChevronRight size={16} color="#475569" />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Skill Detail Page ────────────────────────────────────────────────────────

function SkillDetail({ skill: initialSkill, onBack, installed, catalog }: { skill: CatalogSkill; onBack: () => void; installed: Skill[]; catalog: CatalogSkill[] }) {
  const [chatOpen, setChatOpen] = useState(false)
  const [workflowInput, setWorkflowInput] = useState("")
  const [workflowResult, setWorkflowResult] = useState<string | null>(null)
  const [assessing, setAssessing] = useState(false)
  const [analysis, setAnalysis] = useState<SkillAnalysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [skillMdContent, setSkillMdContent] = useState<string | undefined>(initialSkill.skill_md_content)
  const [skillMdLoading, setSkillMdLoading] = useState(false)
  const [skillMdError, setSkillMdError] = useState<string | null>(null)

  const isInstalled = installed.some((s) => s.name.toLowerCase().replace(/ /g, "-") === initialSkill.name.toLowerCase().replace(/ /g, "-"))

  // Load cached analysis from localStorage on mount
  useEffect(() => {
    const cacheKey = `skill-analysis-${initialSkill.id}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      try { setAnalysis(JSON.parse(cached)) } catch { /* ignore */ }
    }
  }, [initialSkill.id])

  // Fetch SKILL.md from GitHub for marketplace skills without content
  useEffect(() => {
    if (skillMdContent) return
    if (!initialSkill.source_url || initialSkill.source === "custom") return

    const match = initialSkill.source_url.match(/github\.com\/([^/]+)\/([^/]+)\/(?:tree\/[^/]+\/)?(.+)/)
    if (!match) return

    const [, owner, repo, path] = match
    setSkillMdLoading(true)
    setSkillMdError(null)

    fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}/SKILL.md`, {
      headers: { Accept: "application/vnd.github.v3+json" },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (data.content) {
          setSkillMdContent(atob(data.content))
        } else {
          setSkillMdError("SKILL.md not found in repository")
        }
      })
      .catch(() => {
        setSkillMdError("SKILL.md not available")
      })
      .finally(() => setSkillMdLoading(false))
  }, [initialSkill.source_url, initialSkill.source, skillMdContent])

  async function runAnalysis() {
    setAnalyzing(true)
    try {
      const res = await fetch("/api/skills/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill_md_content: skillMdContent, skill_name: initialSkill.name }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAnalysis(data)
      localStorage.setItem(`skill-analysis-${initialSkill.id}`, JSON.stringify(data))
    } catch {
      setAnalysis({ strengths: ["Analysis failed — try again"], weaknesses: [], amitis_fit: { readiness: "needs_customization", assessment: "Could not complete analysis. Check API configuration." } })
    }
    setAnalyzing(false)
  }

  async function assessWorkflow() {
    if (!workflowInput.trim()) return
    setAssessing(true)
    try {
      const res = await fetch("/api/skills/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillName: initialSkill.name, skillDescription: initialSkill.description, workflow: workflowInput }),
      })
      const data = await res.json()
      setWorkflowResult(data.assessment || "Could not generate assessment.")
    } catch {
      setWorkflowResult("API error — check your Anthropic API key configuration.")
    }
    setAssessing(false)
  }

  const readinessBadge: Record<string, { color: string; label: string }> = {
    ready: { color: "#22c55e", label: "Ready" },
    needs_customization: { color: "#eab308", label: "Needs Customization" },
    not_applicable: { color: "#ef4444", label: "Not Applicable" },
  }

  return (
    <div>
      {/* Back button */}
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontSize: 13, fontWeight: 600, marginBottom: 20, padding: 0 }}>
        <ChevronLeft size={16} /> Back to Marketplace
      </button>

      <div style={{ display: "flex", gap: 20 }}>
        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header */}
          <div style={{ ...st.card, padding: 24, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{initialSkill.name}</h2>
                <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                  <span style={st.pill(CAT_COLORS[initialSkill.category] || "#6b7280")}>{initialSkill.category}</span>
                  <span style={{ fontSize: 12, color: "#64748b" }}>by {initialSkill.author}</span>
                  {initialSkill.source_url && (
                    <a href={initialSkill.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#6366f1", display: "flex", alignItems: "center", gap: 3, textDecoration: "none" }}>
                      <ExternalLink size={11} /> Source
                    </a>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setChatOpen(!chatOpen)} style={st.btn(chatOpen)}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}><MessageSquare size={13} /> Ask Claude</span>
                </button>
                <button style={st.btn(false, isInstalled ? "#22c55e" : "#6366f1")}>
                  {isInstalled ? "✓ Installed" : "Install"}
                </button>
                <button style={st.btn(false, "#f59e0b")}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}><GitFork size={12} /> Fork</span>
                </button>
              </div>
            </div>
            <p style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>{initialSkill.description}</p>

            {/* Compatibility */}
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              {initialSkill.compatibility?.map((c) => {
                const e = ENV_ICONS[c]
                if (!e) return <span key={c} style={st.pill("#6b7280")}>{c}</span>
                const Icon = e.icon
                return <span key={c} style={{ ...st.pill(e.color), display: "flex", alignItems: "center", gap: 4 }}><Icon size={10} /> {e.label}</span>
              })}
            </div>
          </div>

          {/* Metrics row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
            {[
              { label: "Lifetime Uses", value: initialSkill.lifetime_uses || 0, icon: TrendingUp, color: "#6366f1" },
              { label: "7d Success", value: initialSkill.success_rate_7d != null ? `${initialSkill.success_rate_7d}%` : "—", icon: Target, color: "#22c55e" },
              { label: "Stars", value: initialSkill.stars, icon: Star, color: "#f59e0b" },
              { label: "Status", value: isInstalled ? "Installed" : "Available", icon: isInstalled ? CheckCircle2 : Download, color: isInstalled ? "#22c55e" : "#6366f1" },
            ].map((m, i) => {
              const Icon = m.icon
              return (
                <div key={i} style={{ ...st.card, padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
                  <Icon size={16} color={m.color} />
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{m.value}</div>
                    <div style={{ fontSize: 10, color: "#64748b" }}>{m.label}</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Strengths / Weaknesses / Fit — Analyze pattern */}
          {analysis ? (
            <>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                <button onClick={runAnalysis} disabled={analyzing} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 11, padding: 0 }}>
                  <RefreshCw size={10} style={analyzing ? { animation: "spin 1s linear infinite" } : undefined} /> Refresh Analysis
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div style={{ ...st.card, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <Zap size={14} color="#22c55e" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#22c55e" }}>Strengths</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#94a3b8", lineHeight: 1.8 }}>
                    {analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
                <div style={{ ...st.card, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <Shield size={14} color="#eab308" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#eab308" }}>Weaknesses</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#94a3b8", lineHeight: 1.8 }}>
                    {analysis.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
                <div style={{ ...st.card, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <Target size={14} color="#6366f1" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#a5b4fc" }}>Amitis Fit</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.8 }}>
                    <span style={st.pill(readinessBadge[analysis.amitis_fit.readiness]?.color || "#6b7280")}>
                      {readinessBadge[analysis.amitis_fit.readiness]?.label || analysis.amitis_fit.readiness}
                    </span>
                    <p style={{ margin: "8px 0 0" }}>{analysis.amitis_fit.assessment}</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ ...st.card, padding: 24, marginBottom: 16, textAlign: "center" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div style={{ padding: 16, opacity: 0.5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <Zap size={14} color="#22c55e" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#22c55e" }}>Strengths</span>
                  </div>
                  <p style={{ fontSize: 12, color: "#475569", margin: 0, fontStyle: "italic" }}>Not yet analyzed</p>
                </div>
                <div style={{ padding: 16, opacity: 0.5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <Shield size={14} color="#eab308" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#eab308" }}>Weaknesses</span>
                  </div>
                  <p style={{ fontSize: 12, color: "#475569", margin: 0, fontStyle: "italic" }}>Not yet analyzed</p>
                </div>
                <div style={{ padding: 16, opacity: 0.5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <Target size={14} color="#6366f1" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#a5b4fc" }}>Amitis Fit</span>
                  </div>
                  <p style={{ fontSize: 12, color: "#475569", margin: 0, fontStyle: "italic" }}>Not yet analyzed</p>
                </div>
              </div>
              <button onClick={runAnalysis} disabled={analyzing} style={{ ...st.btn(true), padding: "10px 32px" }}>
                {analyzing ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Analyzing...
                  </span>
                ) : "Analyze Skill"}
              </button>
              <p style={{ fontSize: 11, color: "#475569", margin: "8px 0 0" }}>Uses Claude to assess strengths, weaknesses, and fit for Amitis workflows</p>
            </div>
          )}

          {/* Workflow Design Module */}
          <div style={{ ...st.card, padding: 20, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <FileText size={15} color="#a5b4fc" />
              <span style={{ fontSize: 14, fontWeight: 600 }}>Assess for Your Workflow</span>
            </div>
            <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 12px" }}>
              Describe a workflow (process + tech stack + objective) and get an assessment of how this skill would perform, what modifications it needs, and what other skills would complement it.
            </p>
            <textarea
              value={workflowInput}
              onChange={(e) => setWorkflowInput(e.target.value)}
              placeholder={"e.g., Monthly fund reporting workflow:\n- Scan Gmail for fund NAV emails\n- Extract return figures from email body + PDF attachments\n- Update Portfolio Model Excel (NAV_BTC + NAV_USD sheets)\n- Tech: Gmail API, openpyxl, Supabase\n- Objective: Reduce manual data entry from 2 hours to 15 minutes"}
              rows={5}
              style={{ ...st.input, resize: "vertical" as const, fontFamily: "inherit", lineHeight: 1.5 }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={assessWorkflow} disabled={assessing || !workflowInput.trim()} style={st.btn(true)}>
                {assessing ? "Assessing..." : "Assess Fit"}
              </button>
            </div>
            {workflowResult && (
              <div style={{ marginTop: 16, padding: 16, background: "rgba(99,102,241,0.06)", borderRadius: 8, fontSize: 13, color: "#e2e8f0", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                {workflowResult}
              </div>
            )}
          </div>

          {/* SKILL.md content */}
          <div style={{ ...st.card, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Eye size={15} color="#64748b" />
                <span style={{ fontSize: 14, fontWeight: 600 }}>SKILL.md</span>
              </div>
              {initialSkill.source_url && (
                <a href={initialSkill.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#6366f1", display: "flex", alignItems: "center", gap: 3, textDecoration: "none" }}>
                  <ExternalLink size={11} /> View on GitHub
                </a>
              )}
            </div>
            {skillMdLoading ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 24, justifyContent: "center" }}>
                <Loader2 size={16} color="#6366f1" style={{ animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: 12, color: "#64748b" }}>Loading SKILL.md from GitHub...</span>
              </div>
            ) : skillMdError && !skillMdContent ? (
              <div style={{ padding: 24, textAlign: "center" }}>
                <p style={{ fontSize: 12, color: "#475569", margin: 0 }}>{skillMdError}</p>
                {initialSkill.source_url && (
                  <a href={initialSkill.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#6366f1", marginTop: 8, display: "inline-block" }}>
                    View on GitHub →
                  </a>
                )}
              </div>
            ) : (
              <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8 }}>
                <pre style={{ fontSize: 12, color: "#94a3b8", padding: "16px 16px 24px 16px", margin: 0, lineHeight: 1.6, fontFamily: "'Geist Mono', monospace", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{skillMdContent || `# ${initialSkill.name}\n\nNo SKILL.md content available.\nClick "View on GitHub" above to check the source repository.`}</pre>
              </div>
            )}
          </div>
        </div>

        {/* Chat panel */}
        {chatOpen && (
          <div style={{ width: 380, flexShrink: 0, ...st.card, display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 200px)", position: "sticky", top: 20 }}>
            <SkillChat skill={initialSkill} catalog={catalog} installed={installed} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Embedded Claude Chat ─────────────────────────────────────────────────────

function SkillChat({ skill, catalog, installed }: { skill: CatalogSkill; catalog: CatalogSkill[]; installed: Skill[] }) {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: "assistant",
    content: `I'm looking at **${skill.name}**. I can help you:\n\n• Assess how it fits your Amitis workflows\n• Identify what modifications you'd need\n• Compare it with similar skills\n• Draft a customized fork\n\nWhat would you like to know?`,
  }])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // suppress unused vars
  void catalog

  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight) }, [messages])

  const installedCtx = installed.map((sk) => `- ${sk.name} [${sk.health_status}] (${sk.category}): ${sk.description}`).join("\n")

  async function send() {
    if (!input.trim() || streaming) return
    const userMsg: ChatMessage = { role: "user", content: input.trim() }
    setMessages((p) => [...p, userMsg])
    setInput("")
    setStreaming(true)
    try {
      const res = await fetch("/api/skills/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillName: skill.name,
          skillDescription: skill.description,
          installedContext: installedCtx,
          messages: messages.filter((m) => m !== messages[0]).concat(userMsg).map((m) => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json()
      const text = data.content || "Error generating response."
      setMessages((p) => [...p, { role: "assistant", content: text }])
    } catch { setMessages((p) => [...p, { role: "assistant", content: "API error — check configuration." }]) }
    setStreaming(false)
  }

  return (
    <>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 8 }}>
        <Bot size={14} color="#6366f1" />
        <span style={{ fontSize: 13, fontWeight: 600 }}>Skill Advisor</span>
      </div>
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "90%", padding: "10px 14px", borderRadius: 10, background: m.role === "user" ? "#6366f1" : "rgba(255,255,255,0.05)", color: m.role === "user" ? "#fff" : "#e2e8f0", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            {m.content}
          </div>
        ))}
        {streaming && <div style={{ fontSize: 12, color: "#6366f1", padding: 8 }}>Thinking...</div>}
      </div>
      <div style={{ padding: 10, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 8 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Ask about this skill..." style={{ ...st.input, flex: 1 }} />
        <button onClick={send} disabled={streaming} style={{ width: 36, height: 36, borderRadius: 8, border: "none", cursor: "pointer", background: input.trim() ? "#6366f1" : "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Send size={13} color={input.trim() ? "#fff" : "#475569"} />
        </button>
      </div>
    </>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAB 3: Development
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface Submission {
  id: string
  title: string
  description: string
  requested_by: string
  submitted_from: string
  submitted_skill_md: string
  status: string
  rejection_reason?: string
  created_at: string
}

function Development({ proposals, onAdd }: { proposals: Proposal[]; onAdd: (p: Omit<Proposal, "id" | "created_at">) => void }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: "", description: "", business_segment: "operations", target_workflow: "", priority: "medium", requested_by: "Gage", notes: "", status: "proposal" })

  // Submission state
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [rejectedSubmissions, setRejectedSubmissions] = useState<Submission[]>([])
  const [submissionsLoading, setSubmissionsLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [showRejected, setShowRejected] = useState(false)

  useEffect(() => {
    setSubmissionsLoading(true)
    fetch("/api/skills/proposals?type=submission")
      .then((r) => r.json())
      .then((res) => {
        const data: Submission[] = res.proposals || res || []
        const pending = data.filter((s) => s.status === "pending_review")
        const rejected = data.filter((s) => s.status === "rejected")
        setSubmissions(pending)
        setRejectedSubmissions(rejected)
      })
      .catch(() => { setSubmissions([]); setRejectedSubmissions([]) })
      .finally(() => setSubmissionsLoading(false))
  }, [])

  function submit() {
    if (!form.title.trim() || !form.description.trim()) return
    onAdd(form)
    setForm({ title: "", description: "", business_segment: "operations", target_workflow: "", priority: "medium", requested_by: "Gage", notes: "", status: "proposal" })
    setShowForm(false)
  }

  async function approveOne(id: string) {
    setSubmissions((prev) => prev.filter((s) => s.id !== id))
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next })
    try { await fetch("/api/skills/approve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ proposal_id: id }) }) } catch {}
  }

  async function rejectOne(id: string) {
    const item = submissions.find((s) => s.id === id)
    setSubmissions((prev) => prev.filter((s) => s.id !== id))
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next })
    if (item) setRejectedSubmissions((prev) => [{ ...item, status: "rejected", rejection_reason: rejectReason }, ...prev])
    setRejectingId(null)
    setRejectReason("")
    try { await fetch("/api/skills/reject", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ proposal_id: id, reason: rejectReason }) }) } catch {}
  }

  async function bulkApprove() {
    const ids = [...selectedIds]
    setSubmissions((prev) => prev.filter((s) => !selectedIds.has(s.id)))
    setSelectedIds(new Set())
    try { await fetch("/api/skills/bulk-approve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ proposal_ids: ids }) }) } catch {}
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  }

  function toggleSelectAll() {
    if (selectedIds.size === submissions.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(submissions.map((s) => s.id)))
  }

  // Filter proposals to only ideas (type is 'idea' or null/undefined for backwards compat)
  const ideaProposals = proposals.filter((p) => !(p as Proposal & { type?: string }).type || (p as Proposal & { type?: string }).type === "idea")
  const byStatus = (s: string) => ideaProposals.filter((p) => p.status === s)

  return (
    <div>
      {/* ── Section 1: Submissions ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Submissions</h2>
          {submissions.length > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: "rgba(99,102,241,0.2)", color: "#a5b4fc" }}>
              {submissions.length} pending
            </span>
          )}
          <p style={{ fontSize: 12, color: "#64748b", margin: 0, marginLeft: 4 }}>Skills awaiting approval</p>
        </div>

        {submissionsLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <Loader2 size={20} color="#6366f1" style={{ animation: "spin 1s linear infinite" }} />
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : submissions.length === 0 ? (
          <div style={{ ...st.card, padding: 32, textAlign: "center" }}>
            <CheckCircle2 size={28} color="#334155" />
            <p style={{ fontSize: 13, color: "#475569", margin: "10px 0 0" }}>No pending submissions</p>
          </div>
        ) : (
          <>
            {/* Bulk actions bar */}
            <div style={{ ...st.card, padding: "10px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={toggleSelectAll} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
                {selectedIds.size === submissions.length ? <CheckSquare size={16} color="#6366f1" /> : <Square size={16} color="#475569" />}
              </button>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>
                {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
              </span>
              {selectedIds.size > 0 && (
                <button onClick={bulkApprove} style={{ ...st.btn(true, "#22c55e"), padding: "5px 12px", fontSize: 11, marginLeft: "auto" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <CheckCircle2 size={12} /> Approve Selected
                    <span style={{ background: "rgba(255,255,255,0.2)", borderRadius: 4, padding: "1px 5px", fontSize: 10 }}>{selectedIds.size}</span>
                  </span>
                </button>
              )}
            </div>

            {/* Submission cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {submissions.map((s) => (
                <div key={s.id} style={{ ...st.card, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <button onClick={() => toggleSelect(s.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 2, display: "flex" }}>
                      {selectedIds.has(s.id) ? <CheckSquare size={16} color="#6366f1" /> : <Square size={16} color="#475569" />}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{s.title}</span>
                        <span style={{ fontSize: 10, color: "#94a3b8" }}>by {s.requested_by}</span>
                        <span style={st.pill("#6366f1")}>{s.submitted_from}</span>
                        <span style={{ fontSize: 10, color: "#475569" }}>{new Date(s.created_at).toLocaleDateString()}</span>
                      </div>
                      <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 10px", lineHeight: 1.5 }}>
                        {s.description.slice(0, 120)}{s.description.length > 120 ? "..." : ""}
                      </p>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <button onClick={() => setPreviewId(previewId === s.id ? null : s.id)} style={{ ...st.btn(previewId === s.id, "#6366f1"), padding: "5px 12px", fontSize: 11 }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Eye size={12} /> {previewId === s.id ? "Hide Preview" : "Preview"}</span>
                        </button>
                        <button onClick={() => approveOne(s.id)} style={{ ...st.btn(true, "#22c55e"), padding: "5px 12px", fontSize: 11 }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><CheckCircle2 size={12} /> Approve</span>
                        </button>
                        {rejectingId === s.id ? (
                          <div style={{ display: "flex", gap: 6, alignItems: "center", flex: 1 }}>
                            <input
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="Rejection reason..."
                              style={{ ...st.input, padding: "5px 10px", fontSize: 11, flex: 1 }}
                              onKeyDown={(e) => { if (e.key === "Enter") rejectOne(s.id); if (e.key === "Escape") { setRejectingId(null); setRejectReason("") } }}
                              autoFocus
                            />
                            <button onClick={() => rejectOne(s.id)} style={{ ...st.btn(true, "#ef4444"), padding: "5px 12px", fontSize: 11 }}>
                              Confirm
                            </button>
                            <button onClick={() => { setRejectingId(null); setRejectReason("") }} style={{ ...st.btn(false, "#6b7280"), padding: "5px 10px", fontSize: 11 }}>
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setRejectingId(s.id)} style={{ ...st.btn(false, "#ef4444"), padding: "5px 12px", fontSize: 11 }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><XCircle size={12} /> Reject</span>
                          </button>
                        )}
                      </div>
                      {/* Preview panel */}
                      {previewId === s.id && s.submitted_skill_md && (
                        <div style={{
                          marginTop: 12, padding: 16, borderRadius: 8,
                          background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)",
                          fontFamily: "'Geist Mono', monospace", fontSize: 12, color: "#c9d1d9",
                          whiteSpace: "pre-wrap", lineHeight: 1.6, maxHeight: 400, overflowY: "auto" as const,
                        }}>
                          {s.submitted_skill_md}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Rejected section */}
        {rejectedSubmissions.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <button
              onClick={() => setShowRejected(!showRejected)}
              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: 0, color: "#64748b", fontSize: 12 }}
            >
              {showRejected ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              Show rejected ({rejectedSubmissions.length})
            </button>
            {showRejected && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                {rejectedSubmissions.map((s) => (
                  <div key={s.id} style={{ ...st.card, padding: 14, opacity: 0.5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <XCircle size={14} color="#ef4444" />
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8" }}>{s.title}</span>
                      <span style={{ fontSize: 10, color: "#475569" }}>by {s.requested_by}</span>
                      <span style={st.pill("#ef4444")}>rejected</span>
                    </div>
                    {s.rejection_reason && (
                      <p style={{ fontSize: 11, color: "#64748b", margin: "4px 0 0", paddingLeft: 22 }}>
                        Reason: {s.rejection_reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Section 2: Proposals (Ideas) ── */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Skill Development Pipeline</h2>
            <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0" }}>Submit proposals, track development progress</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} style={st.btn(true)}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>{showForm ? <X size={13} /> : <Plus size={13} />} {showForm ? "Cancel" : "Submit Proposal"}</span>
          </button>
        </div>

        {/* Proposal form */}
        {showForm && (
          <div style={{ ...st.card, padding: 24, marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 16px" }}>New Skill Proposal</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={st.label}>Title</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Email Return Extractor" style={st.input} />
              </div>
              <div>
                <label style={st.label}>Requested By</label>
                <input value={form.requested_by} onChange={(e) => setForm({ ...form, requested_by: e.target.value })} style={st.input} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={st.label}>Describe the workflow this skill should handle</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} placeholder="What should this skill do? What inputs does it take? What output do you expect? Be specific about the workflow." style={{ ...st.input, resize: "vertical" as const, fontFamily: "inherit" }} />
              </div>
              <div>
                <label style={st.label}>Business Segment</label>
                <select value={form.business_segment} onChange={(e) => setForm({ ...form, business_segment: e.target.value })} style={st.input}>
                  <option value="fund_reporting">Fund Reporting</option>
                  <option value="marketing">Marketing</option>
                  <option value="biz_dev">Biz Dev / Cap Raising</option>
                  <option value="research">Research</option>
                  <option value="operations">Operations</option>
                  <option value="acio">ACIO</option>
                </select>
              </div>
              <div>
                <label style={st.label}>Priority</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} style={st.input}>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={st.label}>Target Workflow (optional)</label>
                <input value={form.target_workflow} onChange={(e) => setForm({ ...form, target_workflow: e.target.value })} placeholder="e.g., Monthly Fund Reporting, X Post Scheduling" style={st.input} />
              </div>
            </div>
            <button onClick={submit} style={{ ...st.btn(true), marginTop: 16 }}>Submit Proposal</button>
          </div>
        )}

        {/* Pipeline columns */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {["proposal", "drafting", "testing", "ready"].map((status) => {
            const items = byStatus(status)
            const sc = STATUS_COLORS[status] || STATUS_COLORS.proposal
            return (
              <div key={status}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ ...st.pill(sc.text), background: sc.bg }}>{status}</span>
                  <span style={{ fontSize: 11, color: "#475569" }}>{items.length}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, minHeight: 100 }}>
                  {items.map((p) => (
                    <div key={p.id} style={{ ...st.card, padding: 14 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{p.title}</div>
                      <p style={{ fontSize: 11, color: "#94a3b8", margin: "0 0 8px", lineHeight: 1.5 }}>{p.description.slice(0, 120)}{p.description.length > 120 ? "..." : ""}</p>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span style={st.pill("#6366f1")}>{p.business_segment}</span>
                        <span style={st.pill(p.priority === "high" ? "#ef4444" : p.priority === "medium" ? "#eab308" : "#6b7280")}>{p.priority}</span>
                      </div>
                      <div style={{ fontSize: 10, color: "#475569", marginTop: 6 }}>by {p.requested_by} · {new Date(p.created_at).toLocaleDateString()}</div>
                    </div>
                  ))}
                  {items.length === 0 && <div style={{ fontSize: 11, color: "#334155", padding: 20, textAlign: "center" }}>Empty</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAB 4: Eval History
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function EvalHistory({ evals }: { evals: EvalResult[] }) {
  const [skillFilter, setSkillFilter] = useState("all")
  const names = [...new Set(evals.map((e) => e.skill_name))]
  const filtered = evals.filter((e) => skillFilter === "all" || e.skill_name === skillFilter)

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Evaluation History</h2>
          <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0" }}>Results from skill-creator evals in Claude Code. Quick evals from dashboard coming soon.</p>
        </div>
        <select value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)} style={st.input}>
          <option value="all">All Skills</option>
          {names.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <FlaskConical size={40} color="#1e293b" />
          <p style={{ fontSize: 14, color: "#475569", margin: "16px 0 0" }}>No evals recorded yet.</p>
          <p style={{ fontSize: 12, color: "#334155", margin: "8px 0 0" }}>Run evals in Claude Code with the skill-creator, then results flow here.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((ev) => {
            const sc = ev.score >= 80 ? "#22c55e" : ev.score >= 50 ? "#eab308" : "#ef4444"
            return (
              <div key={ev.id} style={{
                ...st.card, padding: "14px 20px", display: "grid",
                gridTemplateColumns: "1fr 0.5fr 80px 80px 1fr", alignItems: "center", gap: 16,
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{ev.skill_name}</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                    {new Date(ev.created_at).toLocaleDateString()} · {ev.source}
                    {ev.iteration && <span> · iteration {ev.iteration}</span>}
                  </div>
                </div>
                <span style={st.pill("#64748b")}>{ev.eval_type}</span>
                <div style={{ fontSize: 20, fontWeight: 700, color: sc, textAlign: "center" }}>{Math.round(ev.score)}%</div>
                <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center" }}>{ev.passed_checks}/{ev.total_checks}</div>
                <div style={{ fontSize: 12, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.notes || "—"}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Shared ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
      <Loader2 size={24} color="#6366f1" style={{ animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_SKILLS: Skill[] = [
  { id: "1", name: "fund-returns", description: "Scans Gmail for fund return emails, extracts return data, and updates Portfolio Model Excel files with MTD estimates or EOM numbers.", project: "cowork", scope: "general", environments: ["cowork"], is_active: true, category: "workflow", total_uses: 47, uses_7d: 5, uses_30d: 18, last_used: "2026-03-24T14:30:00Z", success_count: 42, failure_count: 5, health_status: "green", latest_eval_score: 84, latest_eval_type: "functional", latest_eval_date: "2026-03-20T10:00:00Z", top_workflows: ["Fund Reporting"] },
  { id: "2", name: "learning-log", description: "Captures technical concepts explained during work sessions to the learning_log Supabase table.", project: "claude-code", scope: "general", environments: ["claude-code"], is_active: true, category: "data", total_uses: 23, uses_7d: 2, uses_30d: 8, last_used: "2026-03-23T16:00:00Z", success_count: 21, failure_count: 2, health_status: "green", latest_eval_score: null, latest_eval_type: null, latest_eval_date: null, top_workflows: ["Enablement"] },
  { id: "3", name: "project-docs-updater", description: "Generates CLAUDE.md update blocks when meaningful architecture changes happen.", project: "claude-code", scope: "general", environments: ["claude-code"], is_active: true, category: "workflow", total_uses: 12, uses_7d: 0, uses_30d: 3, last_used: "2026-03-15T09:00:00Z", success_count: 11, failure_count: 1, health_status: "yellow", latest_eval_score: null, latest_eval_type: null, latest_eval_date: null, top_workflows: ["Dashboard Dev"] },
  { id: "4", name: "skill-analytics", description: "Logs skill usage events and reports on usage stats via skills and skill_usage tables.", project: "claude-ai", scope: "general", environments: ["claude-ai", "claude-code"], is_active: true, category: "data", total_uses: 34, uses_7d: 4, uses_30d: 15, last_used: "2026-03-24T11:00:00Z", success_count: 32, failure_count: 2, health_status: "green", latest_eval_score: 72, latest_eval_type: "trigger", latest_eval_date: "2026-03-18T08:00:00Z", top_workflows: ["Operations"] },
  { id: "5", name: "skill-creator", description: "Create new skills, modify and improve existing skills, and measure skill performance.", project: "claude-ai", scope: "general", environments: ["claude-ai", "claude-code"], is_active: true, category: "workflow", total_uses: 8, uses_7d: 1, uses_30d: 4, last_used: "2026-03-22T13:00:00Z", success_count: 7, failure_count: 1, health_status: "green", latest_eval_score: null, latest_eval_type: null, latest_eval_date: null, top_workflows: ["Skill Development"] },
  { id: "6", name: "docx", description: "Create, read, edit, or manipulate Word documents.", project: "claude-ai", scope: "general", environments: ["claude-ai"], is_active: true, category: "document", total_uses: 15, uses_7d: 0, uses_30d: 2, last_used: "2026-03-10T15:00:00Z", success_count: 15, failure_count: 0, health_status: "yellow", latest_eval_score: null, latest_eval_type: null, latest_eval_date: null, top_workflows: ["Marketing", "Investor Relations"] },
  { id: "7", name: "frontend-design", description: "Create distinctive, production-grade frontend interfaces with high design quality.", project: "claude-ai", scope: "general", environments: ["claude-ai"], is_active: true, category: "creative", total_uses: 19, uses_7d: 3, uses_30d: 10, last_used: "2026-03-24T09:00:00Z", success_count: 18, failure_count: 1, health_status: "green", latest_eval_score: 91, latest_eval_type: "functional", latest_eval_date: "2026-03-22T14:00:00Z", top_workflows: ["Dashboard Dev"] },
  { id: "8", name: "pdf", description: "PDF processing — read, merge, split, create, fill forms.", project: "claude-ai", scope: "general", environments: ["claude-ai"], is_active: false, category: "document", total_uses: 3, uses_7d: 0, uses_30d: 0, last_used: "2026-02-15T12:00:00Z", success_count: 3, failure_count: 0, health_status: "disabled", latest_eval_score: null, latest_eval_type: null, latest_eval_date: null, top_workflows: [] },
  { id: "9", name: "pptx", description: "PowerPoint presentation creation and editing.", project: "claude-ai", scope: "general", environments: ["claude-ai"], is_active: true, category: "document", total_uses: 6, uses_7d: 0, uses_30d: 1, last_used: "2026-03-05T10:00:00Z", success_count: 5, failure_count: 1, health_status: "yellow", latest_eval_score: null, latest_eval_type: null, latest_eval_date: null, top_workflows: ["Marketing"] },
  { id: "10", name: "xlsx", description: "Spreadsheet creation and editing.", project: "claude-ai", scope: "general", environments: ["claude-ai"], is_active: true, category: "document", total_uses: 11, uses_7d: 1, uses_30d: 4, last_used: "2026-03-21T16:00:00Z", success_count: 10, failure_count: 1, health_status: "green", latest_eval_score: null, latest_eval_type: null, latest_eval_date: null, top_workflows: ["Fund Reporting", "Operations"] },
  { id: "11", name: "file-reading", description: "Router for reading uploaded files by type.", project: "claude-ai", scope: "general", environments: ["claude-ai"], is_active: true, category: "document", total_uses: 28, uses_7d: 3, uses_30d: 12, last_used: "2026-03-24T08:00:00Z", success_count: 27, failure_count: 1, health_status: "green", latest_eval_score: null, latest_eval_type: null, latest_eval_date: null, top_workflows: ["Operations"] },
]

const MOCK_USAGE_LOG: UsageEntry[] = [
  { id: "u1", timestamp: "2026-03-24T14:30:00Z", project: "cowork", platform: "cowork", outcome: "success", notes: "Extracted Monarq BTC Feb return from email, updated Portfolio Model NAV_BTC sheet" },
  { id: "u2", timestamp: "2026-03-24T09:15:00Z", project: "cowork", platform: "cowork", outcome: "success", notes: "Processed M1 Capital A1 EOM email, confidence level 2, wrote to fund_returns table" },
  { id: "u3", timestamp: "2026-03-22T11:00:00Z", project: "cowork", platform: "cowork", outcome: "partial", notes: "Parsed Eltican PDF but couldn't match share class — fell back to manual entry" },
  { id: "u4", timestamp: "2026-03-21T16:45:00Z", project: "cowork", platform: "cowork", outcome: "success", notes: "Wincent BTC MTD update extracted from email body, confidence 1" },
  { id: "u5", timestamp: "2026-03-20T10:00:00Z", project: "cowork", platform: "cowork", outcome: "failure", notes: "Grandline Telegram message format not recognized — extraction failed" },
  { id: "u6", timestamp: "2026-03-19T14:20:00Z", project: "cowork", platform: "cowork", outcome: "success", notes: "Batch processed 3 fund EOM emails, all written to Supabase with confidence 2" },
]

const MOCK_CATALOG: CatalogSkill[] = [
  { id: "c1", name: "fund-returns", description: "Scans Gmail for fund return emails, extracts return data, and updates Portfolio Model Excel files with MTD estimates or EOM numbers.", author: "Gage", source: "custom", source_url: "", category: "workflow", compatibility: ["cowork"], install_status: "installed", stars: 0, suggested_workflows: ["Fund Reporting"], success_rate_7d: 84, lifetime_uses: 47, skill_md_content: "---\nname: fund-returns\ndescription: Scans Gmail for fund return emails, extracts return data, and updates the Portfolio Model Excel files.\n---\n\n# Fund Returns\n\nThis skill monitors Gmail for incoming fund return reports and extracts the key data points:\n- MTD estimates (confidence 1)\n- EOM numbers (confidence 2)\n- Investor statement figures (confidence 3)\n\n## Inputs\n- Gmail inbox — scans for emails matching fund name patterns\n- PDF attachments — extracts tables from monthly statements\n- Telegram messages (Grandline only)\n\n## Outputs\n- Writes to `fund_returns` Supabase table with extracted values\n- Updates Portfolio Model Excel (NAV_BTC + NAV_USD sheets) via openpyxl\n- Logs extraction confidence and source metadata\n\n## Configuration\n- Fund name mappings defined in `funds` table\n- Share class matching uses fuzzy logic with manual fallback\n- Duplicate detection: skips if same fund+month+confidence already exists\n\n## Known Limitations\n- Grandline Telegram format not yet supported\n- Some PDF layouts (Eltican) require manual share class selection\n- Does not handle gross-to-net conversion automatically" },
  { id: "c5", name: "learning-log", description: "Captures technical concepts explained during work sessions to the learning_log Supabase table.", author: "Gage", source: "custom", source_url: "", category: "data", compatibility: ["claude-code"], install_status: "installed", stars: 0, suggested_workflows: ["Enablement"], success_rate_7d: null, lifetime_uses: 23, skill_md_content: "---\nname: learning-log\ndescription: Captures technical concepts that are explained to Gage during dashboard work, architecture discussions, or any technical conversation.\n---\n\n# Learning Log Skill\n\nYou are helping Gage build a personal technical reference from real conversations. When a technical concept comes up that needs explaining, log it so he can review it later in the enablement section of his dashboard.\n\n## When to Log\n\n- Gage asks what something means (e.g. \"what is PK and FK?\")\n- Gage says he's confused by something\n- Claude has to explain a technical term or concept to make the conversation work\n- Gage explicitly asks to log something\n\n## What to Log\n\nEach entry has four fields:\n\n1. **concept** — Short name of the thing (e.g. \"Primary key (PK)\")\n2. **explanation** — Plain-English explanation, written for Gage specifically. No jargon. 2-4 sentences. Use analogies from finance/investing where possible.\n3. **context** — Where it came up (e.g. \"Supabase schema design for fund returns\")\n4. **category** — One of: \"databases\", \"api\", \"infrastructure\", \"frontend\", \"ai\", \"devops\", \"general\"\n\n## How to Log\n\nInsert directly to Supabase:\n```sql\ninsert into learning_log (concept, explanation, context, category)\nvalues ('Primary key (PK)', 'A unique identifier for each row...', 'Supabase schema design', 'databases');\n```\n\n## Querying Past Entries\n\n- \"What did I learn about databases?\" → Query by category\n- \"What was that thing about foreign keys?\" → Query by concept name\n- \"Show me my learning log\" → Show recent entries\n\n## Interaction Style\n\n- After explaining a technical concept, ask: \"Want me to add this to your learning log?\"\n- Don't over-log — only concepts that were genuinely new or confusing" },
  { id: "c6", name: "skill-analytics", description: "Logs skill usage events and reports on usage stats via skills and skill_usage tables.", author: "Gage", source: "custom", source_url: "", category: "data", compatibility: ["claude-ai", "claude-code"], install_status: "installed", stars: 0, suggested_workflows: ["Operations"], success_rate_7d: null, lifetime_uses: 34, skill_md_content: "---\nname: skill-analytics\ndescription: Tracks and reports on skill usage across all projects (Cowork, Claude Code, Claude.ai).\n---\n\n# Skill Analytics Skill\n\nYou help Gage track how often his skills are used, where they're used, and whether they succeed. This data feeds the skill analytics section of the master dashboard.\n\n## Two Modes\n\n### Mode 1: Log a skill usage event\nAfter any skill runs (including this one), log the usage to Supabase.\n\n**When to log:**\n- After the fund-returns skill processes returns\n- After the learning-log skill captures a concept\n- After the claude-md-updater produces an update block\n- After any other skill completes work\n\n**How to log:**\n```sql\ninsert into skill_usage (skill_id, project, trigger_phrase, outcome, notes)\nvalues ('<skill_id>', 'cowork', 'check for new fund returns', 'success', 'Processed 5 fund returns');\n```\n\n### Mode 2: Report on skill usage\nQuery the `skill_usage_summary` view:\n```sql\nselect * from skill_usage_summary order by total_uses desc;\n```\n\n### Presenting Stats\n- Lead with the top 3 most-used skills\n- Show usage trend (up or down vs last period)\n- Flag any skills with high failure rates\n- Note skills that haven't been used in 30+ days" },
  { id: "c7", name: "frontend-design", description: "Create distinctive, production-grade frontend interfaces with high design quality.", author: "Anthropic", source: "anthropic", source_url: "", category: "creative", compatibility: ["claude-ai"], install_status: "installed", stars: 0, suggested_workflows: ["Dashboard Dev"], success_rate_7d: null, lifetime_uses: 19, skill_md_content: "---\nname: frontend-design\ndescription: Create distinctive, production-grade frontend interfaces with high design quality.\n---\n\nThis skill guides creation of distinctive, production-grade frontend interfaces that avoid generic \"AI slop\" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.\n\n## Design Thinking\n\nBefore coding, understand the context and commit to a BOLD aesthetic direction:\n- **Purpose**: What problem does this interface solve? Who uses it?\n- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc.\n- **Constraints**: Technical requirements (framework, performance, accessibility).\n- **Differentiation**: What makes this UNFORGETTABLE?\n\n## Frontend Aesthetics Guidelines\n\nFocus on:\n- **Typography**: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter.\n- **Color & Theme**: Commit to a cohesive aesthetic. Use CSS variables for consistency.\n- **Motion**: Use animations for effects and micro-interactions. Focus on high-impact moments.\n- **Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements.\n- **Backgrounds & Visual Details**: Create atmosphere and depth rather than defaulting to solid colors.\n\nNEVER use generic AI-generated aesthetics like overused font families, cliched color schemes, or cookie-cutter design that lacks context-specific character." },
  { id: "c2", name: "X Post Scheduler", description: "Takes CIO Slack posts and formats them for X with staggered scheduling and character limit compliance", author: "Gage", source: "custom", source_url: "", category: "workflow", compatibility: ["cowork"], install_status: "available", stars: 0, suggested_workflows: ["Marketing", "Social Media"], success_rate_7d: null, lifetime_uses: 0 },
  { id: "c3", name: "Investment Memo Drafter", description: "Generates ACIO investment memo drafts from deal notes, email threads, and research materials", author: "Gage", source: "custom", source_url: "", category: "document", compatibility: ["claude-ai", "cowork"], install_status: "available", stars: 0, suggested_workflows: ["ACIO", "Research"], success_rate_7d: null, lifetime_uses: 0 },
  { id: "c4", name: "One-Pager Generator", description: "Creates fund performance one-pagers from Portfolio Model data with branded templates", author: "Gage", source: "custom", source_url: "", category: "document", compatibility: ["claude-ai", "cowork"], install_status: "available", stars: 0, suggested_workflows: ["Investor Relations", "Marketing"], success_rate_7d: null, lifetime_uses: 0 },
]

const MOCK_EVALS: EvalResult[] = [
  { id: "e1", skill_name: "fund-returns", eval_type: "functional", score: 84, total_checks: 5, passed_checks: 4, notes: "Missed edge case: Grandline Telegram format not parsed", source: "claude-code", created_at: "2026-03-20T10:00:00Z", iteration: 3 },
  { id: "e2", skill_name: "frontend-design", eval_type: "functional", score: 91, total_checks: 8, passed_checks: 7, notes: "One test had generic Inter font fallback", source: "claude-code", created_at: "2026-03-22T14:00:00Z", iteration: 2 },
  { id: "e3", skill_name: "skill-analytics", eval_type: "trigger", score: 72, total_checks: 10, passed_checks: 7, notes: "Doesn't trigger on casual mentions like 'which skills do I use'", source: "claude-code", created_at: "2026-03-18T08:00:00Z", iteration: 1 },
  { id: "e4", skill_name: "fund-returns", eval_type: "trigger", score: 78, total_checks: 12, passed_checks: 9, notes: "Missed: 'check if any funds reported' phrasing", source: "claude-code", created_at: "2026-03-15T11:00:00Z", iteration: 1 },
  { id: "e5", skill_name: "fund-returns", eval_type: "functional", score: 67, total_checks: 5, passed_checks: 3, notes: "Pre-improvement baseline — PDF extraction failing on 2 funds", source: "claude-code", created_at: "2026-03-10T09:00:00Z", iteration: 1 },
]

const MOCK_PROPOSALS: Proposal[] = [
  { id: "p1", title: "Mailchimp Newsletter Builder", description: "Takes one-pager content and CIO market write-up, formats into Mailchimp email templates. Handles both performance newsletter and market newsletter formats.", requested_by: "Gage", business_segment: "marketing", target_workflow: "Monthly Newsletter Pipeline", priority: "high", status: "proposal", notes: "", created_at: "2026-03-24T10:00:00Z" },
  { id: "p2", title: "Attio Prospect Matcher", description: "When new fund performance data or market themes emerge, cross-reference with prospect interest profiles in Attio CRM and suggest outreach opportunities.", requested_by: "Gage", business_segment: "biz_dev", target_workflow: "Cap Raising", priority: "medium", status: "proposal", notes: "", created_at: "2026-03-23T14:00:00Z" },
  { id: "p3", title: "Deal Email Monitor", description: "Scan Gmail for ACIO-related deal flow emails, extract key details (company, sector, stage, ask), and create/update entries in the acio_deals Supabase table.", requested_by: "Gage", business_segment: "acio", target_workflow: "ACIO Deal Pipeline", priority: "medium", status: "drafting", notes: "Initial SKILL.md draft in progress", created_at: "2026-03-20T09:00:00Z" },
]

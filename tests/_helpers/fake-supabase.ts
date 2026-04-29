/**
 * Tiny in-memory fake of the subset of `@supabase/supabase-js` PostgREST query
 * builder that OIG actually uses. It's intentionally narrow — enough to round-
 * trip the queries in `_shared/db.ts` and `_shared/persistence.ts` without
 * pulling in an actual Postgres.
 *
 * Supports: select, insert, update, delete, upsert, eq, in, ilike, lt, lte,
 * not(col, "in", "(a,b)"), maybeSingle, single, order, limit, select(...).
 *
 * Stores rows by table name. New rows get a `gen_random_uuid()`-shaped id.
 */
import { randomUUID } from "node:crypto"

type Row = Record<string, unknown>

interface Filter {
  kind: "eq" | "in" | "ilike" | "lt" | "lte" | "not_in"
  column: string
  value: unknown
}

interface QueryState {
  table: string
  op: "select" | "insert" | "update" | "delete" | "upsert"
  filters: Filter[]
  payload?: Row | Row[]
  selectColumns?: string
  orderBys: { column: string; ascending: boolean }[]
  limitN: number | null
  upsertOnConflict?: string
}

function matches(row: Row, filters: Filter[]): boolean {
  for (const f of filters) {
    const v = row[f.column]
    switch (f.kind) {
      case "eq":
        if (v !== f.value) return false
        break
      case "in": {
        const arr = f.value as unknown[]
        if (!arr.includes(v)) return false
        break
      }
      case "not_in": {
        const arr = f.value as unknown[]
        if (arr.includes(v)) return false
        break
      }
      case "ilike": {
        if (typeof v !== "string") return false
        const pat = String(f.value).toLowerCase()
        if (v.toLowerCase() !== pat.replace(/%/g, "")) return false
        break
      }
      case "lt":
        if (!(typeof v === "string" || typeof v === "number")) return false
        if (!(v < (f.value as string | number))) return false
        break
      case "lte":
        if (!(typeof v === "string" || typeof v === "number")) return false
        if (!(v <= (f.value as string | number))) return false
        break
    }
  }
  return true
}

class QueryBuilder implements PromiseLike<{ data: unknown; error: { message: string } | null }> {
  private state: QueryState
  constructor(
    private store: Map<string, Row[]>,
    table: string,
  ) {
    this.state = {
      table,
      op: "select",
      filters: [],
      orderBys: [],
      limitN: null,
    }
  }

  select(columns?: string): this {
    if (this.state.op !== "insert" && this.state.op !== "update" && this.state.op !== "upsert") {
      this.state.op = "select"
    }
    this.state.selectColumns = columns ?? "*"
    return this
  }
  insert(payload: Row | Row[]): this {
    this.state.op = "insert"
    this.state.payload = payload
    return this
  }
  update(payload: Row): this {
    this.state.op = "update"
    this.state.payload = payload
    return this
  }
  upsert(payload: Row | Row[], opts?: { onConflict?: string }): this {
    this.state.op = "upsert"
    this.state.payload = payload
    this.state.upsertOnConflict = opts?.onConflict
    return this
  }
  delete(): this {
    this.state.op = "delete"
    return this
  }
  eq(column: string, value: unknown): this {
    this.state.filters.push({ kind: "eq", column, value })
    return this
  }
  in(column: string, value: unknown[]): this {
    this.state.filters.push({ kind: "in", column, value })
    return this
  }
  ilike(column: string, value: string): this {
    this.state.filters.push({ kind: "ilike", column, value })
    return this
  }
  lt(column: string, value: unknown): this {
    this.state.filters.push({ kind: "lt", column, value })
    return this
  }
  lte(column: string, value: unknown): this {
    this.state.filters.push({ kind: "lte", column, value })
    return this
  }
  not(column: string, op: string, value: unknown): this {
    if (op === "in") {
      // Supabase passes "in" with a string like "(a,b)"; parse leniently.
      const arr = String(value).replace(/[()]/g, "").split(",").map((s) => s.trim())
      this.state.filters.push({ kind: "not_in", column, value: arr })
    }
    return this
  }
  order(column: string, opts?: { ascending?: boolean; nullsFirst?: boolean }): this {
    this.state.orderBys.push({
      column,
      ascending: opts?.ascending ?? true,
    })
    return this
  }
  limit(n: number): this {
    this.state.limitN = n
    return this
  }

  private rows(): Row[] {
    return this.store.get(this.state.table) ?? []
  }
  private setRows(next: Row[]): void {
    this.store.set(this.state.table, next)
  }

  private execute(): { data: unknown; error: { message: string } | null } {
    const rows = this.rows()
    switch (this.state.op) {
      case "select": {
        let out = rows.filter((r) => matches(r, this.state.filters))
        for (const ob of this.state.orderBys) {
          out = [...out].sort((a, b) => {
            const av = a[ob.column] as string | number | null | undefined
            const bv = b[ob.column] as string | number | null | undefined
            if (av == null && bv == null) return 0
            if (av == null) return 1
            if (bv == null) return -1
            if (av < bv) return ob.ascending ? -1 : 1
            if (av > bv) return ob.ascending ? 1 : -1
            return 0
          })
        }
        if (this.state.limitN != null) out = out.slice(0, this.state.limitN)
        // Embedded relation handling (very narrow): supports the
        // `action_items!inner(...)` pattern used by findOpenActionItemsByThread.
        // We attach matching action_items by interaction_id and drop parent
        // rows that have no children (the `!inner` semantic).
        const cols = this.state.selectColumns ?? ""
        if (this.state.table === "interactions" && /action_items!inner/.test(cols)) {
          const ais = this.store.get("action_items") ?? []
          out = out
            .map((r) => ({
              ...r,
              action_items: ais.filter((a) => a.interaction_id === r.id),
            }))
            .filter((r) => (r.action_items as unknown[]).length > 0)
        }
        return { data: out, error: null }
      }
      case "insert": {
        const payloads = Array.isArray(this.state.payload)
          ? this.state.payload
          : [this.state.payload as Row]
        const inserted = payloads.map((p) => ({
          id: randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...p,
        }))
        this.setRows([...rows, ...inserted])
        return { data: inserted, error: null }
      }
      case "update": {
        const next = rows.map((r) => {
          if (matches(r, this.state.filters)) {
            return { ...r, ...(this.state.payload as Row), updated_at: new Date().toISOString() }
          }
          return r
        })
        this.setRows(next)
        return { data: next.filter((r) => matches(r, this.state.filters)), error: null }
      }
      case "delete": {
        const remaining: Row[] = []
        const removed: Row[] = []
        for (const r of rows) {
          if (matches(r, this.state.filters)) removed.push(r)
          else remaining.push(r)
        }
        this.setRows(remaining)
        return { data: removed, error: null }
      }
      case "upsert": {
        const payloads = Array.isArray(this.state.payload)
          ? this.state.payload
          : [this.state.payload as Row]
        const conflict = (this.state.upsertOnConflict ?? "id").split(",").map((s) => s.trim())
        let next = [...rows]
        for (const p of payloads) {
          const idx = next.findIndex((r) => conflict.every((c) => r[c] === p[c]))
          if (idx >= 0) {
            next[idx] = { ...next[idx], ...p, updated_at: new Date().toISOString() }
          } else {
            next = [
              ...next,
              {
                id: randomUUID(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                ...p,
              },
            ]
          }
        }
        this.setRows(next)
        return { data: payloads, error: null }
      }
    }
  }

  async maybeSingle(): Promise<{ data: Row | null; error: { message: string } | null }> {
    const r = this.execute()
    if (r.error) return { data: null, error: r.error }
    const arr = (r.data as Row[]) ?? []
    return { data: arr[0] ?? null, error: null }
  }
  async single(): Promise<{ data: Row | null; error: { message: string } | null }> {
    const r = this.execute()
    if (r.error) return { data: null, error: r.error }
    const arr = (r.data as Row[]) ?? []
    if (arr.length === 0) return { data: null, error: { message: "no row" } }
    return { data: arr[0], error: null }
  }
  // Default thenable: resolve to {data, error} with array results.
  then<TResult1 = { data: unknown; error: { message: string } | null }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: unknown; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled ?? undefined, onrejected ?? undefined)
  }
}

export interface FakeSupabase {
  from: (table: string) => QueryBuilder
  __store: Map<string, Row[]>
  __reset: () => void
  __seed: (table: string, rows: Row[]) => void
}

export function createFakeSupabase(): FakeSupabase {
  const store = new Map<string, Row[]>()
  return {
    from: (table: string) => new QueryBuilder(store, table),
    __store: store,
    __reset: () => store.clear(),
    __seed: (table, rows) => store.set(table, [...rows]),
  }
}

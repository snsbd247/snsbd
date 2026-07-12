/**
 * Supabase-compatible query builder shim.
 *
 * - In Supabase mode (Lovable preview): passes through to the real supabase client.
 * - In Laravel mode (VITE_API_BASE_URL set, VPS/cPanel): translates the
 *   builder chain into a POST /api/db/query call that Laravel's DbController
 *   fulfils against MySQL.
 *
 * Supports the patterns used across this project:
 *   select(cols, { count, head }), insert, update, delete, upsert(onConflict)
 *   eq, neq, gt/gte/lt/lte, in, is, like, ilike, order, limit, range,
 *   single, maybeSingle, nested joins ("*, profiles(full_name, email)").
 */
import { supabase } from '@/integrations/supabase/client';
import { isLaravelMode, laravelApi } from './laravel-auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

interface QueryResult<T = Any> {
  data: T | null;
  error: { message: string; code?: string } | null;
  count?: number | null;
}

class LaravelBuilder<T = Any> implements PromiseLike<QueryResult<T>> {
  private ops: Any[] = [];
  private selectStr = '*';
  private withCount = false;
  private headOnly = false;
  private isSingle = false;
  private isMaybeSingle = false;
  private mode: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private payload: Any = null;
  private onConflict?: string;

  constructor(private table: string) {}

  select(cols: string = '*', opts?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }) {
    this.selectStr = cols || '*';
    if (opts?.count) this.withCount = true;
    if (opts?.head) this.headOnly = true;
    return this;
  }
  insert(payload: Any) { this.mode = 'insert'; this.payload = payload; return this; }
  update(payload: Any) { this.mode = 'update'; this.payload = payload; return this; }
  delete() { this.mode = 'delete'; return this; }
  upsert(payload: Any, opts?: { onConflict?: string }) {
    this.mode = 'upsert'; this.payload = payload; this.onConflict = opts?.onConflict; return this;
  }
  eq(c: string, v: Any)  { this.ops.push(['eq',  c, v]); return this; }
  neq(c: string, v: Any) { this.ops.push(['neq', c, v]); return this; }
  gt(c: string, v: Any)  { this.ops.push(['gt',  c, v]); return this; }
  gte(c: string, v: Any) { this.ops.push(['gte', c, v]); return this; }
  lt(c: string, v: Any)  { this.ops.push(['lt',  c, v]); return this; }
  lte(c: string, v: Any) { this.ops.push(['lte', c, v]); return this; }
  in(c: string, v: Any[]) { this.ops.push(['in', c, v]); return this; }
  is(c: string, v: Any)  { this.ops.push(['is',  c, v]); return this; }
  like(c: string, v: string)  { this.ops.push(['like',  c, v]); return this; }
  ilike(c: string, v: string) { this.ops.push(['ilike', c, v]); return this; }
  order(c: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) {
    this.ops.push(['order', c, opts ?? {}]); return this;
  }
  limit(n: number)               { this.ops.push(['limit', n]); return this; }
  range(a: number, b: number)    { this.ops.push(['range', a, b]); return this; }
  single()      { this.isSingle = true; return this; }
  maybeSingle() { this.isMaybeSingle = true; return this; }

  private async run(): Promise<QueryResult<T>> {
    try {
      const body: Any = {
        table: this.table,
        op: this.mode,
        select: this.selectStr,
        ops: this.ops,
        single: this.isSingle,
        maybeSingle: this.isMaybeSingle,
        count: this.withCount,
        head: this.headOnly,
      };
      if (this.mode === 'insert' || this.mode === 'update' || this.mode === 'upsert') {
        body.payload = this.payload;
      }
      if (this.mode === 'upsert' && this.onConflict) body.onConflict = this.onConflict;

      const res = await laravelApi<QueryResult<T>>('/db/query', { method: 'POST', body });
      return {
        data: (res?.data ?? null) as T | null,
        error: res?.error ?? null,
        count: res?.count ?? null,
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { data: null, error: { message }, count: null };
    }
  }

  then<TResult1 = QueryResult<T>, TResult2 = never>(
    onFulfilled?: ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onRejected?: ((reason: Any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.run().then(onFulfilled ?? undefined, onRejected ?? undefined);
  }
}

export const db = {
  from(table: string): Any {
    if (!isLaravelMode()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return supabase.from(table as any);
    }
    return new LaravelBuilder(table);
  },
  /** RPC calls: fall back to supabase in preview; Laravel exposes named endpoints. */
  async rpc<T = Any>(fn: string, args?: Any): Promise<QueryResult<T>> {
    if (!isLaravelMode()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = await (supabase as any).rpc(fn, args);
      return { data: r.data as T, error: r.error };
    }
    try {
      const data = await laravelApi<T>(`/rpc/${fn}`, { method: 'POST', body: args ?? {} });
      return { data: data as T, error: null };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { data: null, error: { message } };
    }
  },
};

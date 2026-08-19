import { useEffect, useState, useCallback, Fragment } from 'react';
import { Loader2, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { listAuditLog, listAuditActions, type AuditRow, type AuditFilters } from '@/lib/auditApi';

const PAGE_SIZE = 50;
const ANY = '__any__'; // Select needs a non-empty value for "no filter"

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

function statusClass(code: number): string {
  if (code >= 500) return 'text-destructive font-medium';
  if (code >= 400) return 'text-amber-600 font-medium';
  return 'text-emerald-600';
}

const AuditLogPage = () => {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Draft filters (edited in the bar) vs applied filters (drive the query).
  const [draft, setDraft] = useState<AuditFilters>({});
  const [applied, setApplied] = useState<AuditFilters>({});

  const load = useCallback(async (nextOffset: number, filters: AuditFilters) => {
    setLoading(true);
    try {
      const data = await listAuditLog({ ...filters, limit: PAGE_SIZE, offset: nextOffset });
      setRows(data.rows);
      setTotal(data.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(offset, applied); }, [load, offset, applied]);
  useEffect(() => {
    listAuditActions().then(setActions).catch(() => setActions([]));
  }, []);

  const apply = () => { setOffset(0); setApplied(draft); };
  const reset = () => { setDraft({}); setOffset(0); setApplied({}); };

  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE_SIZE, total);

  const setField = (key: keyof AuditFilters, value: string) =>
    setDraft((d) => ({ ...d, [key]: value === ANY || value === '' ? undefined : value }));

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold">Audit Log</h1>
        <p className="text-sm text-muted-foreground">Every request against the admin backend. Read-only.</p>
      </div>

      {/* Filter bar */}
      <div className="mb-4 grid grid-cols-1 gap-3 rounded-md border p-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <Label className="text-xs">Path contains</Label>
          <Input value={draft.q ?? ''} onChange={(e) => setField('q', e.target.value)} placeholder="/api/admin/users" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Action</Label>
          <Select value={draft.action ?? ANY} onValueChange={(v) => setField('action', v)}>
            <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any</SelectItem>
              {actions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Method</Label>
          <Select value={draft.method ?? ANY} onValueChange={(v) => setField('method', v)}>
            <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any</SelectItem>
              {METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Input value={draft.status ?? ''} onChange={(e) => setField('status', e.target.value)} placeholder="200" inputMode="numeric" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Actor (user id)</Label>
          <Input value={draft.actor_id ?? ''} onChange={(e) => setField('actor_id', e.target.value)} placeholder="uuid" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input type="date" value={draft.from ?? ''} onChange={(e) => setField('from', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input type="date" value={draft.to ?? ''} onChange={(e) => setField('to', e.target.value)} />
        </div>
        <div className="flex items-end gap-2">
          <Button onClick={apply} className="flex-1">Apply</Button>
          <Button onClick={reset} variant="outline" size="icon" title="Reset filters"><RotateCcw className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Time</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action / Method</TableHead>
              <TableHead>Path</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Target</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">No entries.</TableCell></TableRow>
            ) : (
              rows.map((r) => (
                <Fragment key={r.id}>
                  <TableRow className="cursor-pointer" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                    <TableCell>{expanded === r.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{r.actor_email ?? <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-xs">{r.action ?? <span className="font-mono">{r.method}</span>}</TableCell>
                    <TableCell className="max-w-[240px] truncate font-mono text-xs">{r.path}</TableCell>
                    <TableCell className={`text-xs ${statusClass(r.status_code)}`}>{r.status_code}</TableCell>
                    <TableCell className="max-w-[160px] truncate font-mono text-xs text-muted-foreground">{r.target_id ?? '—'}</TableCell>
                  </TableRow>
                  {expanded === r.id && (
                    <TableRow key={`${r.id}-detail`} className="bg-muted/30">
                      <TableCell />
                      <TableCell colSpan={6} className="text-xs">
                        <div className="grid gap-1 py-1">
                          <div><span className="text-muted-foreground">Method:</span> <span className="font-mono">{r.method}</span> · <span className="text-muted-foreground">Duration:</span> {r.duration_ms ?? '—'} ms</div>
                          <div><span className="text-muted-foreground">IP:</span> {r.ip ?? '—'}</div>
                          <div className="truncate"><span className="text-muted-foreground">User agent:</span> {r.user_agent ?? '—'}</div>
                          {r.detail && (
                            <pre className="mt-1 overflow-x-auto rounded bg-background p-2 text-[11px]">{JSON.stringify(r.detail, null, 2)}</pre>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
        <span>{from}–{to} of {total}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={offset === 0 || loading} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>Previous</Button>
          <Button variant="outline" size="sm" disabled={to >= total || loading} onClick={() => setOffset(offset + PAGE_SIZE)}>Next</Button>
        </div>
      </div>
    </div>
  );
};

export default AuditLogPage;

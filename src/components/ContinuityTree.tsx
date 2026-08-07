import { Fragment } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useDocketMap } from '@/hooks/useDocketMap';
import { buildContinuityForest, type ContinuityNode } from '@/lib/continuityChain';
import type { PatentFileWrapper } from '@/types/continuity';

interface ContinuityTreeProps {
  wrapper: PatentFileWrapper;
}

type StatusVariant = 'granted' | 'active' | 'docketed' | 'other';

function statusVariant(code?: number): StatusVariant {
  if (code === 150) return 'granted';
  if (code === 71) return 'active';
  if (code === 30) return 'docketed';
  return 'other';
}

function formatAppNumber(app: string): string {
  return app.length > 2 ? `${app.slice(0, 2)}/${app.slice(2)}` : app;
}

function formatDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const badgeClasses: Record<StatusVariant, string> = {
  granted: 'bg-status-granted-bg text-status-granted',
  active: 'bg-status-active-bg text-status-active',
  docketed: 'bg-status-docketed-bg text-status-docketed',
  other: 'bg-muted text-muted-foreground',
};

const dotClasses: Record<StatusVariant, string> = {
  granted: 'bg-status-granted ring-status-granted',
  active: 'bg-status-active ring-status-active',
  docketed: 'bg-status-docketed ring-status-docketed',
  other: 'bg-muted-foreground ring-muted-foreground',
};

const legend: { variant: StatusVariant; label: string }[] = [
  { variant: 'granted', label: 'Patented' },
  { variant: 'active', label: 'In active prosecution' },
  { variant: 'docketed', label: 'Docketed, awaiting examination' },
];

function flatten(roots: ContinuityNode[]): ContinuityNode[] {
  const out: ContinuityNode[] = [];
  const walk = (n: ContinuityNode) => {
    out.push(n);
    n.children.forEach(walk);
  };
  roots.forEach(walk);
  return out;
}

export function ContinuityTree({ wrapper }: ContinuityTreeProps) {
  const { lookup } = useDocketMap();

  // Reconstruct the true family tree from USPTO edges (parent + child bags),
  // following parent->child links rather than guessing topology from dates.
  const forest = buildContinuityForest(wrapper);
  const all = flatten(forest);

  const related = all.filter((n) => !n.isQueried);
  const grantedCount = related.filter((n) => statusVariant(n.statusCode) === 'granted').length;
  const dates = all.map((n) => n.filingDate).filter(Boolean).sort() as string[];
  const earliestYear = dates.length ? dates[0].slice(0, 4) : null;
  const latestYear = dates.length ? dates[dates.length - 1].slice(0, 4) : null;
  const parentageTypes = Array.from(new Set(related.map((n) => n.parentageType).filter(Boolean)));

  if (all.length <= 1) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          No continuity data found for application {formatAppNumber(wrapper.applicationNumberText)} &mdash; it has no
          recorded parent or child applications.
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
        <Stat value={String(all.length)} label="applications in chain" />
        <Stat value={String(grantedCount)} label="already patented" />
        {earliestYear && (
          <Stat value={latestYear && latestYear !== earliestYear ? `${earliestYear}–${latestYear}` : earliestYear} label="filing span" mono />
        )}
        <Stat value={parentageTypes.length === 1 ? String(parentageTypes[0]) : 'Mixed'} label="parentage type" />
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground mb-6">
        {legend.map((l) => (
          <span key={l.variant} className="inline-flex items-center gap-1.5">
            <span className={cn('inline-block h-2 w-2 rounded-full', dotClasses[l.variant].split(' ')[0])} />
            {l.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-primary" />
          Application queried
        </span>
      </div>

      <div>
        {forest.map((root) => (
          <TreeNode key={root.appNumber} node={root} depth={0} lookup={lookup} />
        ))}
      </div>
    </div>
  );
}

interface TreeNodeProps {
  node: ContinuityNode;
  depth: number;
  lookup: (app: string) => string | undefined;
}

function TreeNode({ node, depth, lookup }: TreeNodeProps) {
  const variant = node.isQueried ? 'other' : statusVariant(node.statusCode);
  const docket = lookup(node.appNumber);

  return (
    <Fragment>
      {/* Relationship of this node to its parent (edge into this node). */}
      {depth > 0 && node.parentageType && (
        <div className="flex gap-4" style={{ paddingLeft: `${(depth - 1) * 1.5}rem` }}>
          <div className="w-8 shrink-0" />
          <p className="text-xs italic text-muted-foreground py-2">{node.parentageType} ↓</p>
        </div>
      )}
      <div className="flex gap-4" style={{ paddingLeft: `${depth * 1.5}rem` }}>
        <div className="w-8 shrink-0 flex justify-center pt-4">
          <span
            className={cn(
              'relative z-10 h-3 w-3 rounded-full ring-2 ring-offset-2 ring-offset-background',
              node.isQueried ? 'bg-primary ring-primary h-3.5 w-3.5' : dotClasses[variant],
            )}
          />
        </div>
        <Card className={cn('flex-1 mb-5', node.isQueried && 'border-primary/60 bg-current-highlight')}>
          <CardContent className="p-4">
            <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1.5">
              <span className="font-mono text-base font-semibold tracking-tight">
                {formatAppNumber(node.appNumber)}
                {docket && (
                  <span className="ml-2 font-mono text-sm font-normal text-muted-foreground">· {docket}</span>
                )}
                {node.isQueried && (
                  <span className="ml-2 align-middle rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-sans font-bold uppercase tracking-wide text-primary">
                    Queried
                  </span>
                )}
              </span>
              {node.statusText && (
                <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', badgeClasses[variant])}>
                  {node.statusText}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
              {node.filingDate && (
                <span>
                  Filed <span className="font-mono text-foreground">{formatDate(node.filingDate)}</span>
                </span>
              )}
              {node.patentNumber && (
                <span>
                  Patent No. <span className="font-mono text-foreground">{node.patentNumber}</span>
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      {node.children.map((child) => (
        <TreeNode key={child.appNumber} node={child} depth={depth + 1} lookup={lookup} />
      ))}
    </Fragment>
  );
}

function Stat({ value, label, mono }: { value: string; label: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={cn('text-lg font-semibold', mono && 'font-mono')}>{value}</span>
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
  );
}

import { Fragment } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useDocketMap } from '@/hooks/useDocketMap';
import type { PatentFileWrapper } from '@/types/continuity';

interface ContinuityTreeProps {
  wrapper: PatentFileWrapper;
}

type StatusVariant = 'granted' | 'active' | 'docketed' | 'other';

interface ChainNode {
  appNumber: string;
  filingDate?: string;
  statusText?: string;
  patentNumber?: string;
  variant: StatusVariant;
  isCurrent?: boolean;
}

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

export function ContinuityTree({ wrapper }: ContinuityTreeProps) {
  const { lookup } = useDocketMap();
  const links = wrapper.parentContinuityBag ?? [];

  // Order ancestors oldest-first (root of the chain) through to the application queried.
  const sorted = [...links].sort((a, b) => {
    const da = a.parentApplicationFilingDate ?? '';
    const db = b.parentApplicationFilingDate ?? '';
    return da.localeCompare(db);
  });

  const ancestorNodes: ChainNode[] = sorted.map((link) => ({
    appNumber: link.parentApplicationNumberText,
    filingDate: link.parentApplicationFilingDate,
    statusText: link.parentApplicationStatusDescriptionText,
    patentNumber: link.parentPatentNumber,
    variant: statusVariant(link.parentApplicationStatusCode),
  }));

  const nodes: ChainNode[] = [
    ...ancestorNodes,
    { appNumber: wrapper.applicationNumberText, statusText: 'Application queried', variant: 'other', isCurrent: true },
  ];

  const connectorFor = (index: number) => sorted[index]?.claimParentageTypeCodeDescriptionText ?? 'is related to';

  const grantedCount = ancestorNodes.filter((n) => n.variant === 'granted').length;
  const dates = sorted.map((l) => l.parentApplicationFilingDate).filter(Boolean) as string[];
  const earliestYear = dates.length ? dates[0].slice(0, 4) : null;
  const latestYear = dates.length ? dates[dates.length - 1].slice(0, 4) : null;
  const parentageTypes = Array.from(new Set(sorted.map((l) => l.claimParentageTypeCode).filter(Boolean)));

  if (nodes.length <= 1) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          No continuity data found for application {formatAppNumber(wrapper.applicationNumberText)} &mdash; it has no
          recorded parent applications.
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
        <Stat value={String(nodes.length)} label="applications in chain" />
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

      <div className="relative">
        <div className="absolute left-4 top-3 bottom-3 w-px bg-border" aria-hidden="true" />
        {nodes.map((node, i) => (
          <Fragment key={node.appNumber}>
            {i > 0 && (
              <div className="relative flex gap-4 pl-0">
                <div className="w-8 shrink-0" />
                <p className="text-xs italic text-muted-foreground py-2">{connectorFor(i - 1)} ↓</p>
              </div>
            )}
            <div className="relative flex gap-4">
              <div className="w-8 shrink-0 flex justify-center pt-4">
                <span
                  className={cn(
                    'relative z-10 h-3 w-3 rounded-full ring-2 ring-offset-2 ring-offset-background',
                    node.isCurrent ? 'bg-primary ring-primary h-3.5 w-3.5' : dotClasses[node.variant],
                  )}
                />
              </div>
              <Card className={cn('flex-1 mb-5', node.isCurrent && 'border-primary/60 bg-current-highlight')}>
                <CardContent className="p-4">
                  <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1.5">
                    <span className="font-mono text-base font-semibold tracking-tight">
                      {formatAppNumber(node.appNumber)}
                      {lookup(node.appNumber) && (
                        <span className="ml-2 font-mono text-sm font-normal text-muted-foreground">
                          · {lookup(node.appNumber)}
                        </span>
                      )}
                      {node.isCurrent && (
                        <span className="ml-2 align-middle rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-sans font-bold uppercase tracking-wide text-primary">
                          Queried
                        </span>
                      )}
                    </span>
                    {node.statusText && (
                      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', badgeClasses[node.variant])}>
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
          </Fragment>
        ))}
      </div>
    </div>
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

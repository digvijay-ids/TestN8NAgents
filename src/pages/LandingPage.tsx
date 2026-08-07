import { Link } from 'react-router-dom';
import { FileText, Building2, GitBranch, ArrowRight, LogIn, Scroll } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

/**
 * Public marketing/landing page. Teaches what Patmimo does through its own
 * artifact — a continuity chain with docket numbers mapped onto real
 * application numbers — and routes to sign-in (access is invite-only).
 */

interface ChainNode {
  app: string;
  docket: string;
  status: string;
  variant: 'granted' | 'active' | 'docketed';
  edge?: string;
}

const CHAIN: ChainNode[] = [
  { app: '63/991,2XX', docket: 'QPR-P002', status: 'Provisional', variant: 'docketed' },
  { app: '18/210,5XX', docket: 'SYG-45676A', status: 'In prosecution', variant: 'active', edge: 'claims priority' },
  { app: '16/394,2XX', docket: 'WON-P001', status: 'Patent 11,XXX,XXX', variant: 'granted', edge: 'continuation of' },
];

const dot: Record<ChainNode['variant'], string> = {
  granted: 'bg-status-granted ring-status-granted',
  active: 'bg-status-active ring-status-active',
  docketed: 'bg-status-docketed ring-status-docketed',
};
const pill: Record<ChainNode['variant'], string> = {
  granted: 'bg-status-granted-bg text-status-granted',
  active: 'bg-status-active-bg text-status-active',
  docketed: 'bg-status-docketed-bg text-status-docketed',
};

const CAPABILITIES = [
  {
    icon: FileText,
    label: 'CREATE',
    title: 'Filing documents',
    body: 'Generate filing-ready IDS transmittals, declarations, assignments, and preliminary amendments from a WIPO or USPTO application number—ready to review and file.',
  },
  {
    icon: Building2,
    label: 'RETRIEVE',
    title: 'USPTO data',
    body: 'Retrieve live application status, bibliographic data, and complete file-wrapper history directly from the USPTO—without manual data entry.(coming soon)',
  },
  {
    icon: GitBranch,
    label: 'TRACE',
    title: 'Continuity chains',
    body: 'Visualize complete parent-child application relationships for US applications while automatically mapping your internal docket numbers across the entire patent family.',
  },
];

const LandingPage = () => {
  const { user } = useAuth();
  const primaryCta = user
    ? { to: '/create-documents', label: 'Open the app' }
    : { to: '/login', label: 'Sign in' };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Scroll className="h-4 w-4" />
          </div>
          <span className="font-serif text-lg font-semibold">Patmimo</span>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/login">
            <LogIn className="mr-2 h-4 w-4" /> Sign in
          </Link>
        </Button>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-10 md:grid-cols-2 md:pt-16">
        <div>
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Patent prosecution workspace
          </p>
          <h1 className="font-serif text-4xl font-semibold leading-[1.1] tracking-tight md:text-5xl">
            From WIPO Application to USPTO Filing Documents
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
            Turn a WIPO application number into a complete USPTO filing package. Patmimo automates document preparation, docket mapping, and continuity tracking in minutes.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link to={primaryCta.to}>
                {primaryCta.label} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <span className="font-mono text-xs text-muted-foreground">Access is invite-only</span>
          </div>
        </div>

        {/* Signature: a continuity chain, the artifact the product produces */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Continuity · family view
            </p>
            <span className="font-mono text-[11px] text-muted-foreground">3 applications</span>
          </div>
          <div className="relative">
            <div className="absolute bottom-4 left-[7px] top-4 w-px bg-border" aria-hidden="true" />
            <ul className="space-y-5">
              {CHAIN.map((node) => (
                <li key={node.app} className="relative">
                  {node.edge && (
                    <p className="mb-3 pl-8 font-mono text-[11px] italic text-muted-foreground">
                      {node.edge} ↓
                    </p>
                  )}
                  <div className="flex items-start gap-4">
                    <span
                      className={`relative z-10 mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-card ${dot[node.variant]}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span className="font-mono text-sm font-bold tracking-tight">{node.app}</span>
                        <span className="font-mono text-xs text-muted-foreground">· {node.docket}</span>
                      </div>
                      <span
                        className={`mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${pill[node.variant]}`}
                      >
                        {node.status}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="mb-10 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            What it does
          </p>
          <div className="grid gap-8 md:grid-cols-3">
            {CAPABILITIES.map((c) => (
              <div key={c.title}>
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <c.icon className="h-5 w-5" />
                </div>
                <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {c.label}
                </p>
                <h3 className="mb-2 font-serif text-xl font-semibold">{c.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex flex-col items-start justify-between gap-6 rounded-xl border border-border bg-card p-8 md:flex-row md:items-center">
          <div>
            <h2 className="font-serif text-2xl font-semibold">Ready when you are.</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in with the account your administrator set up for you.
            </p>
          </div>
          <Button asChild size="lg">
            <Link to="/login">
              <LogIn className="mr-2 h-4 w-4" /> Sign in
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <span className="font-serif text-sm font-semibold">Patmimo</span>
          <span className="font-mono text-[11px] text-muted-foreground">Patent Prosecution Workspace © 2025, All Rights Reserved</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

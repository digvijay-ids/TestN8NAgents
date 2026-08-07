import { useEffect, useState, useCallback } from 'react';
import { Loader2, UserPlus, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import type { Page, Profile, Role } from '@/types/access';
import {
  listProfiles, listRoles, listPages, listUserRoles, listOverrides,
  createUser, updateUser, setUserActive, setUserRoles, setUserOverride,
} from '@/lib/adminApi';

type OverrideMap = Record<string, Record<string, 'allow' | 'deny'>>; // userId -> pageId -> access
type RoleMap = Record<string, string[]>; // userId -> roleIds

const UsersAdminPage = () => {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [userRoles, setUserRolesState] = useState<RoleMap>({});
  const [overrides, setOverrides] = useState<OverrideMap>({});

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [p, r, pg, ur, ov] = await Promise.all([
        listProfiles(), listRoles(), listPages(), listUserRoles(), listOverrides(),
      ]);
      setProfiles(p);
      setRoles(r);
      setPages(pg.filter((x) => !x.is_public)); // overrides only meaningful for private pages
      const rm: RoleMap = {};
      ur.forEach(({ user_id, role_id }) => { (rm[user_id] ??= []).push(role_id); });
      setUserRolesState(rm);
      const om: OverrideMap = {};
      ov.forEach(({ user_id, page_id, access }) => { (om[user_id] ??= {})[page_id] = access; });
      setOverrides(om);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const toggleActive = async (user: Profile) => {
    try {
      await setUserActive(user.id, !user.is_active);
      toast.success(`${user.email} ${!user.is_active ? 'activated' : 'deactivated'}`);
      void reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    }
  };

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground">Create users, assign roles, and grant per-page access.</p>
        </div>
        <CreateUserDialog roles={roles} onCreated={reload} />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Access</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="font-medium">{u.full_name || '—'}</div>
                  <div className="font-mono text-xs text-muted-foreground">{u.email}</div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(userRoles[u.id] ?? []).map((rid) => {
                      const role = roles.find((r) => r.id === rid);
                      return role ? <Badge key={rid} variant="secondary">{role.name}</Badge> : null;
                    })}
                    {(userRoles[u.id] ?? []).length === 0 && <span className="text-xs text-muted-foreground">none</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <Switch checked={u.is_active} onCheckedChange={() => toggleActive(u)} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <EditUserDialog user={u} onSaved={reload} />
                    <RolesDialog user={u} roles={roles} current={userRoles[u.id] ?? []} onSaved={reload} />
                    <OverridesDialog user={u} pages={pages} current={overrides[u.id] ?? {}} onSaved={reload} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

function CreateUserDialog({ roles, onCreated }: { roles: Role[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [isSuper, setIsSuper] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await createUser({ email: email.trim(), password, full_name: fullName.trim(), role_ids: roleIds, is_super_admin: isSuper });
      toast.success(`User ${email} created`);
      setOpen(false);
      setEmail(''); setPassword(''); setFullName(''); setRoleIds([]); setIsSuper(false);
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create user');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><UserPlus className="mr-2 h-4 w-4" /> Create user</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create user</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-2"><Label>Temporary password</Label><Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <div className="space-y-2"><Label>Full name</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
          <div className="space-y-2">
            <Label>Roles</Label>
            <div className="space-y-1.5">
              {roles.map((r) => (
                <label key={r.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={roleIds.includes(r.id)} onCheckedChange={(c) => setRoleIds((prev) => c ? [...prev, r.id] : prev.filter((x) => x !== r.id))} />
                  {r.name}
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={isSuper} onCheckedChange={(c) => setIsSuper(c === true)} />
            <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Super-admin (full access)</span>
          </label>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy || !email || !password}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({ user, onSaved }: { user: Profile; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState(user.full_name ?? '');
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setFullName(user.full_name ?? '');
      setEmail(user.email);
      setPassword('');
    }
  }, [open, user]);

  const save = async () => {
    setBusy(true);
    try {
      const patch: { full_name?: string; email?: string; password?: string } = {};
      if (fullName !== (user.full_name ?? '')) patch.full_name = fullName;
      if (email.trim() && email.trim() !== user.email) patch.email = email.trim();
      if (password) patch.password = password;
      if (Object.keys(patch).length === 0) {
        setOpen(false);
        return;
      }
      await updateUser(user.id, patch);
      toast.success('User updated');
      setOpen(false);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update user');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm">Edit</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit {user.email}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Full name</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
          <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-2">
            <Label>New password</Label>
            <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave blank to keep current" />
          </div>
        </div>
        <DialogFooter><Button onClick={save} disabled={busy}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RolesDialog({ user, roles, current, onSaved }: { user: Profile; roles: Role[]; current: string[]; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(current);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setSelected(current); }, [current, open]);

  const save = async () => {
    setBusy(true);
    try {
      await setUserRoles(user.id, selected);
      toast.success('Roles updated');
      setOpen(false);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update roles');
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm">Roles</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Roles for {user.email}</DialogTitle></DialogHeader>
        <div className="space-y-1.5">
          {roles.map((r) => (
            <label key={r.id} className="flex items-center gap-2 text-sm">
              <Checkbox checked={selected.includes(r.id)} onCheckedChange={(c) => setSelected((prev) => c ? [...prev, r.id] : prev.filter((x) => x !== r.id))} />
              {r.name}
            </label>
          ))}
        </div>
        <DialogFooter><Button onClick={save} disabled={busy}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OverridesDialog({ user, pages, current, onSaved }: { user: Profile; pages: Page[]; current: Record<string, 'allow' | 'deny'>; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<Record<string, 'allow' | 'deny' | 'inherit'>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const s: Record<string, 'allow' | 'deny' | 'inherit'> = {};
    pages.forEach((p) => { s[p.id] = current[p.id] ?? 'inherit'; });
    setState(s);
  }, [current, pages, open]);

  const save = async () => {
    setBusy(true);
    try {
      await Promise.all(pages.map((p) => {
        const next = state[p.id];
        const prev = current[p.id] ?? 'inherit';
        if (next === prev) return Promise.resolve();
        return setUserOverride(user.id, p.id, next === 'inherit' ? null : next);
      }));
      toast.success('Access updated');
      setOpen(false);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update access');
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm">Access</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Page access for {user.email}</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">Overrides beat role grants. &ldquo;Inherit&rdquo; uses role-based access.</p>
        <div className="space-y-2">
          {pages.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 text-sm">
              <span>{p.label} <span className="font-mono text-xs text-muted-foreground">{p.path}</span></span>
              <div className="flex gap-1">
                {(['inherit', 'allow', 'deny'] as const).map((opt) => (
                  <Button key={opt} type="button" size="sm"
                    variant={state[p.id] === opt ? 'default' : 'outline'}
                    onClick={() => setState((s) => ({ ...s, [p.id]: opt }))}>
                    {opt}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter><Button onClick={save} disabled={busy}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default UsersAdminPage;

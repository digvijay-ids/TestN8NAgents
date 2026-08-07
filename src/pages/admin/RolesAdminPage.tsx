import { useEffect, useState, useCallback } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Page, Role } from '@/types/access';
import {
  listRoles, listPages, listRolePages, createRole, deleteRole, setRolePages,
} from '@/lib/adminApi';

const RolesAdminPage = () => {
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [rolePages, setRolePagesState] = useState<Record<string, string[]>>({}); // roleId -> pageIds

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [r, pg, rp] = await Promise.all([listRoles(), listPages(), listRolePages()]);
      setRoles(r);
      setPages(pg.filter((x) => !x.is_public));
      const map: Record<string, string[]> = {};
      rp.forEach(({ role_id, page_id }) => { (map[role_id] ??= []).push(page_id); });
      setRolePagesState(map);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load roles');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const togglePage = async (role: Role, page: Page, checked: boolean) => {
    const current = rolePages[role.id] ?? [];
    const next = checked ? [...current, page.id] : current.filter((id) => id !== page.id);
    setRolePagesState((m) => ({ ...m, [role.id]: next }));
    try {
      await setRolePages(role.id, next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update role access');
      void reload();
    }
  };

  const removeRole = async (role: Role) => {
    try {
      await deleteRole(role.id);
      toast.success(`Role ${role.name} deleted`);
      void reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete role');
    }
  };

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold">Roles</h1>
          <p className="text-sm text-muted-foreground">Define roles and the pages each role can access.</p>
        </div>
        <CreateRoleDialog onCreated={reload} />
      </div>

      <div className="space-y-4">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-lg">{role.name}</CardTitle>
                {role.description && <CardDescription>{role.description}</CardDescription>}
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeRole(role)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2">
                {pages.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={(rolePages[role.id] ?? []).includes(p.id)}
                      onCheckedChange={(c) => togglePage(role, p, c === true)}
                    />
                    {p.label} <span className="font-mono text-xs text-muted-foreground">{p.path}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

function CreateRoleDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await createRole(name.trim(), description.trim());
      toast.success(`Role ${name} created`);
      setOpen(false); setName(''); setDescription('');
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create role');
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> New role</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create role</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-2"><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={submit} disabled={busy || !name}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Create</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RolesAdminPage;

import { useEffect, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Page } from '@/types/access';
import { listPages, updatePage } from '@/lib/adminApi';

const PagesAdminPage = () => {
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState<Page[]>([]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setPages(await listPages());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load pages');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const togglePublic = async (page: Page) => {
    try {
      await updatePage(page.id, { is_public: !page.is_public });
      toast.success(`${page.label} is now ${!page.is_public ? 'public' : 'private'}`);
      void reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    }
  };

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-6">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold">Pages</h1>
        <p className="text-sm text-muted-foreground">Toggle whether a page is publicly accessible without signing in.</p>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Page</TableHead>
              <TableHead>Path</TableHead>
              <TableHead className="text-right">Public</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pages.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">
                  {p.label}
                  {p.is_public && <Badge variant="secondary" className="ml-2">public</Badge>}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{p.path}</TableCell>
                <TableCell className="text-right">
                  <Switch checked={p.is_public} onCheckedChange={() => togglePublic(p)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default PagesAdminPage;

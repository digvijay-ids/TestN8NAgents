import { ShieldX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const NoAccess = () => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
      <ShieldX className="h-7 w-7 text-destructive" />
    </div>
    <div>
      <h1 className="font-serif text-2xl font-semibold">Access denied</h1>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        You don&rsquo;t have permission to view this page. Ask an administrator to grant you access.
      </p>
    </div>
    <Button asChild variant="outline">
      <Link to="/">Back to home</Link>
    </Button>
  </div>
);

export default NoAccess;

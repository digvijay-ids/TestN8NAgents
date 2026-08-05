import { Link } from 'react-router-dom';
import { Scroll, LogIn, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

const LandingPage = () => {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-6 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <Scroll className="h-8 w-8 text-primary" />
      </div>
      <h1 className="font-serif text-4xl font-semibold tracking-tight">Patmimo</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Patent document filing, USPTO data, and continuity tools &mdash; secured behind your organization&rsquo;s
        access controls.
      </p>
      <div className="mt-8 flex gap-3">
        {user ? (
          <Button asChild>
            <Link to="/create-documents">
              Go to app <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button asChild>
            <Link to="/login">
              <LogIn className="mr-2 h-4 w-4" /> Sign in
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
};

export default LandingPage;

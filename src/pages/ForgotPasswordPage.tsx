import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { forgotPassword } from '@/lib/authApi';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await forgotPassword(email.trim());
    } catch {
      // Intentionally ignore errors: never reveal whether an account exists.
    } finally {
      setSubmitting(false);
      setSent(true);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="font-serif text-2xl font-semibold tracking-tight">Reset password</CardTitle>
          <CardDescription className="mt-1">
            Enter your email and we&rsquo;ll send you a reset link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
              <p className="text-sm text-muted-foreground">
                If an account exists for <strong>{email}</strong>, a reset link is on its way.
                Check your inbox and spam folder.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/login"><ArrowLeft className="mr-2 h-4 w-4" /> Back to sign in</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">Email</label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting || !email}>
                {submitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending&hellip;</>
                ) : (
                  <><Mail className="mr-2 h-4 w-4" /> Send reset link</>
                )}
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link to="/login"><ArrowLeft className="mr-2 h-4 w-4" /> Back to sign in</Link>
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPasswordPage;

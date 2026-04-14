import { useState } from 'react';
import { Search, Loader2, AlertCircle, Scale, CheckCircle2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useClaimsSearch } from '@/hooks/useClaimsSearch';
// ClaimsComparison kept for future use
// import { ClaimsComparison } from '@/components/ClaimsComparison';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ClaimsPage = () => {
  const [pctNumber, setPctNumber] = useState('');
  const [email, setEmail] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const { isLoading, loadingStep, error, submitted, fetchClaims, reset } = useClaimsSearch();

  const validatePctFormat = (value: string): string | null => {
    const trimmed = value.trim().toUpperCase();
    if (!trimmed) return null;
    const match = trimmed.match(/^PCT\/([A-Z]{2})(\d{4})\/(\d{6})$/);
    if (!match) return 'Format must be PCT/XX####/###### (e.g., PCT/US2024/001234)';
    const year = parseInt(match[2], 10);
    const currentYear = new Date().getFullYear();
    if (year < currentYear - 4 || year > currentYear) return `Year must be between ${currentYear - 4} and ${currentYear}`;
    return null;
  };

  const isValidPct = (v: string) => validatePctFormat(v) === null && v.trim() !== '';
  const isValidEmail = (v: string) => EMAIL_REGEX.test(v.trim());

  const handlePctChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPctNumber(value);
    const err = validatePctFormat(value);
    if (value.trim() && err) setValidationError(err);
    else if (validationError) setValidationError(null);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (value.trim() && !isValidEmail(value)) setEmailError('Please enter a valid email address');
    else if (emailError) setEmailError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pctNumber.trim()) { setValidationError('Please enter a PCT number'); return; }
    if (!isValidPct(pctNumber)) { setValidationError('Invalid PCT number format'); return; }
    if (!email.trim()) { setEmailError('Email is required'); return; }
    if (!isValidEmail(email)) { setEmailError('Please enter a valid email address'); return; }
    setValidationError(null);
    setEmailError(null);
    await fetchClaims(pctNumber.trim(), email.trim());
  };

  const handleNewSearch = () => { setPctNumber(''); setEmail(''); setValidationError(null); setEmailError(null); reset(); };

  const canSubmit = pctNumber.trim() !== '' && isValidPct(pctNumber) && email.trim() !== '' && isValidEmail(email) && !isLoading;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-center min-h-[calc(100vh-6rem)]">
        {submitted ? (
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-semibold">Request Submitted</CardTitle>
              <CardDescription>
                Your request has been submitted. US compliant claims will be sent to <span className="font-medium text-foreground">{email}</span>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={handleNewSearch}>
                Submit Another
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Scale className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl font-semibold">US Compliant Claims</CardTitle>
              <CardDescription>Enter a PCT number and your email to generate US compliant claims</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="claimsPct" className="text-sm font-medium text-foreground">PCT Number</label>
                  <Input
                    id="claimsPct"
                    placeholder="e.g., PCT/US2024/001234"
                    value={pctNumber}
                    onChange={handlePctChange}
                    disabled={isLoading}
                    className={validationError ? 'border-destructive focus-visible:ring-destructive' : ''}
                  />
                  {validationError && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span>{validationError}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label htmlFor="claimsEmail" className="text-sm font-medium text-foreground">
                    Email <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="claimsEmail"
                      type="email"
                      placeholder="e.g., user@example.com"
                      value={email}
                      onChange={handleEmailChange}
                      disabled={isLoading}
                      className={`pl-9 ${emailError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    />
                  </div>
                  {emailError && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span>{emailError}</span>
                    </div>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={!canSubmit}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {loadingStep || 'Processing...'}
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Submit
                    </>
                  )}
                </Button>
              </form>
              {error && (
                <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ClaimsPage;

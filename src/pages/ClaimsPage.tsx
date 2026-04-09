import { useState } from 'react';
import { Search, Loader2, AlertCircle, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useClaimsSearch } from '@/hooks/useClaimsSearch';
import { ClaimsComparison } from '@/components/ClaimsComparison';

const ClaimsPage = () => {
  const [pctNumber, setPctNumber] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const { isLoading, loadingStep, error, wipoClaims, usClaims, fetchClaims, reset } = useClaimsSearch();

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPctNumber(value);
    const err = validatePctFormat(value);
    if (value.trim() && err) setValidationError(err);
    else if (validationError) setValidationError(null);
    if (wipoClaims.length > 0) reset();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pctNumber.trim()) { setValidationError('Please enter a PCT number'); return; }
    if (!isValidPct(pctNumber)) { setValidationError('Invalid PCT number format'); return; }
    setValidationError(null);
    await fetchClaims(pctNumber.trim());
  };

  const handleNewSearch = () => { setPctNumber(''); setValidationError(null); reset(); };

  const showResults = wipoClaims.length > 0 && usClaims.length > 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {!showResults ? (
        <div className="flex items-center justify-center min-h-[calc(100vh-6rem)]">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Scale className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl font-semibold">US Compliant Claims</CardTitle>
              <CardDescription>Enter a PCT number to generate US compliant claims</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="claimsPct" className="text-sm font-medium text-foreground">PCT Number</label>
                  <Input
                    id="claimsPct"
                    placeholder="e.g., PCT/US2024/001234"
                    value={pctNumber}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    className={validationError || error ? 'border-destructive focus-visible:ring-destructive' : ''}
                  />
                  {validationError && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span>{validationError}</span>
                    </div>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={!pctNumber.trim() || !isValidPct(pctNumber) || isLoading}>
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
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">PCT: <span className="font-medium text-foreground">{pctNumber}</span></p>
            <Button variant="outline" size="sm" onClick={handleNewSearch}>New Search</Button>
          </div>
          <ClaimsComparison wipoClaims={wipoClaims} initialUsClaims={usClaims} />
        </div>
      )}
    </div>
  );
};

export default ClaimsPage;

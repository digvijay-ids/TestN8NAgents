import { useState, useRef } from 'react';
import { Search, Loader2, AlertCircle, GitBranch, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useDocketMap } from '@/hooks/useDocketMap';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ContinuityTree } from '@/components/ContinuityTree';
import { familyUrl, USPTO_REQUEST_TIMEOUT } from '@/config/usptoApi';
import { bearerHeaders } from '@/config/api';
import { authErrorMessage } from '@/lib/authApi';
import type { ContinuityResponse, PatentFileWrapper } from '@/types/continuity';

const APP_NUMBER_REGEX = /^\d{7,8}$/;

const ContinuityPage = () => {
  const [applicationNumber, setApplicationNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wrapper, setWrapper] = useState<PatentFileWrapper | null>(null);

  const { lookup, mergeFromXml } = useDocketMap();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    try {
      const count = await mergeFromXml(file);
      toast.success(`${count} docket number${count === 1 ? '' : 's'} mapped`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to read the XML file');
    }
  };

  const isValid = APP_NUMBER_REGEX.test(applicationNumber.trim());

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApplicationNumber(e.target.value.replace(/[^\d]/g, ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const appNum = applicationNumber.trim();
    if (!appNum) {
      setError('Please enter an application number');
      return;
    }
    if (!isValid) {
      setError('Application number must be 7–8 digits (e.g., 18210593)');
      return;
    }

    setError(null);
    setWrapper(null);
    setIsLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), USPTO_REQUEST_TIMEOUT);

    try {
      const res = await fetch(familyUrl(appNum), {
        method: 'GET',
        headers: bearerHeaders({ Accept: 'application/json' }),
        signal: controller.signal,
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) throw new Error(await authErrorMessage(res));
        throw new Error(`Request failed (${res.status})`);
      }
      const data: ContinuityResponse = await res.json();
      const first = data.patentFileWrapperDataBag?.[0];
      if (!first) throw new Error('No continuity data returned for this application');
      setWrapper(first);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Request timed out. Please try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch continuity data');
      }
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  const handleNewSearch = () => {
    setApplicationNumber('');
    setWrapper(null);
    setError(null);
  };

  return (
    <div className="p-4 md:p-6">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xml,text/xml,application/xml"
        data-testid="docket-xml-input"
        className="hidden"
        onChange={handleFileChange}
      />
      {!wrapper ? (
        <div className="flex items-center justify-center min-h-[calc(100vh-6rem)]">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <GitBranch className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl font-serif font-semibold">Application Continuity</CardTitle>
              <CardDescription>Enter a USPTO application number to view its continuity chain</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="applicationNumber" className="text-sm font-medium text-foreground">
                    Application Number
                  </label>
                  <Input
                    id="applicationNumber"
                    placeholder="e.g., 18210593"
                    value={applicationNumber}
                    onChange={handleChange}
                    disabled={isLoading}
                    inputMode="numeric"
                    className={`font-mono ${error ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  />
                  {error && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span>{error}</span>
                    </div>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading || !applicationNumber.trim()}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Fetching continuity&hellip;
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Search
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleUploadClick}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload docket XML
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto py-4">
          <div className="border-b border-border pb-5 mb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-2">
              USPTO Patent File Wrapper &middot; Continuity
            </p>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <h1 className="font-serif text-2xl font-semibold text-balance">
                Continuity chain for application{' '}
                <span className="font-mono">{wrapper.applicationNumberText}</span>
                {lookup(wrapper.applicationNumberText) && (
                  <span className="ml-2 font-mono text-lg font-normal text-muted-foreground">
                    · {lookup(wrapper.applicationNumberText)}
                  </span>
                )}
              </h1>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleUploadClick}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload docket XML
                </Button>
                <Button variant="outline" size="sm" onClick={handleNewSearch}>
                  New search
                </Button>
              </div>
            </div>
          </div>

          <ContinuityTree wrapper={wrapper} />
        </div>
      )}
    </div>
  );
};

export default ContinuityPage;

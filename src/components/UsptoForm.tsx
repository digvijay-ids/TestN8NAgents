import { useState } from 'react';
import { Search, Download, Loader2, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AttorneySelect } from '@/components/AttorneySelect';
import { loadAttorney } from '@/lib/attorneyStorage';
import { DocType } from '@/types/docTypes';
import { GENERATE_FROM_USPTO_URL, API_HEADERS, REQUEST_TIMEOUT } from '@/config/api';

// Only these three document types are derivable from a USPTO application-number lookup.
// IDS (needs prior-art citations) and the other types are intentionally excluded — the
// generate-from-uspto endpoint rejects anything outside this set with a 400.
const USPTO_DOC_TYPE_OPTIONS = [
  { value: DocType.ADS, label: 'Application Data Sheet (ADS)' },
  { value: DocType.PowerOfAttorney, label: 'Power of Attorney' },
  { value: DocType.Inventor, label: 'Inventor' },
] as const;

const APPLICATION_NUMBER_REGEX = /^\d{8}$/;

export const UsptoForm = () => {
  const [applicationNumber, setApplicationNumber] = useState('');
  const [docketNumber, setDocketNumber] = useState('');
  const [customerNumber, setCustomerNumber] = useState('');
  const [selectedDocTypes, setSelectedDocTypes] = useState<DocType[]>([
    DocType.ADS,
    DocType.PowerOfAttorney,
    DocType.Inventor,
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const isValidApplicationNumber = (value: string): boolean =>
    APPLICATION_NUMBER_REGEX.test(value.trim());

  const isSubmitDisabled =
    isLoading || selectedDocTypes.length === 0 || !isValidApplicationNumber(applicationNumber);

  const handleApplicationNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setApplicationNumber(value);
    if (value.trim() && !isValidApplicationNumber(value)) {
      setValidationError('Application number must be exactly 8 digits (e.g., 18818908)');
    } else if (validationError) {
      setValidationError(null);
    }
    if (fileBlob) {
      setFileBlob(null);
      setFileName(null);
    }
  };

  const handleDocTypeChange = (docType: DocType, checked: boolean) => {
    setSelectedDocTypes((prev) =>
      checked ? [...prev, docType] : prev.filter((t) => t !== docType),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!applicationNumber.trim()) {
      setValidationError('Please enter a USPTO application number');
      return;
    }
    if (!isValidApplicationNumber(applicationNumber)) {
      setValidationError('Application number must be exactly 8 digits (e.g., 18818908)');
      return;
    }
    if (selectedDocTypes.length === 0) {
      setValidationError('Please select at least one document type');
      return;
    }
    setValidationError(null);
    setError(null);
    setIsLoading(true);
    setFileBlob(null);
    setFileName(null);

    const attorney = loadAttorney();
    const body: Record<string, unknown> = {
      applicationNumber: applicationNumber.trim(),
      // Numeric DocType values deserialize correctly on the [FromBody] endpoint
      // (System.Text.Json's enum converter accepts integer values).
      docTypes: selectedDocTypes,
    };
    if (docketNumber.trim()) body.docketNumber = docketNumber.trim();
    if (customerNumber.trim()) body.customerNumber = customerNumber.trim();
    if (attorney) {
      body.attorney = {
        firstName: attorney.firstName,
        middleName: attorney.middleName,
        lastName: attorney.lastName,
        phoneNumber: attorney.phone,
        registrationNumber: attorney.regNumber,
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(GENERATE_FROM_USPTO_URL, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        let message = `Request failed (${response.status})`;
        try {
          const data = await response.json();
          message = data?.error || data?.message || message;
        } catch {
          // non-JSON error body; keep the status-based message
        }
        setError(message);
        return;
      }

      const blob = await response.blob();

      let name = `uspto_${applicationNumber.trim()}`;
      const disposition = response.headers.get('content-disposition');
      const matches = disposition?.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)/i);
      if (matches && matches[1]) {
        name = decodeURIComponent(matches[1].replace(/['"]/g, ''));
      } else {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('pdf')) name += '.pdf';
        else if (contentType?.includes('zip')) name += '.zip';
        else name += '.bin';
      }

      setFileBlob(blob);
      setFileName(name);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Request timed out. Please try again.');
      } else {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      }
    } finally {
      clearTimeout(timeout);
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!fileBlob || !fileName) return;
    const url = URL.createObjectURL(fileBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleNew = () => {
    setApplicationNumber('');
    setDocketNumber('');
    setCustomerNumber('');
    setSelectedDocTypes([DocType.ADS, DocType.PowerOfAttorney, DocType.Inventor]);
    setValidationError(null);
    setError(null);
    setFileBlob(null);
    setFileName(null);
  };

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl font-semibold">USPTO Documents</CardTitle>
        <CardDescription>Enter a USPTO application number to generate documents</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="applicationNumber" className="text-sm font-medium text-foreground">
              Application Number
              <span className="font-normal text-muted-foreground"> *</span>
            </label>
            <Input
              id="applicationNumber"
              type="text"
              inputMode="numeric"
              placeholder="e.g., 18818908"
              value={applicationNumber}
              onChange={handleApplicationNumberChange}
              disabled={isLoading}
              className={validationError || error ? 'border-destructive focus-visible:ring-destructive' : ''}
              aria-describedby={validationError ? 'validation-error' : undefined}
            />
            {validationError && (
              <div id="validation-error" className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{validationError}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Attorney <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <AttorneySelect />
          </div>

          <div className="space-y-2">
            <label htmlFor="docketNumber" className="text-sm font-medium text-foreground">
              Docket Number <span className="font-normal text-muted-foreground">(optional, overrides USPTO)</span>
            </label>
            <Input
              id="docketNumber"
              type="text"
              placeholder="e.g., DIAG-P001i"
              value={docketNumber}
              onChange={(e) => setDocketNumber(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="customerNumber" className="text-sm font-medium text-foreground">
              Customer Number <span className="font-normal text-muted-foreground">(optional, overrides USPTO)</span>
            </label>
            <Input
              id="customerNumber"
              type="text"
              placeholder="e.g., 153965"
              value={customerNumber}
              onChange={(e) => setCustomerNumber(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">Document Type</Label>
            <div className="space-y-2">
              {USPTO_DOC_TYPE_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`usptoDocType-${option.value}`}
                    checked={selectedDocTypes.includes(option.value)}
                    onCheckedChange={(checked) => handleDocTypeChange(option.value, checked === true)}
                    disabled={isLoading}
                  />
                  <Label htmlFor={`usptoDocType-${option.value}`} className="text-sm font-normal cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
            {selectedDocTypes.length === 0 && (
              <p className="text-xs text-muted-foreground">Please select at least one document type</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitDisabled}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Preparing File.....
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

        {fileBlob && fileName && (
          <div className="mt-6 space-y-4">
            <div className="rounded-md bg-primary/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{fileName}</p>
                  <p className="text-xs text-muted-foreground">Ready to download</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleDownload} className="flex-1" variant="default">
                <Download className="mr-2 h-4 w-4" />
                Download File
              </Button>
              <Button onClick={handleNew} variant="outline">
                New
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

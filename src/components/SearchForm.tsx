import { useState, useEffect } from 'react';
import { Search, Download, Loader2, FileText, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppState } from '@/context/AppStateContext';
import { DocType, DOC_TYPE_OPTIONS, EntityType, ENTITY_TYPE_OPTIONS, MICRO_ENTITY_INFO } from '@/types/docTypes';
import { AttorneySelect } from '@/components/AttorneySelect';
import { loadAttorney } from '@/lib/attorneyStorage';

export const SearchForm = () => {
  const { documents, setDocumentsFormValues, searchFile, downloadFile, downloadIdsTemplate, resetDocuments } = useAppState();

  // Initialise local form fields from persisted context so they survive navigation
  const [pctNumber, setPctNumber] = useState(documents.pctNumber);
  const [selectedDocTypes, setSelectedDocTypes] = useState<DocType[]>(documents.docTypes);
  const [docketNumber, setDocketNumber] = useState(documents.docketNumber);
  const [customerNumber, setCustomerNumber] = useState(documents.customerNumber);
  const [numberOfSheets, setNumberOfSheets] = useState(documents.numberOfSheets);
  const [entityType, setEntityType] = useState<EntityType>(documents.entityType);
  const [validationError, setValidationError] = useState<string | null>(null);

  // IDS can be generated either from the database (existing flow) or from an uploaded Excel workbook.
  const [idsSource, setIdsSource] = useState<'database' | 'excel'>('database');
  const [idsExcelFile, setIdsExcelFile] = useState<File | null>(null);
  const [firstNamedInventor, setFirstNamedInventor] = useState('');

  // The sheet count only applies to the PCT Transmittal (PTO-1390) form.
  const showSheetsInput = selectedDocTypes.includes(DocType.PctTransmittal) || selectedDocTypes.includes(DocType.All);

  // IDS-from-Excel controls appear whenever IDS is generated - either selected directly or via "All".
  const isIdsSelected = selectedDocTypes.includes(DocType.IDS) || selectedDocTypes.includes(DocType.All);
  const useExcelIds = isIdsSelected && idsSource === 'excel';
  // "IDS only" (PCT optional) means IDS is the single selection - "All" always pulls other docs that need the PCT.
  const isIdsOnly = selectedDocTypes.length === 1 && selectedDocTypes.includes(DocType.IDS);
  // When generating IDS-only from Excel, PCT is not required - the Excel workbook is required instead
  // (enforced via isSearchDisabled / handleSearch below).
  const pctRequired = !(useExcelIds && isIdsOnly);

  // Keep context form values in sync (so they survive the next unmount)
  useEffect(() => {
    setDocumentsFormValues(pctNumber, selectedDocTypes, docketNumber, customerNumber, numberOfSheets, entityType);
  }, [pctNumber, selectedDocTypes, docketNumber, customerNumber, numberOfSheets, entityType, setDocumentsFormValues]);

  const validatePctFormat = (value: string): string | null => {
    const trimmed = value.trim().toUpperCase();
    if (!trimmed) return null;
    const pctRegex = /^PCT\/([A-Z]{2})(\d{4})\/(\d{6})$/;
    const match = trimmed.match(pctRegex);
    if (!match) return 'Format must be PCT/XX####/###### (e.g., PCT/US2024/001234)';
    const year = parseInt(match[2], 10);
    const currentYear = new Date().getFullYear();
    const minYear = currentYear - 4;
    if (year < minYear || year > currentYear) return `Year must be between ${minYear} and ${currentYear}`;
    return null;
  };

  const isValidPctNumber = (value: string): boolean =>
    validatePctFormat(value) === null && value.trim() !== '';

  const validateInput = (value: string): boolean => {
    if (!value.trim()) { setValidationError('Please enter a PCT number'); return false; }
    if (!isValidPctNumber(value)) { setValidationError('PCT number must start with PCT'); return false; }
    setValidationError(null);
    return true;
  };

  const isSearchDisabled =
    documents.isLoading ||
    selectedDocTypes.length === 0 ||
    (pctRequired && (!pctNumber.trim() || !isValidPctNumber(pctNumber))) ||
    (useExcelIds && !idsExcelFile);

  const handleDocTypeChange = (docType: DocType, checked: boolean) => {
    if (docType === DocType.All) {
      setSelectedDocTypes(checked ? [DocType.All] : []);
    } else {
      setSelectedDocTypes(prev => {
        const withoutAll = prev.filter(t => t !== DocType.All);
        return checked ? [...withoutAll, docType] : withoutAll.filter(t => t !== docType);
      });
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pctRequired && !validateInput(pctNumber)) return;
    if (selectedDocTypes.length === 0) { setValidationError('Please select at least one document type'); return; }
    if (useExcelIds && !idsExcelFile) { setValidationError('Please upload an IDS Excel file (.xlsx)'); return; }
    setValidationError(null);
    await searchFile(
      pctNumber.trim(),
      selectedDocTypes,
      loadAttorney(),
      docketNumber.trim(),
      customerNumber.trim(),
      numberOfSheets.trim(),
      useExcelIds ? idsExcelFile : null,
      useExcelIds ? firstNamedInventor.trim() : undefined,
      entityType,
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPctNumber(value);
    const formatError = validatePctFormat(value);
    if (value.trim() && formatError) setValidationError(formatError);
    else if (validationError) setValidationError(null);
    if (documents.fileBlob) resetDocuments();
  };

  const handleNewSearch = () => {
    setPctNumber('');
    setSelectedDocTypes([]);
    setDocketNumber('');
    setCustomerNumber('');
    setNumberOfSheets('');
    setEntityType(EntityType.Large);
    setIdsSource('database');
    setIdsExcelFile(null);
    setFirstNamedInventor('');
    setValidationError(null);
    resetDocuments();
  };

  const { isLoading, error, fileBlob, fileName } = documents;

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl font-semibold">PCT to U.S. Document Preparation</CardTitle>
        <CardDescription>Enter your PCT number to generate the documents</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="pctNumber" className="text-sm font-medium text-foreground">
              PCT Number
              {pctRequired && <span className="font-normal text-muted-foreground"> *</span>}
              {!pctRequired && <span className="font-normal text-muted-foreground"> (optional)</span>}
            </label>
            <Input
              id="pctNumber"
              type="text"
              placeholder="e.g., PCT/US2024/001234"
              value={pctNumber}
              onChange={handleInputChange}
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
              Docket Number <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="docketNumber"
              type="text"
              placeholder="e.g., ABC-1234"
              value={docketNumber}
              onChange={(e) => setDocketNumber(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="customerNumber" className="text-sm font-medium text-foreground">
              Customer Number <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="customerNumber"
              type="text"
              placeholder="e.g., 12345"
              value={customerNumber}
              onChange={(e) => setCustomerNumber(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {showSheetsInput && (
            <div className="space-y-2">
              <label htmlFor="numberOfSheets" className="text-sm font-medium text-foreground">
                Number of Sheets <span className="font-normal text-muted-foreground">(incl. drawings, for PCT Transmittal)</span>
              </label>
              <Input
                id="numberOfSheets"
                type="number"
                min={1}
                placeholder="e.g., 120"
                value={numberOfSheets}
                onChange={(e) => setNumberOfSheets(e.target.value)}
                disabled={isLoading}
              />
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <Label className="text-sm font-medium text-foreground">Select Entity Type</Label>
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="Micro Entity qualification requirements"
                      className="text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    align="start"
                    className="max-w-sm max-h-[70vh] overflow-y-auto space-y-2 text-xs leading-relaxed"
                  >
                    <p>{MICRO_ENTITY_INFO.intro}</p>
                    <ul className="space-y-1.5">
                      {MICRO_ENTITY_INFO.requirements.map((req) => (
                        <li key={req.label}>
                          <span className="font-semibold">{req.label}</span> {req.text}
                        </li>
                      ))}
                    </ul>
                    {MICRO_ENTITY_INFO.notes.map((note) => (
                      <p key={note}>{note}</p>
                    ))}
                    <a
                      href={MICRO_ENTITY_INFO.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block underline underline-offset-2"
                    >
                      {MICRO_ENTITY_INFO.linkText}
                    </a>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <RadioGroup
              value={entityType}
              onValueChange={(value) => setEntityType(value as EntityType)}
              disabled={isLoading}
              className="space-y-1"
            >
              {ENTITY_TYPE_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={`entityType-${option.value}`} />
                  <Label htmlFor={`entityType-${option.value}`} className="text-sm font-normal cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">Document Type</Label>
            <div className="space-y-2">
              {DOC_TYPE_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`docType-${option.value}`}
                    checked={selectedDocTypes.includes(option.value)}
                    onCheckedChange={(checked) => handleDocTypeChange(option.value, checked === true)}
                    disabled={isLoading || (selectedDocTypes.includes(DocType.All) && option.value !== DocType.All)}
                  />
                  <Label htmlFor={`docType-${option.value}`} className="text-sm font-normal cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
            {selectedDocTypes.length === 0 && pctNumber.trim() && !validationError && (
              <p className="text-xs text-muted-foreground">Please select at least one document type</p>
            )}
          </div>

          {isIdsSelected && (
            <div className="space-y-3 rounded-md border border-border p-3">
              <Label className="text-sm font-medium text-foreground">IDS Source</Label>
              <RadioGroup
                value={idsSource}
                onValueChange={(value) => setIdsSource(value as 'database' | 'excel')}
                disabled={isLoading}
                className="space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="database" id="idsSource-database" />
                  <Label htmlFor="idsSource-database" className="text-sm font-normal cursor-pointer">From PCT Search Report</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="excel" id="idsSource-excel" />
                  <Label htmlFor="idsSource-excel" className="text-sm font-normal cursor-pointer">From Excel</Label>
                </div>
              </RadioGroup>

              {useExcelIds && (
                <div className="space-y-3 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={downloadIdsTemplate}
                    disabled={isLoading}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download IDS Template
                  </Button>
                  <div className="space-y-2">
                    <label htmlFor="idsExcelFile" className="text-sm font-medium text-foreground">
                      IDS Workbook <span className="font-normal text-muted-foreground">(.xlsx)</span>
                    </label>
                    <Input
                      id="idsExcelFile"
                      type="file"
                      accept=".xlsx"
                      onChange={(e) => setIdsExcelFile(e.target.files?.[0] ?? null)}
                      disabled={isLoading}
                    />
                    {idsExcelFile && (
                      <p className="text-xs text-muted-foreground truncate">Selected: {idsExcelFile.name}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="firstNamedInventor" className="text-sm font-medium text-foreground">
                      First Named Inventor <span className="font-normal text-muted-foreground">(optional)</span>
                    </label>
                    <Input
                      id="firstNamedInventor"
                      type="text"
                      placeholder="e.g., John A. Smith"
                      value={firstNamedInventor}
                      onChange={(e) => setFirstNamedInventor(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSearchDisabled}>
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
              <Button onClick={downloadFile} className="flex-1" variant="default">
                <Download className="mr-2 h-4 w-4" />
                Download File
              </Button>
              <Button onClick={handleNewSearch} variant="outline">
                New Search
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

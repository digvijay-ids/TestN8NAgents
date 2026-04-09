import { useState } from 'react';
import { Search, Download, Loader2, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useFileSearch } from '@/hooks/useFileSearch';
import { DocType, DOC_TYPE_OPTIONS } from '@/types/docTypes';

/**
 * SearchForm Component
 * A centered form for searching application files by application number
 */
export const SearchForm = () => {
  const [pctNumber, setPctNumber] = useState('');
  const [selectedDocTypes, setSelectedDocTypes] = useState<DocType[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const { isLoading, error, fileBlob, fileName, searchFile, downloadFile, reset } = useFileSearch();

  /**
   * Get validation error message for PCT number
   * Format: PCT/XX####/######
   * - Starts with PCT/
   * - Followed by 2 alphabets (country code)
   * - Followed by 4-digit year (current year to current year - 4)
   * - Followed by /
   * - Followed by 6 digits
   */
  const validatePctFormat = (value: string): string | null => {
    const trimmed = value.trim().toUpperCase();
    
    if (!trimmed) {
      return null; // Empty is handled separately
    }
    
    // Check basic format with regex: PCT/XX####/######
    const pctRegex = /^PCT\/([A-Z]{2})(\d{4})\/(\d{6})$/;
    const match = trimmed.match(pctRegex);
    
    if (!match) {
      return 'Format must be PCT/XX####/###### (e.g., PCT/US2024/001234)';
    }
    
    // Validate year range
    const year = parseInt(match[2], 10);
    const currentYear = new Date().getFullYear();
    const minYear = currentYear - 4;
    
    if (year < minYear || year > currentYear) {
      return `Year must be between ${minYear} and ${currentYear}`;
    }
    
    return null; // Valid
  };

  /**
   * Check if PCT number is valid
   */
  const isValidPctNumber = (value: string): boolean => {
    return validatePctFormat(value) === null && value.trim() !== '';
  };

  /**
   * Validate input before submission
   */
  const validateInput = (value: string): boolean => {
    if (!value.trim()) {
      setValidationError('Please enter a PCT number');
      return false;
    }
    if (!isValidPctNumber(value)) {
      setValidationError('PCT number must start with PCT');
      return false;
    }
    setValidationError(null);
    return true;
  };

  /**
   * Check if search button should be disabled
   */
  const isSearchDisabled = !pctNumber.trim() || !isValidPctNumber(pctNumber) || selectedDocTypes.length === 0 || isLoading;

  /**
   * Handle document type selection change
   */
  const handleDocTypeChange = (docType: DocType, checked: boolean) => {
    if (docType === DocType.All) {
      // If "All" is selected, clear other selections
      setSelectedDocTypes(checked ? [DocType.All] : []);
    } else {
      // If any other type is selected, remove "All" from selection
      setSelectedDocTypes(prev => {
        const withoutAll = prev.filter(t => t !== DocType.All);
        if (checked) {
          return [...withoutAll, docType];
        }
        return withoutAll.filter(t => t !== docType);
      });
    }
  };

  /**
   * Handle search form submission
   */
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateInput(pctNumber)) {
      return;
    }

    if (selectedDocTypes.length === 0) {
      setValidationError('Please select at least one document type');
      return;
    }
    
    await searchFile(pctNumber.trim(), selectedDocTypes);
  };

  /**
   * Handle input change
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPctNumber(value);
    
    // Update validation error in real-time
    const formatError = validatePctFormat(value);
    if (value.trim() && formatError) {
      setValidationError(formatError);
    } else if (validationError) {
      setValidationError(null);
    }
    
    // Clear previous search results when input changes
    if (fileBlob) {
      reset();
    }
  };

  /**
   * Handle new search
   */
  const handleNewSearch = () => {
    setPctNumber('');
    setSelectedDocTypes([]);
    setValidationError(null);
    reset();
  };

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl font-semibold">Document Filling System</CardTitle>
        <CardDescription>
          Enter your PCT number to retrieve the document
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSearch} className="space-y-4">
          {/* PCT Number Input */}
          <div className="space-y-2">
            <label htmlFor="pctNumber" className="text-sm font-medium text-foreground">
              PCT Number
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
            
            {/* Validation Error Message */}
            {validationError && (
              <div id="validation-error" className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{validationError}</span>
              </div>
            )}
          </div>

          {/* Document Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">
              Document Type
            </Label>
            <div className="space-y-2">
              {DOC_TYPE_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`docType-${option.value}`}
                    checked={selectedDocTypes.includes(option.value)}
                    onCheckedChange={(checked) => 
                      handleDocTypeChange(option.value, checked === true)
                    }
                    disabled={isLoading || (selectedDocTypes.includes(DocType.All) && option.value !== DocType.All)}
                  />
                  <Label
                    htmlFor={`docType-${option.value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
            {selectedDocTypes.length === 0 && pctNumber.trim() && !validationError && (
              <p className="text-xs text-muted-foreground">
                Please select at least one document type
              </p>
            )}
          </div>

          {/* Search Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSearchDisabled}
          >
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

        {/* API Error Message */}
        {error && (
          <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Download Section - Shown when file is available */}
        {fileBlob && fileName && (
          <div className="mt-6 space-y-4">
            <div className="rounded-md bg-primary/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {fileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ready to download
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={downloadFile}
                className="flex-1"
                variant="default"
              >
                <Download className="mr-2 h-4 w-4" />
                Download File
              </Button>
              <Button
                onClick={handleNewSearch}
                variant="outline"
              >
                New Search
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

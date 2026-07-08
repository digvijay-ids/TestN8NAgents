import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, X, UserSearch, Check, Mail, Phone, MapPin } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandItem } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Attorney } from '@/types/attorney';
import { searchAttorneys } from '@/lib/attorneySearch';
import { loadAttorney, saveAttorney, clearAttorney } from '@/lib/attorneyStorage';

const DEBOUNCE_MS = 300;

export const AttorneySelect = () => {
  const [selected, setSelected] = useState<Attorney | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Attorney[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Pre-select the persisted attorney on mount.
  useEffect(() => {
    setSelected(loadAttorney());
  }, []);

  // Debounced search whenever the query changes (only while the popover is open).
  const requestIdRef = useRef(0);
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      setResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    const requestId = ++requestIdRef.current;

    const timer = setTimeout(async () => {
      try {
        const matches = await searchAttorneys(q);
        if (requestId === requestIdRef.current) {
          setResults(matches);
          setIsSearching(false);
        }
      } catch {
        if (requestId === requestIdRef.current) {
          setSearchError('Search failed, try again');
          setResults([]);
          setIsSearching(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, open]);

  const handleSelect = useCallback((attorney: Attorney) => {
    saveAttorney(attorney);
    setSelected(attorney);
    setOpen(false);
    setQuery('');
    setResults([]);
  }, []);

  const handleClear = useCallback(() => {
    clearAttorney();
    setSelected(null);
  }, []);

  if (selected) {
    return (
      <div className="rounded-md border bg-primary/5 p-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0 space-y-0.5">
            <p className="text-sm font-medium text-foreground truncate">{selected.name}</p>
            <p className="text-xs text-muted-foreground">Reg. No. {selected.regNumber}</p>
            {selected.email && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                <Mail className="h-3 w-3 shrink-0" />
                {selected.email}
              </p>
            )}
            {selected.phone && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                <Phone className="h-3 w-3 shrink-0" />
                {selected.phone}
              </p>
            )}
            {selected.address && (
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                <span>{selected.address}</span>
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={handleClear}
            aria-label="Clear attorney selection"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-start font-normal text-muted-foreground">
          <UserSearch className="mr-2 h-4 w-4" />
          Select attorney
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by reg. number or name"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {isSearching && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </div>
            )}
            {!isSearching && searchError && (
              <div className="py-6 text-center text-sm text-destructive">{searchError}</div>
            )}
            {!isSearching && !searchError && query.trim() && results.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">No attorney found</div>
            )}
            {!isSearching && !searchError && !query.trim() && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Type a registration number or name
              </div>
            )}
            {!isSearching &&
              !searchError &&
              results.map((attorney) => (
                <CommandItem
                  key={attorney.regNumber}
                  value={attorney.regNumber}
                  onSelect={() => handleSelect(attorney)}
                  className="cursor-pointer"
                >
                  <Check className="mr-2 h-4 w-4 opacity-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{attorney.name}</p>
                    <p className="text-xs text-muted-foreground">Reg. No. {attorney.regNumber}</p>
                  </div>
                </CommandItem>
              ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

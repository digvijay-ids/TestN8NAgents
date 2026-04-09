import { useState } from 'react';
import { Copy, Plus, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface WipoClaim {
  claim_no: number;
  text: string;
}

interface UsClaim {
  claim_no: number;
  text: string;
  claim_type: string;
  depends_on: number[];
}

interface ClaimsComparisonProps {
  wipoClaims: WipoClaim[];
  initialUsClaims: UsClaim[];
}

export const ClaimsComparison = ({ wipoClaims, initialUsClaims }: ClaimsComparisonProps) => {
  const [usClaims, setUsClaims] = useState<UsClaim[]>(initialUsClaims);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleClaimTextChange = (index: number, newText: string) => {
    setUsClaims(prev => prev.map((c, i) => i === index ? { ...c, text: newText } : c));
  };

  const handleDeleteClaim = (index: number) => {
    setUsClaims(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddClaim = () => {
    const nextNum = usClaims.length > 0 ? Math.max(...usClaims.map(c => c.claim_no)) + 1 : 1;
    setUsClaims(prev => [...prev, { claim_no: nextNum, text: '', claim_type: 'dependent', depends_on: [] }]);
  };

  const handleCopyAll = async () => {
    const text = usClaims.map(c => `${c.claim_no}. ${c.text}`).join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: 'Copied!', description: 'US Compliant Claims copied to clipboard.' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Copy failed', description: 'Please select and copy manually.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">WIPO → US Claims Comparison</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Panel - WIPO Claims (read-only) */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-3 bg-secondary text-secondary-foreground font-medium text-sm">
            Original WIPO Claims
          </div>
          <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto bg-card">
            {wipoClaims.map((claim) => (
              <div key={claim.claim_no} className="rounded-md border border-border p-3 bg-background">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Claim {claim.claim_no}</p>
                <p className="text-sm text-foreground leading-relaxed">{claim.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - US Compliant Claims (editable) */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-3 bg-primary text-primary-foreground font-medium text-sm flex items-center justify-between">
            <span>US Compliant Claims</span>
            <Button
              size="sm"
              variant="secondary"
              className="h-7 text-xs gap-1"
              onClick={handleCopyAll}
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied' : 'Copy Claims'}
            </Button>
          </div>
          <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto bg-card">
            {usClaims.map((claim, index) => (
              <div key={`${claim.claim_no}-${index}`} className="rounded-md border border-border p-3 bg-background">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Claim {claim.claim_no}
                    <span className="ml-2 text-xs font-normal opacity-70">({claim.claim_type})</span>
                  </p>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteClaim(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <Textarea
                  value={claim.text}
                  onChange={(e) => handleClaimTextChange(index, e.target.value)}
                  className="text-sm min-h-[60px] resize-y"
                  rows={Math.max(2, Math.ceil(claim.text.length / 80))}
                />
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1"
              onClick={handleAddClaim}
            >
              <Plus className="h-3 w-3" />
              Add Claim
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

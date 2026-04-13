import { useState, useCallback } from 'react';
import { REQUEST_TIMEOUT } from '@/config/api';

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

export interface ClaimsState {
  isLoading: boolean;
  loadingStep: string | null;
  error: string | null;
  wipoClaims: WipoClaim[];
  usClaims: UsClaim[];
}

const CLAIMS_API_BASE = 'https://noetherip-d-doc-filling.azurewebsites.net/api/DocProcessing/claims';
const N8N_WEBHOOK_URL = 'https://n8n.noetherip.com/webhook/v1/wipo-claims?model=LocalLLM';

export const useClaimsSearch = () => {
  const [state, setState] = useState<ClaimsState>({
    isLoading: false,
    loadingStep: null,
    error: null,
    wipoClaims: [],
    usClaims: [],
  });

  const fetchClaims = useCallback(async (pctNumber: string) => {
    setState({ isLoading: true, loadingStep: 'Fetching WIPO claims...', error: null, wipoClaims: [], usClaims: [] });

    try {
      // Step 1: Fetch WIPO claims
      const controller1 = new AbortController();
      const timeout1 = setTimeout(() => controller1.abort(), REQUEST_TIMEOUT);

      const encodedPct = encodeURIComponent(pctNumber.trim());
      const claimsRes = await fetch(`${CLAIMS_API_BASE}?pctNumber=${encodedPct}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: controller1.signal,
      });
      clearTimeout(timeout1);

      if (!claimsRes.ok) {
        if (claimsRes.status === 404) throw new Error('Application not found. Please check the PCT number.');
        let msg = `Error: ${claimsRes.status} - ${claimsRes.statusText}`;
        try { const d = await claimsRes.json(); if (d.message) msg = d.message; } catch {}
        throw new Error(msg);
      }

      const claimsData = await claimsRes.json();
      const rawClaims: Array<{ claimId: string; plainText: string; sequence: number }> = claimsData.claims || [];

      // Group by claimId and concatenate plainText
      const grouped = new Map<string, string>();
      const sorted = [...rawClaims].sort((a, b) => a.sequence - b.sequence);
      for (const c of sorted) {
        grouped.set(c.claimId, (grouped.get(c.claimId) || '') + c.plainText.trim() + ' ');
      }

      const wipoClaims: WipoClaim[] = Array.from(grouped.entries()).map(([id, text]) => ({
        claim_no: parseInt(id, 10),
        text: text.trim(),
      }));

      setState(prev => ({ ...prev, loadingStep: 'Generating US compliant claims...' }));

      // Step 2: POST to n8n webhook
      const controller2 = new AbortController();
      const timeout2 = setTimeout(() => controller2.abort(), 120000); // longer timeout for AI processing

      const webhookRes = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claims: wipoClaims }),
        signal: controller2.signal,
      });
      clearTimeout(timeout2);

      if (!webhookRes.ok) {
        throw new Error(`US Claims API error: ${webhookRes.status} - ${webhookRes.statusText}`);
      }

      const webhookData = await webhookRes.json();
      const usClaims: UsClaim[] = webhookData.output_claims?.claims_json || [];

      setState({
        isLoading: false,
        loadingStep: null,
        error: null,
        wipoClaims,
        usClaims,
      });
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.name === 'AbortError' ? 'Request timed out. Please try again.' : err.message
        : 'An unexpected error occurred';
      setState({ isLoading: false, loadingStep: null, error: errorMessage, wipoClaims: [], usClaims: [] });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ isLoading: false, loadingStep: null, error: null, wipoClaims: [], usClaims: [] });
  }, []);

  return { ...state, fetchClaims, reset };
};

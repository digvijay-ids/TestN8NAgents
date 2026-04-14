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
  submitted: boolean;
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
    submitted: false,
  });

  const fetchClaims = useCallback(async (pctNumber: string, email: string) => {
    setState({ isLoading: true, loadingStep: 'Fetching WIPO claims...', error: null, wipoClaims: [], usClaims: [], submitted: false });

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
     
      const wipoClaims: WipoClaim[] = claimsData.claims || [];

      setState(prev => ({ ...prev, loadingStep: 'Submitting claims for processing...' }));

      // Step 2: POST to n8n webhook — fire and forget
      const webhookUrl = `${N8N_WEBHOOK_URL}&email=${encodeURIComponent(email)}`;
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wipoClaims),
      }).catch((err) => {
        console.warn('N8N webhook fire-and-forget error:', err);
      });

      setState({
        isLoading: false,
        loadingStep: null,
        error: null,
        wipoClaims,
        usClaims: [],
        submitted: true,
      });
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.name === 'AbortError' ? 'Request timed out. Please try again.' : err.message
        : 'An unexpected error occurred';
      setState({ isLoading: false, loadingStep: null, error: errorMessage, wipoClaims: [], usClaims: [], submitted: false });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ isLoading: false, loadingStep: null, error: null, wipoClaims: [], usClaims: [], submitted: false });
  }, []);

  return { ...state, fetchClaims, reset };
};

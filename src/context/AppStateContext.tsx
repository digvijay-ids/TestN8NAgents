import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { GENERATE_DOC_URL, API_HEADERS, REQUEST_TIMEOUT } from '@/config/api';
import { DocType } from '@/types/docTypes';

// ─── Documents page state ────────────────────────────────────────────────────

export interface DocumentsState {
  isLoading: boolean;
  error: string | null;
  fileBlob: Blob | null;
  fileName: string | null;
  pctNumber: string;
  docTypes: DocType[];
}

const defaultDocumentsState: DocumentsState = {
  isLoading: false,
  error: null,
  fileBlob: null,
  fileName: null,
  pctNumber: '',
  docTypes: [],
};

// ─── Claims page state ───────────────────────────────────────────────────────

interface WipoClaim {
  claim_no: number;
  text: string;
}

export interface ClaimsState {
  isLoading: boolean;
  loadingStep: string | null;
  error: string | null;
  wipoClaims: WipoClaim[];
  submitted: boolean;
  pctNumber: string;
  email: string;
}

const defaultClaimsState: ClaimsState = {
  isLoading: false,
  loadingStep: null,
  error: null,
  wipoClaims: [],
  submitted: false,
  pctNumber: '',
  email: '',
};

const CLAIMS_API_BASE = 'https://noetherip-d-doc-filling.azurewebsites.net/api/DocProcessing/claims';
const N8N_WEBHOOK_URL = 'https://n8n.noetherip.com/webhook/v1/wipo-claims?model=LocalLLM';

// ─── Context shape ────────────────────────────────────────────────────────────

interface AppStateContextValue {
  documents: DocumentsState;
  setDocumentsFormValues: (pctNumber: string, docTypes: DocType[]) => void;
  searchFile: (pctNumber: string, docTypes: DocType[]) => Promise<void>;
  downloadFile: () => void;
  resetDocuments: () => void;

  claims: ClaimsState;
  setClaimsFormValues: (pctNumber: string, email: string) => void;
  fetchClaims: (pctNumber: string, email: string) => Promise<void>;
  resetClaims: () => void;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AppStateProvider = ({ children }: { children: ReactNode }) => {
  const [documents, setDocuments] = useState<DocumentsState>(defaultDocumentsState);
  const [claims, setClaims] = useState<ClaimsState>(defaultClaimsState);

  // Documents helpers
  const setDocumentsFormValues = useCallback((pctNumber: string, docTypes: DocType[]) => {
    setDocuments(prev => ({ ...prev, pctNumber, docTypes }));
  }, []);

  const searchFile = useCallback(async (pctNumber: string, docTypes: DocType[]) => {
    setDocuments({
      isLoading: true,
      error: null,
      fileBlob: null,
      fileName: null,
      pctNumber,
      docTypes,
    });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const response = await fetch(GENERATE_DOC_URL, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify({ pctNumber, docTypes: docTypes.map(String) }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `Error: ${response.status} - ${response.statusText}`;
        if (response.status === 500) {
          try {
            const errorData = await response.json();
            if (errorData.message) errorMessage = errorData.message;
          } catch { /* ignore parse errors */ }
        } else if (response.status === 404) {
          errorMessage = 'Application not found. Please check the PCT number.';
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      let fileName = `document_${pctNumber.replace(/\//g, '_')}`;

      if (contentDisposition) {
        const matches = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (matches && matches[1]) fileName = matches[1].replace(/['"]/g, '');
      } else {
        const contentType = response.headers.get('Content-Type');
        if (contentType?.includes('pdf')) fileName += '.pdf';
        else if (contentType?.includes('zip')) fileName += '.zip';
        else fileName += '.bin';
      }

      setDocuments(prev => ({ ...prev, isLoading: false, error: null, fileBlob: blob, fileName }));
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.name === 'AbortError'
            ? 'Request timed out. Please try again.'
            : err.message
          : 'An unexpected error occurred';

      setDocuments(prev => ({ ...prev, isLoading: false, error: errorMessage, fileBlob: null, fileName: null }));
    }
  }, []);

  const downloadFile = useCallback(() => {
    if (documents.fileBlob && documents.fileName) {
      const url = URL.createObjectURL(documents.fileBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = documents.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }, [documents.fileBlob, documents.fileName]);

  const resetDocuments = useCallback(() => {
    setDocuments(defaultDocumentsState);
  }, []);

  // Claims helpers
  const setClaimsFormValues = useCallback((pctNumber: string, email: string) => {
    setClaims(prev => ({ ...prev, pctNumber, email }));
  }, []);

  const fetchClaims = useCallback(async (pctNumber: string, email: string) => {
    setClaims({
      isLoading: true,
      loadingStep: 'Fetching WIPO claims...',
      error: null,
      wipoClaims: [],
      submitted: false,
      pctNumber,
      email,
    });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const encodedPct = encodeURIComponent(pctNumber.trim());
      const claimsRes = await fetch(`${CLAIMS_API_BASE}?pctNumber=${encodedPct}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!claimsRes.ok) {
        if (claimsRes.status === 404) throw new Error('Application not found. Please check the PCT number.');
        let msg = `Error: ${claimsRes.status} - ${claimsRes.statusText}`;
        try {
          const d = await claimsRes.json();
          if (d.message) msg = d.message;
        } catch { /* ignore parse errors */ }
        throw new Error(msg);
      }

      const claimsData = await claimsRes.json();
      const wipoClaims: WipoClaim[] = claimsData.claims || [];

      setClaims(prev => ({ ...prev, loadingStep: 'Submitting claims for processing...' }));

      const webhookUrl = `${N8N_WEBHOOK_URL}&email=${encodeURIComponent(email)}`;
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wipoClaims),
      }).catch((err) => {
        console.warn('N8N webhook fire-and-forget error:', err);
      });

      setClaims(prev => ({
        ...prev,
        isLoading: false,
        loadingStep: null,
        error: null,
        wipoClaims,
        submitted: true,
      }));
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.name === 'AbortError'
            ? 'Request timed out. Please try again.'
            : err.message
          : 'An unexpected error occurred';

      setClaims(prev => ({
        ...prev,
        isLoading: false,
        loadingStep: null,
        error: errorMessage,
        wipoClaims: [],
        submitted: false,
      }));
    }
  }, []);

  const resetClaims = useCallback(() => {
    setClaims(defaultClaimsState);
  }, []);

  return (
    <AppStateContext.Provider
      value={{
        documents,
        setDocumentsFormValues,
        searchFile,
        downloadFile,
        resetDocuments,
        claims,
        setClaimsFormValues,
        fetchClaims,
        resetClaims,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useAppState = (): AppStateContextValue => {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
};

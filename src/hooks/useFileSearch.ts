import { useState, useCallback } from 'react';
import { GENERATE_DOC_URL, API_HEADERS, REQUEST_TIMEOUT } from '@/config/api';
import { DocType } from '@/types/docTypes';

/**
 * Custom hook for searching and downloading application files
 */
export interface FileSearchState {
  isLoading: boolean;
  error: string | null;
  fileBlob: Blob | null;
  fileName: string | null;
}

export const useFileSearch = () => {
  const [state, setState] = useState<FileSearchState>({
    isLoading: false,
    error: null,
    fileBlob: null,
    fileName: null,
  });

  /**
   * Search for an application file by PCT number and document types
   * @param pctNumber - The PCT number to search for
   * @param docTypes - Array of document types to generate
   */
  const searchFile = useCallback(async (pctNumber: string, docTypes: DocType[]) => {
    // Reset state and start loading
    setState({
      isLoading: true,
      error: null,
      fileBlob: null,
      fileName: null,
    });

    try {
      // Create AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      // Make API request using POST with JSON body
      const response = await fetch(GENERATE_DOC_URL, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify({
          pctNumber,
          docTypes: docTypes.map(String),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle non-OK responses
      if (!response.ok) {
        let errorMessage = `Error: ${response.status} - ${response.statusText}`;
        
        if (response.status === 500) {
          try {
            const errorData = await response.json();
            if (errorData.message) {
              errorMessage = errorData.message;
            }
          } catch {
            // If JSON parsing fails, use default message
          }
        } else if (response.status === 404) {
          errorMessage = 'Application not found. Please check the PCT number.';
        }
        
        throw new Error(errorMessage);
      }

      // Get the file blob from response
      const blob = await response.blob();

      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let fileName = `document_${pctNumber.replace(/\//g, '_')}`;
      
      if (contentDisposition) {
        const matches = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (matches && matches[1]) {
          fileName = matches[1].replace(/['"]/g, '');
        }
      } else {
        // Determine file extension from content type
        const contentType = response.headers.get('Content-Type');
        if (contentType?.includes('pdf')) {
          fileName += '.pdf';
        } else if (contentType?.includes('zip')) {
          fileName += '.zip';
        } else {
          fileName += '.bin';
        }
      }

      setState({
        isLoading: false,
        error: null,
        fileBlob: blob,
        fileName,
      });
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.name === 'AbortError'
          ? 'Request timed out. Please try again.'
          : err.message
        : 'An unexpected error occurred';

      setState({
        isLoading: false,
        error: errorMessage,
        fileBlob: null,
        fileName: null,
      });
    }
  }, []);

  /**
   * Download the retrieved file
   */
  const downloadFile = useCallback(() => {
    if (state.fileBlob && state.fileName) {
      const url = URL.createObjectURL(state.fileBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = state.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }, [state.fileBlob, state.fileName]);

  /**
   * Reset the search state
   */
  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      fileBlob: null,
      fileName: null,
    });
  }, []);

  return {
    ...state,
    searchFile,
    downloadFile,
    reset,
  };
};

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ContinuityPage from './ContinuityPage';
import { resetDocketMapForTest } from '@/lib/docketMap';

// sonner renders a portal we don't assert on; stub it to keep the DOM clean.
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

beforeEach(() => resetDocketMapForTest());

const XML = `<?xml version="1.0"?><PairCustomerList>
  <PairCustomer><applId>18210593</applId><attyDktNo>UPLOAD-DKT</attyDktNo></PairCustomer>
</PairCustomerList>`;

describe('ContinuityPage upload', () => {
  it('shows an upload control on the initial search card', () => {
    render(<ContinuityPage />);
    expect(screen.getByText(/Upload docket XML/i)).toBeInTheDocument();
  });

  it('merges an uploaded XML into the docket map', async () => {
    render(<ContinuityPage />);
    const input = screen.getByTestId('docket-xml-input') as HTMLInputElement;
    const file = new File([XML], 'export.xml', { type: 'text/xml' });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => {
      // stored map updated
      expect(localStorage.getItem('patmemo:docketMap')).toContain('UPLOAD-DKT');
    });
  });
});

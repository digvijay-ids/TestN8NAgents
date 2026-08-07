import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContinuityTree } from './ContinuityTree';
import { resetDocketMapForTest, mergeDocketMap } from '@/lib/docketMap';
import type { PatentFileWrapper } from '@/types/continuity';

beforeEach(() => resetDocketMapForTest());

const wrapper: PatentFileWrapper = {
  applicationNumberText: '18210593',
  parentContinuityBag: [
    {
      parentApplicationNumberText: '16394220',
      parentApplicationFilingDate: '2019-04-25',
      parentApplicationStatusCode: 150,
      parentApplicationStatusDescriptionText: 'Patented',
      childApplicationNumberText: '18210593',
    },
  ],
};

describe('ContinuityTree docket labels', () => {
  it('renders docket next to a mapped app number', () => {
    mergeDocketMap({ '16394220': 'PARENT-DKT', '18210593': 'CHILD-DKT' });
    render(<ContinuityTree wrapper={wrapper} />);
    expect(screen.getByText(/PARENT-DKT/)).toBeInTheDocument();
    expect(screen.getByText(/CHILD-DKT/)).toBeInTheDocument();
  });

  it('renders no docket text when unmapped', () => {
    render(<ContinuityTree wrapper={wrapper} />);
    expect(screen.queryByText(/PARENT-DKT/)).not.toBeInTheDocument();
  });
});

describe('ContinuityTree nested descendants', () => {
  it('nests a grandchild under its real parent, not the queried app', () => {
    // Query A. B is a continuation of A; C is a continuation of B.
    const nested: PatentFileWrapper = {
      applicationNumberText: '10000000',
      childContinuityBag: [
        {
          parentApplicationNumberText: '10000000',
          childApplicationNumberText: '11000000',
          claimParentageTypeCodeDescriptionText: 'is a Continuation of',
          childApplicationFilingDate: '2022-01-01',
        },
        {
          parentApplicationNumberText: '11000000',
          childApplicationNumberText: '12000000',
          claimParentageTypeCodeDescriptionText: 'is a Continuation of',
          childApplicationFilingDate: '2023-01-01',
        },
      ],
    };
    mergeDocketMap({ '10000000': 'A-DKT', '11000000': 'B-DKT', '12000000': 'C-DKT' });
    render(<ContinuityTree wrapper={nested} />);

    // Grandchild C is deeper (more left padding) than child B — proves nesting.
    const rowC = screen.getByText(/C-DKT/).closest('div[style]') as HTMLElement;
    const rowB = screen.getByText(/B-DKT/).closest('div[style]') as HTMLElement;
    const pad = (el: HTMLElement) => parseFloat(el.style.paddingLeft || '0');
    expect(pad(rowC)).toBeGreaterThan(pad(rowB));
  });
});

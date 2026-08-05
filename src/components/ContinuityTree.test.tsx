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

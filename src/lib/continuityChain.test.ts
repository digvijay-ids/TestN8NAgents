import { describe, it, expect } from 'vitest';
import { buildContinuityForest, type ContinuityNode } from './continuityChain';
import type { PatentFileWrapper } from '@/types/continuity';

/** Flatten a forest to `app:parentageType` pairs for easy assertions. */
function edgesOf(roots: ContinuityNode[]): string[] {
  const out: string[] = [];
  const walk = (n: ContinuityNode, parent?: string) => {
    if (parent) out.push(`${parent}->${n.appNumber}:${n.parentageType ?? ''}`);
    n.children.forEach((c) => walk(c, n.appNumber));
  };
  roots.forEach((r) => walk(r));
  return out;
}

describe('buildContinuityForest', () => {
  it('nests descendants under their real parent, not the queried app', () => {
    // Query A. B is a continuation of A; C is a continuation of B.
    // USPTO childContinuityBag lists BOTH edges flat: A->B and B->C.
    const wrapper: PatentFileWrapper = {
      applicationNumberText: 'A',
      childContinuityBag: [
        {
          parentApplicationNumberText: 'A',
          childApplicationNumberText: 'B',
          claimParentageTypeCodeDescriptionText: 'is a Continuation of',
          childApplicationFilingDate: '2022-01-01',
        },
        {
          parentApplicationNumberText: 'B',
          childApplicationNumberText: 'C',
          claimParentageTypeCodeDescriptionText: 'is a Continuation of',
          childApplicationFilingDate: '2023-01-01',
        },
      ],
    };

    const forest = buildContinuityForest(wrapper);

    // A is the only root; B under A; C under B (NOT under A).
    expect(forest).toHaveLength(1);
    expect(forest[0].appNumber).toBe('A');
    expect(forest[0].isQueried).toBe(true);
    expect(forest[0].children.map((c) => c.appNumber)).toEqual(['B']);
    expect(forest[0].children[0].children.map((c) => c.appNumber)).toEqual(['C']);
    expect(edgesOf(forest)).toEqual([
      'A->B:is a Continuation of',
      'B->C:is a Continuation of',
    ]);
  });

  it('builds a linear ancestry from parent edges oldest-first', () => {
    // Query C. parentContinuityBag: B->C and A->B (flat).
    const wrapper: PatentFileWrapper = {
      applicationNumberText: 'C',
      parentContinuityBag: [
        {
          parentApplicationNumberText: 'B',
          childApplicationNumberText: 'C',
          parentApplicationFilingDate: '2022-01-01',
          claimParentageTypeCodeDescriptionText: 'is a Continuation of',
        },
        {
          parentApplicationNumberText: 'A',
          childApplicationNumberText: 'B',
          parentApplicationFilingDate: '2020-01-01',
          claimParentageTypeCodeDescriptionText: 'is a Continuation in-part of',
        },
      ],
    };

    const forest = buildContinuityForest(wrapper);
    expect(forest.map((r) => r.appNumber)).toEqual(['A']);
    expect(edgesOf(forest)).toEqual([
      'A->B:is a Continuation in-part of',
      'B->C:is a Continuation of',
    ]);
    // Queried flag lands on C, deepest node.
    const c = forest[0].children[0].children[0];
    expect(c.appNumber).toBe('C');
    expect(c.isQueried).toBe(true);
  });

  it('renders sibling descendants sorted by filing date', () => {
    const wrapper: PatentFileWrapper = {
      applicationNumberText: 'A',
      childContinuityBag: [
        {
          parentApplicationNumberText: 'A',
          childApplicationNumberText: 'Y',
          childApplicationFilingDate: '2025-02-27',
        },
        {
          parentApplicationNumberText: 'A',
          childApplicationNumberText: 'X',
          childApplicationFilingDate: '2025-02-24',
        },
      ],
    };
    const forest = buildContinuityForest(wrapper);
    expect(forest[0].children.map((c) => c.appNumber)).toEqual(['X', 'Y']);
  });

  it('carries parent metadata (filing date, patent number, status) onto nodes', () => {
    const wrapper: PatentFileWrapper = {
      applicationNumberText: 'C',
      parentContinuityBag: [
        {
          parentApplicationNumberText: 'B',
          childApplicationNumberText: 'C',
          parentApplicationFilingDate: '2022-06-30',
          parentApplicationStatusCode: 150,
          parentApplicationStatusDescriptionText: 'Patented Case',
          parentPatentNumber: '12469237',
        },
      ],
    };
    const b = buildContinuityForest(wrapper)[0];
    expect(b.appNumber).toBe('B');
    expect(b.filingDate).toBe('2022-06-30');
    expect(b.statusCode).toBe(150);
    expect(b.patentNumber).toBe('12469237');
  });

  it('returns the queried app as a lone root when it has no continuity', () => {
    const forest = buildContinuityForest({ applicationNumberText: 'A' });
    expect(forest).toHaveLength(1);
    expect(forest[0].appNumber).toBe('A');
    expect(forest[0].isQueried).toBe(true);
    expect(forest[0].children).toEqual([]);
  });

  it('does not loop on cyclic/self-referential edges', () => {
    const wrapper: PatentFileWrapper = {
      applicationNumberText: 'A',
      childContinuityBag: [
        { parentApplicationNumberText: 'A', childApplicationNumberText: 'B' },
        { parentApplicationNumberText: 'B', childApplicationNumberText: 'A' }, // back-edge
      ],
    };
    const forest = buildContinuityForest(wrapper);
    // Must terminate; A->B present, B->A pruned by cycle guard.
    expect(edgesOf(forest)).toEqual(['A->B:']);
  });
});

import { describe, expect, it } from 'vitest';

import {
  requiredDocumentsFrom,
  requiresDocumentPrerequisite,
  unsatisfiedDocumentTypes,
} from '../src/orders/document-prerequisite.js';

describe('requiresDocumentPrerequisite', () => {
  it.each(['ready_for_delivery', 'dispatched', 'activated'])('gates %s', (status) => {
    expect(requiresDocumentPrerequisite(status)).toBe(true);
  });

  it.each(['submitted', 'in_progress', 'awaiting_customer', 'cancelled'])(
    'does not gate %s',
    (status) => {
      expect(requiresDocumentPrerequisite(status)).toBe(false);
    },
  );
});

describe('requiredDocumentsFrom', () => {
  it('reads the checklist frozen into the order snapshot', () => {
    expect(requiredDocumentsFrom({ documentChecklist: ['passport', 'address_proof'] })).toEqual([
      'passport',
      'address_proof',
    ]);
  });

  it.each([{}, null, undefined, { documentChecklist: [] }, 'nonsense', { documentChecklist: 7 }])(
    'yields no requirement for %j rather than throwing',
    (snapshot) => {
      expect(requiredDocumentsFrom(snapshot)).toEqual([]);
    },
  );
});

describe('unsatisfiedDocumentTypes', () => {
  const required = ['passport', 'address_proof'];

  it('requires nothing when the checklist is empty', () => {
    expect(
      unsatisfiedDocumentTypes({ attached: [], reviewsNewestFirst: [], required: [] }),
    ).toEqual([]);
  });

  it('reports every required type when nothing is attached', () => {
    expect(unsatisfiedDocumentTypes({ attached: [], reviewsNewestFirst: [], required })).toEqual([
      'passport',
      'address_proof',
    ]);
  });

  it('is satisfied only when each required type has an approved file', () => {
    expect(
      unsatisfiedDocumentTypes({
        attached: [
          { id: 'f1', documentType: 'passport' },
          { id: 'f2', documentType: 'address_proof' },
        ],
        reviewsNewestFirst: [
          { fileId: 'f1', decision: 'approved' },
          { fileId: 'f2', decision: 'approved' },
        ],
        required,
      }),
    ).toEqual([]);
  });

  it('reports the type that is still outstanding, in checklist order', () => {
    expect(
      unsatisfiedDocumentTypes({
        attached: [{ id: 'f2', documentType: 'address_proof' }],
        reviewsNewestFirst: [{ fileId: 'f2', decision: 'approved' }],
        required,
      }),
    ).toEqual(['passport']);
  });

  it('does not accept an attached but never-reviewed document', () => {
    expect(
      unsatisfiedDocumentTypes({
        attached: [{ id: 'f1', documentType: 'passport' }],
        reviewsNewestFirst: [],
        required: ['passport'],
      }),
    ).toEqual(['passport']);
  });

  it('does not accept a rejected document', () => {
    expect(
      unsatisfiedDocumentTypes({
        attached: [{ id: 'f1', documentType: 'passport' }],
        reviewsNewestFirst: [{ fileId: 'f1', decision: 'rejected' }],
        required: ['passport'],
      }),
    ).toEqual(['passport']);
  });

  it('judges a re-reviewed file on its latest decision only', () => {
    // Newest first: approved now, rejected before → satisfied.
    expect(
      unsatisfiedDocumentTypes({
        attached: [{ id: 'f1', documentType: 'passport' }],
        reviewsNewestFirst: [
          { fileId: 'f1', decision: 'approved' },
          { fileId: 'f1', decision: 'rejected' },
        ],
        required: ['passport'],
      }),
    ).toEqual([]);

    // The reverse: most recently rejected → no longer satisfied.
    expect(
      unsatisfiedDocumentTypes({
        attached: [{ id: 'f1', documentType: 'passport' }],
        reviewsNewestFirst: [
          { fileId: 'f1', decision: 'rejected' },
          { fileId: 'f1', decision: 'approved' },
        ],
        required: ['passport'],
      }),
    ).toEqual(['passport']);
  });

  it('accepts a re-upload: a rejected file does not sink an approved sibling', () => {
    expect(
      unsatisfiedDocumentTypes({
        attached: [
          { id: 'bad', documentType: 'passport' },
          { id: 'good', documentType: 'passport' },
        ],
        reviewsNewestFirst: [
          { fileId: 'good', decision: 'approved' },
          { fileId: 'bad', decision: 'rejected' },
        ],
        required: ['passport'],
      }),
    ).toEqual([]);
  });

  it('ignores approved documents that are not on the checklist', () => {
    expect(
      unsatisfiedDocumentTypes({
        attached: [{ id: 'f1', documentType: 'visa' }],
        reviewsNewestFirst: [{ fileId: 'f1', decision: 'approved' }],
        required: ['passport'],
      }),
    ).toEqual(['passport']);
  });

  it('ignores a review for a file that is not attached', () => {
    expect(
      unsatisfiedDocumentTypes({
        attached: [],
        reviewsNewestFirst: [{ fileId: 'ghost', decision: 'approved' }],
        required: ['passport'],
      }),
    ).toEqual(['passport']);
  });
});

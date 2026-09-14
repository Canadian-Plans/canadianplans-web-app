// Native API payloads only. This module never reads or emits credentials.
export const writerPlan = [
  {
    keyName: 'canadian-plans-archive-writer',
    bucketIds: ['88d367ae494ba509af08071f'],
    capabilities: ['listFiles', 'writeFiles'],
  },
  {
    keyName: 'canadian-plans-ledger-writer',
    bucketIds: ['2863b74e494ba509af08071f'],
    capabilities: ['listFiles', 'writeFiles', 'writeFileRetentions'],
  },
];

export function verifyWriterScope(actual, expected) {
  const same = (left, right) =>
    Array.isArray(left) &&
    left.length === right.length &&
    [...left].sort().every((value, index) => value === [...right].sort()[index]);
  if (
    actual?.keyName !== expected.keyName ||
    !same(actual?.bucketIds, expected.bucketIds) ||
    !same(actual?.capabilities, expected.capabilities)
  ) {
    throw new Error('B2 returned an unexpected writer scope; do not use this key.');
  }
}

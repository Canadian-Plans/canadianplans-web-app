import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writerPlan, verifyWriterScope } from './b2-writer-plan.mjs';

test('writer plans separate buckets and allow only approved capabilities', () => {
  assert.notDeepEqual(writerPlan[0].bucketIds, writerPlan[1].bucketIds);
  assert.deepEqual(writerPlan[0].capabilities, ['listFiles', 'writeFiles']);
  assert.deepEqual(writerPlan[1].capabilities, ['listFiles', 'writeFiles', 'writeFileRetentions']);
  for (const plan of writerPlan) verifyWriterScope(plan, plan);
});
test('rejects broader provider scopes and foreign buckets', () => {
  const expected = writerPlan[0];
  for (const capability of ['deleteFiles', 'bypassGovernance', 'readFiles', 'writeBuckets']) {
    assert.throws(() =>
      verifyWriterScope(
        { ...expected, capabilities: [...expected.capabilities, capability] },
        expected,
      ),
    );
  }
  assert.throws(() =>
    verifyWriterScope({ ...expected, bucketIds: writerPlan[1].bucketIds }, expected),
  );
  assert.throws(() => verifyWriterScope({ ...expected, bucketIds: null }, expected));
});

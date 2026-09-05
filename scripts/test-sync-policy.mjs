import assert from 'node:assert/strict'
import { classifyPendingVersion, getSyncPlan } from '../lib/sync-policy.mjs'

for (const trigger of ['login', 'manual', 'retry', 'reconnect', 'local-write']) {
  assert.deepEqual(
    getSyncPlan(trigger),
    { pullBefore: true, push: true, pullAfter: true },
    `${trigger} must hydrate before and after outbound work`,
  )
}

assert.deepEqual(
  getSyncPlan('realtime'),
  { pullBefore: true, push: false, pullAfter: false },
  'realtime must invalidate/refetch without pushing',
)

assert.equal(
  classifyPendingVersion({
    pendingOperation: 'UPDATE',
    expectedUpdatedAt: '2026-09-04T01:00:00.000Z',
    remoteUpdatedAt: '2026-09-04T01:00:00.000Z',
  }),
  'PRESERVE_PENDING',
)

assert.equal(
  classifyPendingVersion({
    pendingOperation: 'UPDATE',
    expectedUpdatedAt: '2026-09-04T01:00:00.000Z',
    remoteUpdatedAt: '2026-09-04T02:00:00.000Z',
  }),
  'CONFLICT',
  'a stale edit must not overwrite a newer cloud version',
)

assert.equal(
  classifyPendingVersion({
    pendingOperation: 'UPDATE',
    expectedUpdatedAt: null,
    remoteUpdatedAt: '2026-09-04T02:00:00.000Z',
  }),
  'CONFLICT',
  'legacy updates without a base version must fail closed',
)

assert.equal(
  classifyPendingVersion({
    pendingOperation: 'CREATE',
    expectedUpdatedAt: null,
    remoteUpdatedAt: '2026-09-04T02:00:00.000Z',
  }),
  'HYDRATE_CREATE',
  'a replayed stable-ID create hydrates the existing cloud row',
)

console.log('PASS  cloud-first sync policy behavior')

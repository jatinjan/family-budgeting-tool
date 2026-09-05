/**
 * Pure cloud-first coordination policy. Kept free of browser/database imports
 * so release tests can execute the ordering and conflict contract directly.
 */

/**
 * @param {'login'|'manual'|'retry'|'reconnect'|'realtime'|'local-write'} trigger
 */
export function getSyncPlan(trigger) {
  if (trigger === 'realtime') {
    return { pullBefore: true, push: false, pullAfter: false }
  }
  return { pullBefore: true, push: true, pullAfter: true }
}

/**
 * @param {{
 *   pendingOperation?: 'CREATE'|'UPDATE'|null,
 *   expectedUpdatedAt?: string|null,
 *   remoteUpdatedAt?: string|null
 * }} input
 * @returns {'HYDRATE_CREATE'|'PRESERVE_PENDING'|'CONFLICT'}
 */
export function classifyPendingVersion(input) {
  if (input.pendingOperation === 'CREATE') {
    return 'HYDRATE_CREATE'
  }
  if (
    input.expectedUpdatedAt &&
    input.remoteUpdatedAt === input.expectedUpdatedAt
  ) {
    return 'PRESERVE_PENDING'
  }
  return 'CONFLICT'
}

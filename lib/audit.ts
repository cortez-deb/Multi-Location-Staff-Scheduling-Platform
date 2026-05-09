// ============================================================
// ShiftSync — Audit Trail Helpers
// ============================================================

import type { AuditLog, LocationId } from './types'
import { db } from './db'

// ─────────────────────────────────────────────────────────────
// Write an audit log entry
// ─────────────────────────────────────────────────────────────
export function writeAuditLog(
  params: Omit<AuditLog, 'id' | 'performedAt'>
): AuditLog {
  const entry: AuditLog = {
    ...params,
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    performedAt: new Date().toISOString(),
  }
  db.auditLogs.push(entry)
  return entry
}

// ─────────────────────────────────────────────────────────────
// Get audit logs for an entity
// ─────────────────────────────────────────────────────────────
export function getEntityAuditLogs(
  entityType: AuditLog['entityType'],
  entityId: string
): AuditLog[] {
  return db.auditLogs
    .filter((l) => l.entityType === entityType && l.entityId === entityId)
    .sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime())
}

// ─────────────────────────────────────────────────────────────
// Get audit logs for a date range + optional location filter
// ─────────────────────────────────────────────────────────────
export function getAuditLogsByRange(params: {
  from: string
  to: string
  locationId?: LocationId
  entityType?: AuditLog['entityType']
}): AuditLog[] {
  const fromDate = new Date(params.from)
  const toDate = new Date(params.to)

  return db.auditLogs
    .filter((l) => {
      const performed = new Date(l.performedAt)
      if (performed < fromDate || performed > toDate) return false
      if (params.locationId && l.locationId !== params.locationId) return false
      if (params.entityType && l.entityType !== params.entityType) return false
      return true
    })
    .sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime())
}

// ─────────────────────────────────────────────────────────────
// Diff two objects and return changed fields summary
// ─────────────────────────────────────────────────────────────
export function buildDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): string {
  const changed: string[] = []
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)])

  for (const key of allKeys) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changed.push(key)
    }
  }

  return changed.join(', ')
}

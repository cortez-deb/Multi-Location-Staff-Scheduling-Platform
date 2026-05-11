import type { AuditLog, LocationId } from './types'
import { fetchApi } from './api'

export async function writeAuditLog(params: Omit<AuditLog, 'id' | 'createdAt'>) {
  // Now handled by the backend
  return null;
}

export async function getEntityAuditLogs(entityType: AuditLog['entityType'], entityId: string) {
  const logs = await fetchApi(`/api/audit?entityType=${entityType}&entityId=${entityId}`);
  return logs;
}

export async function getAuditLogsByRange(params: any) {
  return [];
}

export function buildDiff(before: Record<string, unknown>, after: Record<string, unknown>): string {
  const changed: string[] = []
  const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})])

  for (const key of allKeys) {
    if (JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key])) {
      changed.push(key)
    }
  }

  return changed.join(', ')
}

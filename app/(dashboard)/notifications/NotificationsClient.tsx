'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Box, Group, Stack, Text, Title, Badge, Button, Paper, Anchor, Indicator, Modal, Textarea,
} from '@mantine/core'
import type { Session, AppNotification } from '@/lib/types'

const ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  shift_assigned: { color: 'blue', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 20, height: 20 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  )},
  SHIFT_UPDATED: { color: 'yellow', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 20, height: 20 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
  )},
  SHIFT_CANCELLED: { color: 'red', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 20, height: 20 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  )},
  SWAP_REQUESTED: { color: 'indigo', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 20, height: 20 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  )},
  SWAP_APPROVED: { color: 'green', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 20, height: 20 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )},
  LEAVE_REQUESTED: { color: 'orange', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 20, height: 20 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
    </svg>
  )},
  LEAVE_APPROVED: { color: 'green', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 20, height: 20 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )},
  LEAVE_REJECTED: { color: 'red', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 20, height: 20 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )},
}

function getNotificationHref(type: string, role: string) {
  if (type.startsWith('SWAP_') || type.startsWith('swap_')) return '/swaps'
  if (type.startsWith('LEAVE_')) {
    if (role === 'staff') return '/schedule'
    return '/notifications'
  }
  if (type.startsWith('SHIFT_') || type.startsWith('shift_') || type === 'schedule_published') {
    return '/schedule'
  }
  return '#'
}

export function NotificationsClient({ session, initialNotifs, leaveRequests: initialLeaveRequests }: { session: Session; initialNotifs: AppNotification[]; leaveRequests: any[] }) {
  const router = useRouter()
  const [notifs, setNotifs] = useState(initialNotifs)
  const [leaveRequests, setLeaveRequests] = useState(initialLeaveRequests)
  const [loading, setLoading] = useState(false)
  const [actioningLeaveId, setActioningLeaveId] = useState<string | null>(null)
  const [approvalModalData, setApprovalModalData] = useState<any | null>(null)
  const [managerNote, setManagerNote] = useState('')

  const unread = notifs.filter(n => !n.read).length

  async function markAll() {
    setLoading(true)
    await fetch('/api/notifications/read-all', { method: 'PATCH' })
    setNotifs(n => n.map(x => ({ ...x, read: true })))
    setLoading(false)
    router.refresh()
  }

  async function markOne(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
    setNotifs(n => n.map(x => x.id === id ? { ...x, read: true } : x))
  }

  async function handleLeaveAction(leaveId: string, action: 'approve' | 'reject', note: string = '') {
    setLoading(true)
    try {
      const res = await fetch(`/api/leave/${leaveId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerNote: note })
      })
      if (res.ok) {
        setNotifs(n => n.filter(x => x.metadata?.leaveRequestId !== leaveId))
        router.refresh()
      }
    } finally {
      setLoading(false)
      setApprovalModalData(null)
      setActioningLeaveId(null)
      setManagerNote('')
    }
  }

  const grouped = notifs.reduce<{ unread: AppNotification[]; read: AppNotification[] }>(
    (acc, n) => { acc[n.read ? 'read' : 'unread'].push(n); return acc },
    { unread: [], read: [] }
  )

  return (
    <Box p={32} pb={48} maw={720} mx="auto">
      <Group align="flex-end" justify="space-between" mb={28} gap={12}>
        <Box>
          <Title order={1} size={24} fw={800}>Notifications</Title>
          <Text size="sm" c="dimmed" mt={4}>
            {unread > 0 ? `${unread} unread` : 'All caught up!'}
          </Text>
        </Box>
        {unread > 0 && (
          <Button size="sm" variant="default" loading={loading} onClick={markAll}>
            ✓ Mark all read
          </Button>
        )}
      </Group>

      {notifs.length === 0 && (
        <Box style={{ textAlign: 'center', padding: '80px 24px' }}>
          <Text size="3rem" mb={12}>🔔</Text>
          <Text c="dimmed">No notifications yet</Text>
        </Box>
      )}

      {[{ label: 'Unread', items: grouped.unread }, { label: 'Earlier', items: grouped.read }].map(({ label, items }) =>
        items.length > 0 && (
          <Box key={label} mb={32}>
            <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts="0.08em" mb={12}>
              {label} ({items.length})
            </Text>
            <Stack gap={8}>
              {items.map(n => {
                const targetHref = getNotificationHref(n.type, session.user.role)
                const iconData = ICONS[n.type] || { icon: '🔔', color: 'gray' }
                
                return (
                  <Paper
                    key={n.id}
                    p="md"
                    radius="lg"
                    component={Link}
                    href={targetHref}
                    onClick={() => { if (!n.read) markOne(n.id) }}
                    style={{
                      display: 'block',
                      textDecoration: 'none',
                      background: n.read ? 'var(--bg-cell)' : 'rgba(99,102,241,0.07)',
                      border: `1px solid ${n.read ? 'var(--border-light)' : 'rgba(99,102,241,0.2)'}`,
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <Group gap={16} align="flex-start" wrap="nowrap">
                      <Box style={{ 
                        color: `var(--mantine-color-${iconData.color}-6)`,
                        background: `var(--mantine-color-${iconData.color}-light)`,
                        width: 40, height: 40, borderRadius: 12,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {iconData.icon}
                      </Box>
                      <Box flex={1} style={{ minWidth: 0 }}>
                        <Group justify="space-between" gap={8} mb={2}>
                          <Text fw={n.read ? 500 : 700} size="sm" c="var(--text-main)">{n.title}</Text>
                          {!n.read && (
                            <Box style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', flexShrink: 0, marginTop: 4 }} />
                          )}
                        </Group>
                        <Text size="xs" c="gray.4">{n.message}</Text>
                        
                        {(n.relatedShiftId || n.relatedSwapId || n.type === 'LEAVE_REQUESTED' || n.type === 'LEAVE_SHIFT_UNASSIGNED') && (
                          <Group gap={8} mt={12} onClick={(e) => e.stopPropagation()}>
                            {n.type === 'LEAVE_REQUESTED' && (
                              <>
                                {(() => {
                                  const lr = leaveRequests.find(l => l.id === n.metadata?.leaveRequestId)
                                  if (!n.read && (!lr || lr.status === 'PENDING')) {
                                    return (
                                      <Group gap={8}>
                                        <Button size="compact-xs" variant="light" color="green" onClick={async (e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                          setActioningLeaveId(n.metadata?.leaveRequestId)
                                          setApprovalModalData({ 
                                            staffName: n.metadata?.staffName,
                                            startDate: n.metadata?.startDate,
                                            endDate: n.metadata?.endDate,
                                            reason: n.metadata?.reason
                                          })
                                        }}>Approve</Button>
                                        <Button size="compact-xs" variant="light" color="red" onClick={async (e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                          handleLeaveAction(n.metadata?.leaveRequestId, 'reject')
                                        }}>Reject</Button>
                                      </Group>
                                    )
                                  }
                                  return (
                                    <Badge size="xs" variant="outline" color={!lr || lr.status === 'PENDING' ? 'gray' : (lr.status === 'APPROVED' ? 'green' : 'red')}>
                                      {lr ? (lr.status.charAt(0).toUpperCase() + lr.status.slice(1).toLowerCase()) : 'Pending'}
                                    </Badge>
                                  )
                                })()}
                              </>
                            )}

                            {n.type === 'LEAVE_SHIFT_UNASSIGNED' && (
                              <Button size="compact-xs" variant="outline" color="indigo" onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setApprovalModalData({ 
                                  staffName: n.metadata?.staffName,
                                  affectedShifts: n.metadata?.affectedShifts,
                                  isViewOnly: true
                                })
                              }}>View Affected Shifts</Button>
                            )}
                          </Group>
                        )}

                        <Group justify="space-between" align="flex-end" mt={8}>
                          <Text size="xs" c="dimmed">{new Date(n.createdAt).toLocaleString()}</Text>
                          <Text size="xs" fw={700} c="indigo">View Details →</Text>
                        </Group>
                      </Box>
                    </Group>
                  </Paper>
                )
              })}
            </Stack>
          </Box>
        )
      )}

      {/* Approval / Shift View Modal */}
      <Modal 
        opened={!!approvalModalData} 
        onClose={() => setApprovalModalData(null)} 
        title={<Text fw={700}>{approvalModalData?.isViewOnly ? 'Affected Shifts' : 'Approve Leave Request'}</Text>}
        radius="lg"
      >
        <Stack gap="md">
          {approvalModalData?.isViewOnly ? (
            <>
              <Text size="sm">The following shifts for <b>{approvalModalData.staffName}</b> have been unassigned:</Text>
              <Stack gap={6}>
                {approvalModalData.affectedShifts?.map((s: any) => (
                  <Paper key={s.id} p="xs" withBorder radius="md" component={Link} href={`/shifts/${s.id}`} 
                    style={{ textDecoration: 'none', transition: 'background 0.1s', cursor: 'pointer' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99,102,241,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <Group justify="space-between" align="center">
                      <Box>
                        <Text size="xs" fw={700}>{s.date}</Text>
                        <Text size="xs" c="dimmed">{s.startTime} - {s.endTime}</Text>
                      </Box>
                      <Badge size="xs" variant="light" color="indigo">{s.role}</Badge>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            </>
          ) : (
            <>
              <Box p="sm" style={{ background: 'var(--bg-card)', borderRadius: 8 }}>
                <Text size="sm"><b>Staff:</b> {approvalModalData?.staffName}</Text>
                <Text size="sm"><b>Dates:</b> {approvalModalData?.startDate} to {approvalModalData?.endDate}</Text>
                {approvalModalData?.reason && <Text size="sm" mt={4}><b>Reason:</b> {approvalModalData.reason}</Text>}
              </Box>
              
              <Textarea 
                label="Manager Note (optional)"
                placeholder="Message to staff member..."
                value={managerNote}
                onChange={(e) => setManagerNote(e.target.value)}
                minRows={3}
              />

              <Group justify="flex-end" mt="md">
                <Button variant="default" onClick={() => setApprovalModalData(null)}>Cancel</Button>
                <Button variant="gradient" gradient={{ from: '#6366f1', to: '#4f46e5' }} 
                  onClick={() => handleLeaveAction(actioningLeaveId!, 'approve', managerNote)}
                  loading={loading}
                >
                  Confirm Approval
                </Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>
    </Box>
  )
}

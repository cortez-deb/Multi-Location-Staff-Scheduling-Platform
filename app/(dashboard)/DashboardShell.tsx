'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  AppShell,
  NavLink,
  Avatar,
  Badge,
  Text,
  Stack,
  Group,
  Divider,
  Button,
  Box,
  Burger,
  ActionIcon,
  useMantineColorScheme,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { useSocket } from '../hooks/useSocket'
import { logoutAction } from '../actions/auth'
import type { Session, AppNotification } from '@/lib/types'

const ICONS = {
  dashboard: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5" style={{ width: 20, height: 20 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
    </svg>
  ),
  schedule: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5" style={{ width: 20, height: 20 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 2.994v2.25m10.5-2.25v2.25m-14.252 13.5V7.491a2.25 2.25 0 0 1 2.25-2.25h13.5a2.25 2.25 0 0 1 2.25 2.25v11.251m-18 0a2.25 2.25 0 0 0 2.25 2.25h13.5a2.25 2.25 0 0 0 2.25-2.25m-18 0v-7.5a2.25 2.25 0 0 1 2.25-2.25h13.5a2.25 2.25 0 0 1 2.25 2.25v7.5m-6.75-6h2.25m-9 2.25h4.5m.002-2.25h.005v.006H12v-.006Zm-.001 4.5h.006v.006h-.006v-.005Zm-2.25.001h.005v.006H9.75v-.006Zm-2.25 0h.005v.005h-.006v-.005Zm6.75-2.247h.005v.005h-.005v-.005Zm0 2.247h.006v.006h-.006v-.006Zm2.25-2.248h.006V15H16.5v-.005Z" />
    </svg>
  ),
  shifts: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5" style={{ width: 20, height: 20 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  staff: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5" style={{ width: 20, height: 20 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  ),
  swaps: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5" style={{ width: 20, height: 20 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  ),
  analytics: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5" style={{ width: 20, height: 20 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  ),
  notifications: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5" style={{ width: 20, height: 20 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
    </svg>
  ),
}

const NAV = [
  { href: '/dashboard', icon: ICONS.dashboard, label: 'Dashboard' },
  { href: '/schedule', icon: ICONS.schedule, label: 'Schedule' },
  { href: '/shifts', icon: ICONS.shifts, label: 'Shifts' },
  { href: '/staff', icon: ICONS.staff, label: 'Staff' },
  { href: '/swaps', icon: ICONS.swaps, label: 'Swaps' },
  { href: '/analytics', icon: ICONS.analytics, label: 'Analytics' },
  { href: '/notifications', icon: ICONS.notifications, label: 'Notifications' },
]

const STAFF_NAV = [
  { href: '/dashboard', icon: ICONS.dashboard, label: 'My Shifts' },
  { href: '/schedule', icon: ICONS.schedule, label: 'Schedule' },
  { href: '/swaps', icon: ICONS.swaps, label: 'Swaps' },
  { href: '/notifications', icon: ICONS.notifications, label: 'Notifications' },
]

export function DashboardShell({ session, children }: { session: Session; children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [unread, setUnread] = useState(0)
  const [opened, { toggle }] = useDisclosure()
  const { toggleColorScheme, colorScheme } = useMantineColorScheme()

  const navItems = session.user.role === 'staff' ? STAFF_NAV : NAV

  // Fetch unread notification count
  useEffect(() => {
    fetch('/api/notifications').then(r => r.json()).then(d => {
      if (d.success) setUnread(d.unread)
    })
  }, [pathname])

  // Real-time Socket.io events → Mantine toast notifications
  useSocket(session, (event, payload) => {
    const COLOR_MAP: Record<string, string> = {
      shift_assigned: 'green', shift_changed: 'yellow', shift_cancelled: 'red',
      schedule_published: 'green', swap_requested: 'blue', swap_accepted: 'cyan',
      swap_rejected: 'red', swap_approved: 'green', swap_cancelled: 'gray',
      drop_claimed: 'teal', overtime_warning: 'orange', conflict_detected: 'red',
    }
    const userFacingEvents = new Set([
      'shift_assigned', 'shift_changed', 'shift_cancelled', 'schedule_published',
      'swap_requested', 'swap_accepted', 'swap_rejected', 'swap_approved', 'swap_cancelled',
      'drop_claimed', 'overtime_warning', 'conflict_detected',
    ])
    if (userFacingEvents.has(event)) {
      setUnread(n => n + 1)
      notifications.show({
        title: payload.title,
        message: payload.message,
        color: COLOR_MAP[event] ?? 'indigo',
        autoClose: 5000,
      })
    }
  })

  async function handleLogout() {
    await logoutAction()
    window.location.href = '/login'
  }

  const initials = session.user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 220,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding={0}
    >
      <AppShell.Header style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Group gap={10}>
              <Box
                style={{
                  width: 32, height: 32,
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff',
                  boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 20, height: 20 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                </svg>
              </Box>
              <Box>
                <Text fw={800} size="md" style={{ color: 'var(--text-default)' }} lh={1.1}>ShiftSync</Text>
                <Text size="10px" c="dimmed" lh={1.1}>Coastal Eats</Text>
              </Box>
            </Group>
          </Group>
          <ActionIcon variant="subtle" color="gray" onClick={toggleColorScheme} size="lg">
            <Box lightHidden component="span" style={{ display: 'flex', alignItems: 'center' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 20, height: 20 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
              </svg>
            </Box>
            <Box darkHidden component="span" style={{ display: 'flex', alignItems: 'center' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 20, height: 20 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
              </svg>
            </Box>
          </ActionIcon>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm" style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-subtle)' }}>

        {/* Navigation */}
        <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts="0.08em" px={8} mb={6}>
          Navigation
        </Text>
        <Stack gap={2} flex={1}>
          {navItems.map(item => {
            const isActive = item.href === '/dashboard'
              ? pathname === item.href
              : pathname.startsWith(item.href)
            const isNotif = item.href === '/notifications'
            return (
              <NavLink
                key={item.href}
                component={Link}
                href={item.href}
                label={item.label}
                leftSection={<span style={{ fontSize: 15 }}>{item.icon}</span>}
                rightSection={
                  isNotif && unread > 0 ? (
                    <Badge size="xs" color="red" circle>{unread > 9 ? '9+' : unread}</Badge>
                  ) : undefined
                }
                active={isActive}
                styles={{
                  root: {
                    borderRadius: '10px',
                    color: isActive ? '#818cf8' : '#94a3b8',
                    background: isActive ? 'rgba(99,102,241,0.12)' : undefined,
                    border: isActive ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
                    fontWeight: 500,
                    fontSize: 14,
                    padding: '10px 12px',
                    '&:hover': {
                      background: '#1a1a24',
                      color: '#f1f5f9',
                    },
                  },
                  label: { color: 'inherit' },
                }}
              />
            )
          })}
        </Stack>

        <Divider mt="xs" mb="xs" color="var(--border-subtle)" />

        {/* User section */}
        <Box px={4}>
          <Link href="/settings" style={{ textDecoration: 'none' }}>
            <Group gap={10} mb={8} p={8} style={{ borderRadius: 10, transition: 'background 0.15s', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--mantine-color-default-hover)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <Avatar size={32} radius="xl" style={{ background: '#4f46e5', color: '#fff', fontSize: 12, fontWeight: 700 }}>
                {initials}
              </Avatar>
              <Box style={{ minWidth: 0, flex: 1 }}>
                <Text size="sm" fw={600} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-default)' }}>
                  {session.user.name}
                </Text>
                <Text size="xs" c="dimmed" tt="capitalize">{session.user.role}</Text>
              </Box>
            </Group>
          </Link>
          <Button
            variant="subtle"
            color="gray"
            size="xs"
            fullWidth
            justify="flex-start"
            leftSection={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 16, height: 16 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
              </svg>
            }
            onClick={handleLogout}
          >
            Sign out
          </Button>
        </Box>
      </AppShell.Navbar>

      <AppShell.Main>
        {children}
      </AppShell.Main>
    </AppShell>
  )
}


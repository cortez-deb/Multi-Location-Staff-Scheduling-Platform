'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box, Group, Stack, Text, Title, TextInput, NumberInput,
  Table, Modal, Button, ActionIcon, Paper, Badge
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import type { Session } from '@/lib/types'

export function LocationsClient({ session, initialLocations }: {
  session: Session; initialLocations: any[]
}) {
  const router = useRouter()
  const [locations, setLocations] = useState(initialLocations)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showCutoffModal, setShowCutoffModal] = useState(false)
  const [editingLoc, setEditingLoc] = useState<any | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    timezone: 'America/New_York',
    address: ''
  })
  const [cutoffHours, setCutoffHours] = useState<number>(48)

  useEffect(() => {
    refreshData()
  }, [])

  async function refreshData() {
    setFetching(true)
    try {
      const res = await fetch('/api/locations')
      const data = await res.json()
      if (Array.isArray(data)) setLocations(data)
    } finally {
      setFetching(false)
    }
  }

  const handleOpenAdd = () => {
    setEditingLoc(null)
    setFormData({ name: '', timezone: 'America/New_York', address: '' })
    setShowModal(true)
  }

  const handleOpenEdit = (loc: any) => {
    setEditingLoc(loc)
    setFormData({
      name: loc.name,
      timezone: loc.timezone,
      address: loc.address || ''
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.timezone) return
    setIsSaving(true)
    try {
      const url = editingLoc ? `/api/locations/${editingLoc.id}` : '/api/locations'
      const method = editingLoc ? 'PATCH' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (res.ok) {
        notifications.show({
          title: editingLoc ? 'Location Updated' : 'Location Added',
          message: `${formData.name} has been successfully saved.`,
          color: 'green'
        })
        setShowModal(false)
        refreshData()
        router.refresh()
      }
    } catch (err) {
      notifications.show({ title: 'Error', message: 'Something went wrong', color: 'red' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return
    try {
      const res = await fetch(`/api/locations/${id}`, { method: 'DELETE' })
      if (res.ok) {
        notifications.show({ title: 'Location Deleted', message: `${name} has been removed.`, color: 'blue' })
        refreshData()
        router.refresh()
      }
    } catch (err) {
      notifications.show({ title: 'Error', message: 'Could not delete location', color: 'red' })
    }
  }

  const handleBulkUpdateCutoff = async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/locations/bulk-cutoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cutoffHours })
      })
      if (res.ok) {
        notifications.show({ title: 'Cutoff Updated', message: `Shift cutoff set to ${cutoffHours} hours for all shifts.`, color: 'green' })
        setShowCutoffModal(false)
        router.refresh()
      }
    } catch (err) {
      notifications.show({ title: 'Error', message: 'Failed to update cutoff', color: 'red' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Box p={32}>
      <Group justify="space-between" mb={28}>
        <Box>
          <Title order={1} size={24} fw={800}>Manage Locations</Title>
          <Text size="sm" c="dimmed">Total {locations.length} locations across the system</Text>
        </Box>
        <Group>
          <Button variant="light" color="indigo" onClick={() => setShowCutoffModal(true)}>
            Bulk Update Cutoff
          </Button>
          <Button variant="gradient" gradient={{ from: '#6366f1', to: '#4f46e5' }} onClick={handleOpenAdd}>
            + Add Location
          </Button>
        </Group>
      </Group>

      <Paper radius="lg" withBorder style={{ overflow: 'hidden', background: 'rgba(255,255,255,0.01)' }}>
        <Table verticalSpacing="md" horizontalSpacing="lg">
          <Table.Thead style={{ background: 'rgba(255,255,255,0.03)' }}>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Timezone</Table.Th>
              <Table.Th>Address</Table.Th>
              <Table.Th style={{ textAlign: 'center' }}>Total Shifts</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {locations.map((loc) => (
              <Table.Tr key={loc.id} className="table-row-hover">
                <Table.Td>
                  <Text fw={700} size="sm">{loc.name}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge variant="dot" color="blue">{loc.timezone}</Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="xs" c="dimmed">{loc.address || 'No address set'}</Text>
                </Table.Td>
                <Table.Td style={{ textAlign: 'center' }}>
                  <Badge variant="filled" color="indigo" radius="sm">
                    {loc.shiftCount || 0} Shifts
                  </Badge>
                </Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>
                  <Group gap={8} justify="flex-end">
                    <Button size="compact-xs" variant="light" onClick={() => handleOpenEdit(loc)}>Edit</Button>
                    <Button size="compact-xs" variant="light" color="red" onClick={() => handleDelete(loc.id, loc.name)}>Delete</Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Add/Edit Modal */}
      <Modal opened={showModal} onClose={() => setShowModal(false)} title={editingLoc ? 'Edit Location' : 'Add New Location'} radius="lg">
        <Stack gap="md">
          <TextInput
            label="Location Name"
            placeholder="e.g. Downtown Central"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <TextInput
            label="Timezone"
            placeholder="e.g. America/New_York"
            value={formData.timezone}
            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
            required
          />
          <TextInput
            label="Address"
            placeholder="123 Main St, City, State"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={isSaving} variant="gradient" gradient={{ from: '#6366f1', to: '#4f46e5' }}>
              {editingLoc ? 'Update' : 'Create'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Global Cutoff Modal */}
      <Modal opened={showCutoffModal} onClose={() => setShowCutoffModal(false)} title="Update Shift Cutoff" radius="lg">
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            This will update the "Edit Cutoff Hours" for ALL shifts currently in the system. 
            This represents how many hours before a shift starts that it becomes locked for editing/swapping.
          </Text>
          <NumberInput
            label="Cutoff Hours"
            description="Default is 48 hours"
            value={cutoffHours}
            onChange={(v) => setCutoffHours(Number(v))}
            min={0}
            required
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setShowCutoffModal(false)}>Cancel</Button>
            <Button color="indigo" onClick={handleBulkUpdateCutoff} loading={isSaving}>
              Apply to All Shifts
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  )
}

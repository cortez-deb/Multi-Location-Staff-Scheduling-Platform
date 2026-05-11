'use client'
import { useState } from 'react'
import { Modal, Stack, Select, TextInput, Group, NumberInput, Textarea, Button, Text } from '@mantine/core'
import { getShiftUTCTimes } from '@/lib/timezone'

export function ShiftFormModal({ opened, onClose, onSaved, locations, initialShift, defaultDate, skills }: any) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    locationId: initialShift?.locationId || (locations[0]?.id || ''),
    date: initialShift?.date || defaultDate,
    startTime: initialShift?.startTime || '10:00',
    endTime: initialShift?.endTime || '18:00',
    requiredSkill: initialShift?.requiredSkill || '',
    headcount: initialShift?.headcount || 1,
    notes: initialShift?.notes || '',
  })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)

    const location = locations.find((l: any) => l.id === form.locationId)
    const { start, end } = getShiftUTCTimes(form.date, form.startTime, form.endTime, location?.timezone || 'UTC')

    const payload = {
      locationId: form.locationId,
      skillId: form.requiredSkill,
      startUtc: start.toISOString(),
      endUtc: end.toISOString(),
      headcount: form.headcount,
      notes: form.notes
    }

    const url = initialShift?.id ? `/api/shifts/${initialShift.id}` : '/api/shifts'
    const res = await fetch(url, {
      method: initialShift?.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    
    if (!res.ok) {
      const d = await res.json()
      setError(d.message || 'Save failed')
    } else {
      onSaved()
    }
    setLoading(false)
  }

  const set = (k: string, v: any) => setForm({ ...form, [k]: v })

  return (
    <Modal opened={opened} onClose={onClose} title={initialShift?.id ? "Edit Shift" : "Create New Shift"} size="md" radius="lg">
      <form onSubmit={submit}>
        <Stack gap="md">
          <Select label="Location" data={locations.map((l:any) => ({ value: l.id, label: l.name }))} value={form.locationId} onChange={v => set('locationId', v)} required />
          <TextInput label="Date" type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
          <Group grow>
            <TextInput label="Start Time" type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)} required />
            <TextInput label="End Time" type="time" value={form.endTime} onChange={e => set('endTime', e.target.value)} required />
          </Group>
          <Group grow>
            <Select label="Skill" data={skills.map((s:any) => ({ value: s.id, label: s.name }))} value={form.requiredSkill} onChange={v => set('requiredSkill', v)} required />
            <NumberInput label="Headcount" min={1} value={form.headcount} onChange={v => set('headcount', v)} required />
          </Group>
          <Textarea label="Notes" value={form.notes} onChange={e => set('notes', e.target.value)} />
          {error && <Text size="sm" c="red">{error}</Text>}
          <Group justify="flex-end"><Button variant="default" onClick={onClose}>Cancel</Button><Button type="submit" loading={loading}>{initialShift?.id ? 'Save' : 'Create'}</Button></Group>
        </Stack>
      </form>
    </Modal>
  )
}

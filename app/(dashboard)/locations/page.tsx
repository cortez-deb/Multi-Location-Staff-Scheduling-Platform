import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { LocationsClient } from './LocationsClient'
import { Suspense } from 'react'
import { Box, Loader, Center } from '@mantine/core'

export default async function LocationsPage() {
  const session = await getSession()
  if (!session || session.user.role !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <Suspense fallback={<Center style={{ height: '100vh' }}><Loader size="xl" variant="bars" color="indigo" /></Center>}>
      <LocationsClient session={session} initialLocations={[]} />
    </Suspense>
  )
}

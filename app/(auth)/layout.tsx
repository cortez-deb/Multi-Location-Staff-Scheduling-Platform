export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  // Redirect logic handled by middleware.ts
  return <>{children}</>
}

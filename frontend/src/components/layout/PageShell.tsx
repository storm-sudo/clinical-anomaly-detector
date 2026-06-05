import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'

interface PageShellProps {
  children: React.ReactNode
}

export function PageShell({ children }: PageShellProps) {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden" style={{ background: '#FAF7F2' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

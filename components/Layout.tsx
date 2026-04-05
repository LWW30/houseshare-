import Sidebar from './Sidebar'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 min-h-screen pt-14 md:pt-0 md:ml-60 w-full overflow-x-hidden" style={{ background: 'var(--bg)' }}>
        {children}
      </main>
    </div>
  )
}

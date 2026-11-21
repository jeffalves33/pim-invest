import BottomNav from '@/components/BottomNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-nav min-h-[100dvh]">
      {children}
      <BottomNav />
    </div>
  )
}

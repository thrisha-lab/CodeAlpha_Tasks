'use client'

/**
 * CodeAlpha Connect — Real-Time Communication App
 *
 * Single-page application root. The whole product (auth → lobby → pre-join →
 * meeting room) lives on this route; views are switched client-side through
 * the zustand store (view state), which keeps deep links (?room=ID) working
 * while remaining a single Next.js route.
 */

import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useMeeting } from '@/hooks/useMeeting'
import { AuthScreen } from '@/components/rtc/AuthScreen'
import { Lobby } from '@/components/rtc/Lobby'
import { PreJoin } from '@/components/rtc/PreJoin'
import { MeetingRoom } from '@/components/rtc/MeetingRoom'

export default function Page() {
  const view = useAppStore((s) => s.view)
  const { boot } = useMeeting()

  useEffect(() => {
    void boot()
  }, [boot])

  if (view === 'boot') {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
        <p className="text-sm">Loading CodeAlpha Connect…</p>
        <span className="sr-only">Loading application</span>
      </main>
    )
  }

  if (view === 'meeting') {
    return <MeetingRoom />
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {view === 'auth' && <AuthScreen />}
      {view === 'lobby' && <Lobby />}
      {view === 'prejoin' && <PreJoin />}

      <footer className="mt-auto border-t border-border bg-card">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-1.5 px-4 py-4 text-xs text-muted-foreground sm:flex-row">
          <p>
            <span className="font-semibold text-foreground">CodeAlpha Connect</span> — Real-Time
            Communication App
          </p>
          <p>WebRTC · Socket.io · Next.js · JWT</p>
        </div>
      </footer>
    </div>
  )
}

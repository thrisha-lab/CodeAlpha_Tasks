'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Check, Copy, Users, Video } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/store/useAppStore'
import { useMeeting } from '@/hooks/useMeeting'
import { VideoTile } from '@/components/rtc/VideoTile'
import { ControlsBar } from '@/components/rtc/ControlsBar'
import { ChatPanel } from '@/components/rtc/ChatPanel'
import { ParticipantsPanel } from '@/components/rtc/ParticipantsPanel'
import { Whiteboard } from '@/components/rtc/Whiteboard'
import { formatRoomId } from '@/lib/rtc/format'

/**
 * Full-screen meeting shell:
 *   header (room info + connection status)
 *   main   (video grid | spotlight for screen share | whiteboard)
 *   side panel (chat / participants — overlay on mobile, column on desktop)
 *   footer (controls bar)
 */
export function MeetingRoom() {
  const user = useAppStore((s) => s.user)
  const roomTitle = useAppStore((s) => s.roomTitle)
  const roomId = useAppStore((s) => s.roomId)
  const selfSocketId = useAppStore((s) => s.selfSocketId)
  const participants = useAppStore((s) => s.participants)
  const localStream = useAppStore((s) => s.localStream)
  const screenStream = useAppStore((s) => s.screenStream)
  const screenSharing = useAppStore((s) => s.screenSharing)
  const micOn = useAppStore((s) => s.micOn)
  const camOn = useAppStore((s) => s.camOn)
  const activePanel = useAppStore((s) => s.activePanel)
  const setActivePanel = useAppStore((s) => s.setActivePanel)
  const whiteboardOpen = useAppStore((s) => s.whiteboardOpen)
  const socketStatus = useAppStore((s) => s.socketStatus)
  const socketError = useAppStore((s) => s.socketError)

  const { leaveMeeting } = useMeeting()
  const [copied, setCopied] = useState(false)

  // Warn before closing the tab mid-meeting.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  if (!user || !roomId || !selfSocketId) return null

  const list = Object.values(participants)
  const totalCount = list.length + 1

  // ---- spotlight (screen share active) ----
  const presenter = screenSharing ? 'self' : list.find((p) => p.screenSharing)?.socketId ?? null

  function copyRoomId() {
    void navigator.clipboard.writeText(roomId ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-secondary/60 text-foreground">
      {/* ---------------- header ---------------- */}
      <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Video className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold leading-4 text-foreground">{roomTitle}</h1>
            <button
              onClick={copyRoomId}
              className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-primary"
              aria-label="Copy meeting ID"
            >
              {formatRoomId(roomId)}
              {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Badge
            variant="secondary"
            className="gap-1.5 border border-border bg-card font-medium text-slate-600 shadow-xs"
            aria-live="polite"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                socketStatus === 'connected'
                  ? 'bg-primary'
                  : socketStatus === 'connecting'
                    ? 'animate-pulse bg-amber-500'
                    : 'bg-rose-500'
              }`}
              aria-hidden
            />
            {socketStatus === 'connected'
              ? 'Live'
              : socketStatus === 'connecting'
                ? 'Connecting…'
                : 'Offline'}
          </Badge>
          <Badge variant="secondary" className="gap-1.5 border border-border bg-card font-medium text-slate-600 shadow-xs">
            <Users className="h-3.5 w-3.5" aria-hidden />
            {totalCount}
          </Badge>
        </div>
      </header>

      {/* reconnect banner */}
      {(socketStatus === 'disconnected' || socketStatus === 'error') && (
        <div
          role="alert"
          className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          {socketError || 'Connection lost — reconnecting…'}
        </div>
      )}

      {/* ---------------- body ---------------- */}
      <div className="relative flex min-h-0 flex-1">
        {/* main area */}
        <div className="min-w-0 flex-1 overflow-hidden">
          {whiteboardOpen ? (
            <div className="flex h-full gap-2 p-2 sm:gap-3 sm:p-3">
              <div className="min-w-0 flex-1">
                <Whiteboard onClose={() => useAppStore.getState().setWhiteboardOpen(false)} />
              </div>
              {/* filmstrip while drawing together */}
              <div className="hidden w-40 shrink-0 flex-col gap-2 overflow-y-auto sm:flex lg:w-48 wb-scroll">
                <SelfTile compact />
                {list.map((p) => (
                  <RemoteTile key={p.socketId} socketId={p.socketId} compact />
                ))}
              </div>
            </div>
          ) : presenter ? (
            /* spotlight layout */
            <div className="flex h-full flex-col gap-2 p-2 sm:flex-row sm:gap-3 sm:p-3">
              <div className="min-h-0 min-w-0 flex-1">
                {presenter === 'self' ? (
                  <VideoTile
                    name={user.name}
                    isSelf
                    micOn={micOn}
                    camOn={camOn}
                    screenSharing={screenSharing}
                    stream={screenStream ?? localStream}
                    mirrored={false}
                  />
                ) : (
                  <RemoteTile socketId={presenter} />
                )}
              </div>
              <div className="flex shrink-0 gap-2 overflow-x-auto pb-1 sm:w-40 sm:flex-col sm:overflow-y-auto sm:pb-0 lg:w-48 wb-scroll">
                {list
                  .filter((p) => p.socketId !== presenter)
                  .map((p) => (
                    <div key={p.socketId} className="w-36 shrink-0 sm:w-auto">
                      <RemoteTile socketId={p.socketId} compact />
                    </div>
                  ))}
                {presenter !== 'self' && (
                  <div className="w-36 shrink-0 sm:w-auto">
                    <SelfTile compact />
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* uniform video grid */
            <div className="h-full overflow-y-auto p-2 sm:p-3 wb-scroll">
              <div
                className={`grid h-full min-h-0 gap-2 sm:gap-3 ${gridCols(totalCount)} ${totalCount <= 2 ? 'mx-auto max-w-4xl content-center' : ''}`}
              >
                <SelfTile />
                {list.map((p) => (
                  <RemoteTile key={p.socketId} socketId={p.socketId} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* side panel: overlay on mobile, column on desktop */}
        {activePanel && (
          <aside
            className={`fixed inset-y-0 right-0 z-40 w-[92%] max-w-sm border-l border-border bg-card shadow-pop sm:static sm:z-auto sm:w-80 sm:shadow-none sm:shrink-0 lg:w-96 ${
              activePanel === 'chat' || activePanel === 'participants' ? 'flex' : 'hidden'
            } flex-col`}
            aria-label={activePanel === 'chat' ? 'Chat panel' : 'Participants panel'}
          >
            {activePanel === 'chat' ? (
              <ChatPanel onClose={() => setActivePanel(null)} />
            ) : (
              <ParticipantsPanel onClose={() => setActivePanel(null)} />
            )}
          </aside>
        )}
      </div>

      {/* ---------------- footer / controls ---------------- */}
      <footer className="relative z-10 flex justify-center px-2 pb-3 pt-1">
        <ControlsBar
          onLeave={() => {
            void leaveMeeting()
          }}
        />
      </footer>
    </div>
  )

  // ---- tile helpers (closures over component state) ----

  function SelfTile({ compact = false }: { compact?: boolean }) {
    return (
      <div className={compact ? 'aspect-video' : totalCount === 1 ? 'mx-auto aspect-video w-full max-w-3xl' : 'aspect-video'}>
        <VideoTile
          name={user!.name}
          isSelf
          micOn={micOn}
          camOn={camOn}
          screenSharing={screenSharing}
          stream={screenSharing ? screenStream : localStream}
          mirrored
          compact={compact}
        />
      </div>
    )
  }

  function RemoteTile({ socketId, compact = false }: { socketId: string; compact?: boolean }) {
    const p = participants[socketId]
    if (!p) return null
    return (
      <div className={compact ? 'aspect-video' : totalCount === 1 ? 'mx-auto aspect-video w-full max-w-3xl' : 'aspect-video'}>
        <VideoTile
          name={p.name}
          isSelf={false}
          micOn={p.micOn}
          camOn={p.camOn}
          screenSharing={p.screenSharing}
          connectionState={p.connectionState ?? 'new'}
          stream={p.remoteStream ?? null}
          compact={compact}
        />
      </div>
    )
  }
}

function gridCols(count: number): string {
  if (count <= 1) return 'grid-cols-1'
  if (count <= 4) return 'grid-cols-1 sm:grid-cols-2'
  if (count <= 9) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
  return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
}

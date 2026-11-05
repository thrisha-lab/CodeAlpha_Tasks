'use client'

import {
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  PenLine,
  PhoneOff,
  Users,
  Video,
  VideoOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useAppStore } from '@/store/useAppStore'
import { peerManager } from '@/services/webrtc'

interface Props {
  onLeave: () => void
}

/** Bottom control bar: mic / cam / screen / whiteboard / chat / participants / leave. */
export function ControlsBar({ onLeave }: Props) {
  const micOn = useAppStore((s) => s.micOn)
  const camOn = useAppStore((s) => s.camOn)
  const screenSharing = useAppStore((s) => s.screenSharing)
  const whiteboardOpen = useAppStore((s) => s.whiteboardOpen)
  const activePanel = useAppStore((s) => s.activePanel)
  const unreadChat = useAppStore((s) => s.unreadChat)
  const participantCount = Object.keys(useAppStore((s) => s.participants)).length + 1
  const setActivePanel = useAppStore((s) => s.setActivePanel)
  const setWhiteboardOpen = useAppStore((s) => s.setWhiteboardOpen)

  function toggleMic() {
    peerManager.toggleMic()
  }
  function toggleCam() {
    peerManager.toggleCam()
  }
  function toggleScreen() {
    if (screenSharing) void peerManager.stopScreenShare()
    else void peerManager.startScreenShare()
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="pointer-events-auto mx-auto flex items-center gap-1.5 rounded-2xl border border-border bg-card/95 p-2 shadow-pop backdrop-blur">
        <ControlButton
          active={micOn}
          danger={!micOn}
          onClick={toggleMic}
          label={micOn ? 'Mute microphone' : 'Unmute microphone'}
        >
          {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </ControlButton>

        <ControlButton
          active={camOn}
          danger={!camOn}
          onClick={toggleCam}
          label={camOn ? 'Turn camera off' : 'Turn camera on'}
        >
          {camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </ControlButton>

        <ControlButton
          active={screenSharing}
          accent
          onClick={toggleScreen}
          label={screenSharing ? 'Stop screen sharing' : 'Share your screen'}
        >
          <MonitorUp className="h-5 w-5" />
        </ControlButton>

        <ControlButton
          active={whiteboardOpen}
          accent
          onClick={() => setWhiteboardOpen(!whiteboardOpen)}
          label={whiteboardOpen ? 'Close whiteboard' : 'Open collaborative whiteboard'}
        >
          <PenLine className="h-5 w-5" />
        </ControlButton>

        <div className="mx-1 h-8 w-px bg-border" aria-hidden />

        <ControlButton
          active={activePanel === 'chat'}
          onClick={() => setActivePanel(activePanel === 'chat' ? null : 'chat')}
          label="Toggle chat"
          badge={unreadChat > 0 ? unreadChat : undefined}
        >
          <MessageSquare className="h-5 w-5" />
        </ControlButton>

        <ControlButton
          active={activePanel === 'participants'}
          onClick={() => setActivePanel(activePanel === 'participants' ? null : 'participants')}
          label="Toggle participant list"
        >
          <span className="relative">
            <Users className="h-5 w-5" />
            <span className="absolute -right-2 -top-1.5 rounded-full bg-secondary px-1 text-[10px] font-semibold leading-4 text-slate-600 ring-1 ring-border">
              {participantCount}
            </span>
          </span>
        </ControlButton>

        <Button
          size="lg"
          onClick={onLeave}
          aria-label="Leave meeting"
          className="ml-1.5 h-11 gap-2 rounded-xl bg-rose-600 px-4 font-semibold text-white shadow-sm transition-all hover:bg-rose-700 hover:shadow-md"
        >
          <PhoneOff className="h-5 w-5" aria-hidden />
          <span className="hidden sm:inline">Leave</span>
        </Button>
      </div>
    </TooltipProvider>
  )
}

function ControlButton({
  children,
  active,
  danger,
  accent,
  onClick,
  label,
  badge,
}: {
  children: React.ReactNode
  active: boolean
  danger?: boolean
  accent?: boolean
  onClick: () => void
  label: string
  badge?: number
}) {
  const cls = danger
    ? 'bg-rose-600 text-white shadow-sm hover:bg-rose-700'
    : active
      ? accent
        ? 'bg-primary text-white shadow-sm hover:bg-primary/90'
        : 'bg-primary/10 text-primary hover:bg-primary/20'
      : 'bg-secondary text-slate-600 hover:bg-slate-200 hover:text-foreground'
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="lg"
          onClick={onClick}
          aria-label={label}
          aria-pressed={active}
          className={`relative h-11 w-11 rounded-xl border border-transparent p-0 transition-all sm:w-12 ${cls}`}
        >
          {children}
          {badge !== undefined && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white ring-2 ring-card">
              {badge}
            </span>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  )
}

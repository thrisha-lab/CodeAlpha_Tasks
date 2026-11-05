'use client'

import { Camera, CameraOff, Mic, MicOff, MonitorUp, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAppStore } from '@/store/useAppStore'
import { avatarColor, initials } from '@/lib/rtc/format'

interface Props {
  onClose: () => void
}

/** Live participant list with camera / mic / screen-share status. */
export function ParticipantsPanel({ onClose }: Props) {
  const participants = useAppStore((s) => s.participants)
  const user = useAppStore((s) => s.user)
  const micOn = useAppStore((s) => s.micOn)
  const camOn = useAppStore((s) => s.camOn)
  const screenSharing = useAppStore((s) => s.screenSharing)

  const list = [
    // self first
    {
      socketId: 'self',
      userId: user?.id ?? '',
      name: user?.name ?? 'You',
      micOn,
      camOn,
      screenSharing,
      isSelf: true,
    },
    ...Object.values(participants).map((p) => ({ ...p, isSelf: false })),
  ]

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
          Participants
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-slate-600">
            {list.length}
          </span>
        </h2>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          aria-label="Close participants panel"
          className="h-8 w-8 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-2 py-2">
        <ul className="space-y-1">
          {list.map((p) => (
            <li
              key={p.socketId}
              className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-secondary/70"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className={`${avatarColor(p.name)} text-xs text-white`}>
                  {initials(p.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {p.name}
                  {p.isSelf && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                {p.screenSharing && (
                  <MonitorUp className="h-4 w-4 text-primary" aria-label="Sharing screen" />
                )}
                {p.micOn ? (
                  <Mic className="h-4 w-4 text-slate-500" aria-label="Microphone on" />
                ) : (
                  <MicOff className="h-4 w-4 text-rose-500" aria-label="Microphone off" />
                )}
                {p.camOn ? (
                  <Camera className="h-4 w-4 text-slate-500" aria-label="Camera on" />
                ) : (
                  <CameraOff className="h-4 w-4 text-rose-500" aria-label="Camera off" />
                )}
              </div>
            </li>
          ))}
        </ul>
      </ScrollArea>

      <p className="border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
        Media is peer-to-peer (WebRTC). The server only relays signaling, chat and whiteboard data.
      </p>
    </div>
  )
}

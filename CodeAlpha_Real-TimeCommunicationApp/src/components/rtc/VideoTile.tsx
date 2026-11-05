'use client'

import { useEffect, useRef, useState } from 'react'
import { CameraOff, Loader2, MicOff, MonitorUp, Maximize2, WifiOff } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { Participant } from '@/lib/rtc/types'
import { avatarColor, initials } from '@/lib/rtc/format'

interface Props {
  name: string
  isSelf: boolean
  micOn: boolean
  camOn: boolean
  screenSharing: boolean
  connectionState?: RTCPeerConnectionState | 'new'
  /** Stream to render. Self camera, self screen, or a remote peer's stream. */
  stream: MediaStream | null
  mirrored?: boolean
  compact?: boolean
}

/**
 * A single video tile. Shows:
 *  - the live <video> when a video track is flowing and the camera is on
 *  - an avatar fallback when the camera is off / no track yet
 *  - connection overlays (connecting / reconnecting / failed)
 */
export function VideoTile({
  name,
  isSelf,
  micOn,
  camOn,
  screenSharing,
  connectionState,
  stream,
  mirrored = false,
  compact = false,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [hasVideo, setHasVideo] = useState(false)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (stream && stream !== el.srcObject) {
      el.srcObject = stream
      el.play().catch(() => undefined)
    }
    const check = () => setHasVideo(!!stream && stream.getVideoTracks().some((t) => t.readyState === 'live'))
    check()
    stream?.addEventListener('addtrack', check)
    stream?.addEventListener('removetrack', check)
    return () => {
      stream?.removeEventListener('addtrack', check)
      stream?.removeEventListener('removetrack', check)
    }
  }, [stream])

  const showVideo = hasVideo && (isSelf ? screenSharing || camOn : camOn !== false || hasVideo)
  const connecting =
    !isSelf && (connectionState === 'new' || connectionState === 'connecting') && !hasVideo
  const failed = !isSelf && connectionState === 'failed'
  const interrupted = !isSelf && connectionState === 'disconnected'

  function fullscreen() {
    const el = containerRef.current
    if (!el) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void el.requestFullscreen().catch(() => undefined)
  }

  return (
    <div
      ref={containerRef}
      className={`group relative overflow-hidden bg-slate-900 ${compact ? 'rounded-lg border border-slate-300/70' : 'rounded-xl border border-slate-300/70 shadow-card'} ${screenSharing ? 'ring-2 ring-primary' : ''} aspect-video`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isSelf} // never play own audio back (echo)
        className={`h-full w-full ${showVideo ? 'object-cover' : 'hidden'} ${mirrored && !screenSharing ? 'scale-x-[-1]' : ''}`}
        aria-label={`${name}'s video`}
      />

      {/* avatar fallback */}
      {!showVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Avatar className={compact ? 'h-10 w-10' : 'h-20 w-20'}>
            <AvatarFallback className={`${avatarColor(name)} text-xl font-semibold text-white`}>
              {initials(name)}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* connecting / interrupted overlays */}
      {connecting && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-slate-950/70 text-xs text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Connecting…
        </div>
      )}
      {(interrupted || failed) && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-slate-950/70 text-xs text-amber-300">
          <WifiOff className="h-4 w-4" aria-hidden /> {failed ? 'Connection failed' : 'Reconnecting…'}
        </div>
      )}

      {/* name row */}
      <div
        className={`absolute bottom-0 left-0 right-0 flex items-center justify-between bg-gradient-to-t from-slate-950/90 to-transparent ${compact ? 'px-2 pb-1 pt-4' : 'px-3 pb-2 pt-8'}`}
      >
        <span className={`flex items-center gap-1.5 font-medium text-white ${compact ? 'text-[11px]' : 'text-sm'}`}>
          <span className="truncate">
            {name} {isSelf && <span className="text-slate-400">(you)</span>}
          </span>
          {!micOn && <MicOff className="h-3.5 w-3.5 shrink-0 text-rose-400" aria-label="Microphone off" />}
          {!camOn && !screenSharing && (
            <CameraOff className="h-3.5 w-3.5 shrink-0 text-rose-400" aria-label="Camera off" />
          )}
          {screenSharing && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-600/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
              <MonitorUp className="h-3 w-3" aria-hidden /> Presenting
            </span>
          )}
        </span>
        {!compact && (
          <button
            onClick={fullscreen}
            className="rounded p-1 text-slate-300 opacity-0 transition-opacity hover:text-white focus:opacity-100 group-hover:opacity-100"
            aria-label={`Fullscreen ${name}'s video`}
          >
            <Maximize2 className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
    </div>
  )
}

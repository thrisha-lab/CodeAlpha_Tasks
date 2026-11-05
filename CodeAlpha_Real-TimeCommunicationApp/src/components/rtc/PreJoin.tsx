'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  Camera,
  CameraOff,
  Check,
  Copy,
  Loader2,
  Mic,
  MicOff,
  ShieldAlert,
  Video,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useAppStore } from '@/store/useAppStore'
import { useMeeting } from '@/hooks/useMeeting'
import { peerManager } from '@/services/webrtc'
import { describeMediaError, formatRoomId } from '@/lib/rtc/format'
import type { MediaErrorKind } from '@/lib/rtc/types'

export function PreJoin() {
  const pendingRoomId = useAppStore((s) => s.pendingRoomId)
  const pendingRoomTitle = useAppStore((s) => s.pendingRoomTitle)
  const localStream = useAppStore((s) => s.localStream)
  const micOn = useAppStore((s) => s.micOn)
  const camOn = useAppStore((s) => s.camOn)
  const mediaError = useAppStore((s) => s.mediaError)
  const acquiring = useAppStore((s) => s.acquiringMedia)
  const joining = useAppStore((s) => s.joining)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const enteringRef = useRef(false) // true when we are transitioning to the meeting
  const [copied, setCopied] = useState(false)
  const { enterMeeting, leaveMeeting } = useMeeting()

  // Acquire camera + mic preview once on mount.
  useEffect(() => {
    let cancelled = false
    const store = useAppStore.getState()

    async function acquire() {
      store.setAcquiringMedia(true)
      store.setMediaError(null)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: { echoCancellation: true, noiseSuppression: true },
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        store.setLocalStream(stream)
        store.setMicOn(true)
        store.setCamOn(true)
      } catch (err) {
        if (cancelled) return
        const name = (err as DOMException)?.name
        const kind: MediaErrorKind =
          name === 'NotAllowedError'
            ? 'camera-denied'
            : name === 'NotFoundError' || name === 'OverconstrainedError'
              ? 'not-found'
              : name === 'NotReadableError'
                ? 'in-use'
                : 'unknown'
        store.setMediaError({ kind, detail: (err as Error).message })
      } finally {
        if (!cancelled) store.setAcquiringMedia(false)
      }
    }

    void acquire()

    return () => {
      cancelled = true
      // Stop preview tracks ONLY when abandoning the pre-join screen.
      // When joining the meeting the same stream must stay alive (peerManager
      // hands its tracks to the RTCPeerConnections), so we skip the teardown.
      if (!enteringRef.current) {
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        useAppStore.getState().setLocalStream(null)
      }
    }
  }, [])

  // Attach the preview stream to the video element.
  useEffect(() => {
    const el = videoRef.current
    if (el && localStream) {
      el.srcObject = localStream
      el.play().catch(() => undefined)
    }
  }, [localStream])

  if (!pendingRoomId) return null

  function toggleMic() {
    const track = streamRef.current?.getAudioTracks()[0]
    if (!track) return
    const next = !track.enabled
    track.enabled = next
    useAppStore.getState().setMicOn(next)
  }

  function toggleCam() {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    const next = !track.enabled
    track.enabled = next
    useAppStore.getState().setCamOn(next)
  }

  function copyInvite() {
    const url = `${window.location.origin}/?room=${pendingRoomId}`
    void navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const error = mediaError ? describeMediaError(mediaError.kind) : null

  return (
    <main className="flex flex-1 flex-col bg-gradient-to-b from-emerald-50/50 via-background to-background">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6 sm:py-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            className="gap-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            onClick={() => {
              peerManager.releaseLocalMedia()
              leaveMeeting()
            }}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back
          </Button>
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 font-mono text-sm tracking-wider text-foreground shadow-card">
            {formatRoomId(pendingRoomId)}
            <button
              onClick={copyInvite}
              aria-label="Copy invite link"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <h1 className="mb-1 text-center text-2xl font-bold tracking-tight text-foreground">{pendingRoomTitle}</h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Ready to join? Check your camera and microphone first.
        </p>

        {/* preview */}
        <div className="relative mx-auto aspect-video w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-slate-900 shadow-pop">
          {localStream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`h-full w-full object-cover ${camOn ? '' : 'opacity-0'}`}
              aria-label="Camera preview"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-slate-400">
              {acquiring ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
                  <p className="text-sm">Requesting camera &amp; microphone…</p>
                </>
              ) : (
                <>
                  <CameraOff className="h-10 w-10" aria-hidden />
                  <p className="max-w-xs text-center text-sm">
                    No camera preview available. You can still join and enable devices later.
                  </p>
                </>
              )}
            </div>
          )}

          {localStream && !camOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
              <CameraOff className="h-12 w-12 text-slate-600" aria-hidden />
            </div>
          )}

          {/* status pills */}
          <div className="absolute bottom-3 left-3 flex gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-slate-950/70 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              {micOn ? (
                <Mic className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
              ) : (
                <MicOff className="h-3.5 w-3.5 text-rose-400" aria-hidden />
              )}
              {micOn ? 'Mic on' : 'Mic off'}
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-slate-950/70 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              {camOn ? (
                <Camera className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
              ) : (
                <CameraOff className="h-3.5 w-3.5 text-rose-400" aria-hidden />
              )}
              {camOn ? 'Camera on' : 'Camera off'}
            </span>
          </div>
        </div>

        {/* permission error help */}
        {error && (
          <Alert className="mx-auto mt-5 max-w-2xl rounded-xl border-amber-200 bg-amber-50 text-amber-900 shadow-card [&>svg]:text-amber-500">
            <ShieldAlert className="h-4 w-4" aria-hidden />
            <AlertTitle>{error.title}</AlertTitle>
            <AlertDescription className="text-amber-800">{error.hint}</AlertDescription>
          </Alert>
        )}

        {/* controls */}
        <div className="mt-7 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <div className="flex gap-3">
            <Button
              size="lg"
              variant="outline"
              onClick={toggleMic}
              disabled={!localStream}
              aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
              className={`h-12 w-12 rounded-full border p-0 shadow-card transition-all ${micOn ? 'border-border bg-card text-foreground hover:bg-secondary' : 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'}`}
            >
              {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={toggleCam}
              disabled={!localStream}
              aria-label={camOn ? 'Turn camera off' : 'Turn camera on'}
              className={`h-12 w-12 rounded-full border p-0 shadow-card transition-all ${camOn ? 'border-border bg-card text-foreground hover:bg-secondary' : 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'}`}
            >
              {camOn ? <Video className="h-5 w-5" /> : <CameraOff className="h-5 w-5" />}
            </Button>
          </div>
          <Button
            size="lg"
            onClick={() => {
              enteringRef.current = true
              void enterMeeting()
            }}
            disabled={joining}
            className="h-12 rounded-xl px-10 text-base font-semibold shadow-md shadow-emerald-600/20 transition-all hover:shadow-lg hover:shadow-emerald-600/25"
          >
            {joining && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            Join now
          </Button>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          You can enable or disable your microphone and camera at any time during the meeting.
        </p>
      </div>
    </main>
  )
}

'use client'

import { STUN_SERVERS, type Participant, type SimpleAck } from '@/lib/rtc/types'
import { useAppStore } from '@/store/useAppStore'
import { emitAck } from '@/services/socket'
import { toast } from '@/hooks/use-toast'
import { describeMediaError } from '@/lib/rtc/format'

/**
 * WebRTC mesh manager.
 *
 * Architecture (see README "WebRTC Architecture"):
 *  - Media flows DIRECTLY peer-to-peer (RTCPeerConnection per remote participant).
 *  - The Socket.io server only relays small signaling messages
 *    (offers / answers / ICE candidates) — never media.
 *  - Topology: full mesh. The NEWCOMER initiates an offer to every existing
 *    participant, so offer glare is avoided by construction; the polite
 *    rollback path below still guards against rare reconnect races.
 *  - ICE: public Google STUN servers (dev-grade). Production needs TURN.
 *  - Screen share & late camera enable use `RTCRtpSender.replaceTrack`,
 *    so NO renegotiation is required for the common paths.
 */

interface PeerEntry {
  pc: RTCPeerConnection
  audioSender: RTCRtpSender | null
  videoSender: RTCRtpSender | null
  remoteStream: MediaStream
  pendingIce: RTCIceCandidateInit[]
}

class PeerManager {
  private socket: ReturnType<typeof import('socket.io-client').io> | null = null
  private selfSocketId: string | null = null
  private peers = new Map<string, PeerEntry>()
  private localStream: MediaStream | null = null

  // ------------------------------------------------------------------ setup

  attach(socket: NonNullable<typeof this.socket>, selfSocketId: string) {
    this.socket = socket
    this.selfSocketId = selfSocketId
    this.bindSocket(socket)
  }

  setLocalStream(stream: MediaStream | null) {
    this.localStream = stream
  }

  bindSocket(socket: NonNullable<typeof this.socket>) {
    socket.on('webrtc:offer', ({ from, sdp }: { from: string; sdp: string }) => {
      void this.handleOffer(from, sdp)
    })
    socket.on('webrtc:answer', ({ from, sdp }: { from: string; sdp: string }) => {
      void this.handleAnswer(from, sdp)
    })
    socket.on(
      'webrtc:ice-candidate',
      ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
        void this.handleCandidate(from, candidate)
      },
    )
  }

  /** Create offers to every existing participant (called for the newcomer). */
  connectToParticipants(participants: Participant[]) {
    for (const p of participants) {
      void this.createPeer(p.socketId, true)
    }
  }

  reset() {
    for (const [id, entry] of this.peers) {
      try {
        entry.pc.close()
      } catch {
        /* ignore */
      }
      this.peers.delete(id)
    }
  }

  destroy() {
    this.reset()
    if (this.socket) {
      this.socket.off('webrtc:offer')
      this.socket.off('webrtc:answer')
      this.socket.off('webrtc:ice-candidate')
    }
    this.socket = null
    this.selfSocketId = null
    this.localStream = null
  }

  // ------------------------------------------------------------- peer setup

  private getLocalTrack(kind: 'audio' | 'video'): MediaStreamTrack | null {
    return this.localStream?.getTracks().find((t) => t.kind === kind) ?? null
  }

  private async createPeer(peerId: string, initiator: boolean): Promise<PeerEntry> {
    const existing = this.peers.get(peerId)
    if (existing) {
      if (initiator && existing.pc.signalingState === 'stable') {
        await this.makeOffer(peerId, existing)
      }
      return existing
    }

    const store = useAppStore.getState()
    store.updateParticipant(peerId, { connectionState: 'new' })

    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS })
    const entry: PeerEntry = {
      pc,
      audioSender: null,
      videoSender: null,
      remoteStream: new MediaStream(),
      pendingIce: [],
    }
    this.peers.set(peerId, entry)

    // --- transceivers: created up-front with sendrecv so later
    //     enable/disable or replaceTrack never needs renegotiation ---
    const audioTrack = this.getLocalTrack('audio')
    const videoTrack = this.getLocalTrack('video')
    entry.audioSender = audioTrack
      ? pc.addTransceiver(audioTrack, { direction: 'sendrecv' }).sender
      : pc.addTransceiver('audio', { direction: 'sendrecv' }).sender
    entry.videoSender = videoTrack
      ? pc.addTransceiver(videoTrack, { direction: 'sendrecv' }).sender
      : pc.addTransceiver('video', { direction: 'sendrecv' }).sender

    // If we are already screen sharing, new peers must receive the screen track.
    if (store.screenSharing) {
      const screenTrack = store.screenStream?.getVideoTracks()[0]
      if (screenTrack) void entry.videoSender.replaceTrack(screenTrack)
    }

    pc.onicecandidate = (e) => {
      if (e.candidate && this.socket) {
        this.socket.emit('webrtc:ice-candidate', { to: peerId, candidate: e.candidate.toJSON() })
      }
    }

    pc.ontrack = (e) => {
      entry.remoteStream.addTrack(e.track)
      // Re-set the stream object to force React/srcObject refresh.
      useAppStore.getState().updateParticipant(peerId, {
        remoteStream: new MediaStream(entry.remoteStream.getTracks()),
      })
    }

    pc.onconnectionstatechange = () => {
      useAppStore.getState().updateParticipant(peerId, { connectionState: pc.connectionState })
      if (pc.connectionState === 'failed') {
        // One automatic recovery attempt via ICE restart:
        try {
          pc.restartIce()
        } catch {
          /* ignore */
        }
      }
    }

    if (initiator) {
      await this.makeOffer(peerId, entry)
    }
    return entry
  }

  private async makeOffer(peerId: string, entry: PeerEntry) {
    if (!this.socket) return
    const offer = await entry.pc.createOffer()
    await entry.pc.setLocalDescription(offer)
    this.socket.emit('webrtc:offer', { to: peerId, sdp: entry.pc.localDescription?.sdp })
  }

  // ------------------------------------------------------------ signaling in

  private async handleOffer(from: string, sdp: string) {
    try {
      const entry = await this.createPeer(from, false)
      // Implicit rollback handles the rare glare case (both sides offered).
      if (entry.pc.signalingState === 'have-local-offer') {
        await entry.pc.setRemoteDescription({ type: 'offer', sdp })
      } else if (entry.pc.signalingState === 'stable') {
        await entry.pc.setRemoteDescription({ type: 'offer', sdp })
      } else {
        return
      }
      const answer = await entry.pc.createAnswer()
      await entry.pc.setLocalDescription(answer)
      this.socket?.emit('webrtc:answer', { to: from, sdp: entry.pc.localDescription?.sdp })
      await this.flushPendingIce(entry)
    } catch (err) {
      console.error('handleOffer failed', err)
    }
  }

  private async handleAnswer(from: string, sdp: string) {
    const entry = this.peers.get(from)
    if (!entry || entry.pc.signalingState !== 'have-local-offer') return
    try {
      await entry.pc.setRemoteDescription({ type: 'answer', sdp })
      await this.flushPendingIce(entry)
    } catch (err) {
      console.error('handleAnswer failed', err)
    }
  }

  private async handleCandidate(from: string, candidate: RTCIceCandidateInit) {
    const entry = this.peers.get(from)
    if (!entry) return
    if (!entry.pc.remoteDescription) {
      entry.pendingIce.push(candidate)
      return
    }
    try {
      await entry.pc.addIceCandidate(candidate)
    } catch (err) {
      console.warn('addIceCandidate failed', err)
    }
  }

  private async flushPendingIce(entry: PeerEntry) {
    const queued = entry.pendingIce.splice(0)
    for (const c of queued) {
      try {
        await entry.pc.addIceCandidate(c)
      } catch (err) {
        console.warn('queued addIceCandidate failed', err)
      }
    }
  }

  handlePeerLeft(peerId: string) {
    const entry = this.peers.get(peerId)
    if (entry) {
      try {
        entry.pc.close()
      } catch {
        /* ignore */
      }
      this.peers.delete(peerId)
    }
  }

  // --------------------------------------------------------- media controls

  /** Toggle microphone: flips track.enabled (no renegotiation needed). */
  toggleMic(): boolean {
    const store = useAppStore.getState()
    const track = this.getLocalTrack('audio')
    if (!track) {
      void this.enableMic() // joined without media → try acquiring now
      return true
    }
    const next = !track.enabled
    track.enabled = next
    store.setMicOn(next)
    this.socket?.emit('media:state', { micOn: next })
    return next
  }

  /** Toggle camera: flips track.enabled when present. */
  toggleCam(): boolean {
    const store = useAppStore.getState()
    const track = this.getLocalTrack('video')
    if (!track) {
      void this.enableCamera()
      return true
    }
    const next = !track.enabled
    track.enabled = next
    store.setCamOn(next)
    this.socket?.emit('media:state', { camOn: next })
    return next
  }

  /** Try to acquire the microphone mid-meeting (after joining without media). */
  async enableMic(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const track = stream.getAudioTracks()[0]
      if (this.localStream) {
        this.localStream.addTrack(track)
      } else {
        this.localStream = new MediaStream([track])
        useAppStore.getState().setLocalStream(this.localStream)
      }
      for (const entry of this.peers.values()) {
        void entry.audioSender?.replaceTrack(track)
      }
      useAppStore.getState().setMicOn(true)
      this.socket?.emit('media:state', { micOn: true })
      toast({ title: 'Microphone enabled' })
      return true
    } catch (err) {
      this.reportMediaError(err)
      return false
    }
  }

  /** Try to acquire the camera mid-meeting (after joining without media). */
  async enableCamera(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      const track = stream.getVideoTracks()[0]
      if (this.localStream) {
        this.localStream.addTrack(track)
      } else {
        this.localStream = new MediaStream([track])
        useAppStore.getState().setLocalStream(this.localStream)
      }
      // Camera becomes active but starts in the user's current on/off state.
      for (const entry of this.peers.values()) {
        void entry.videoSender?.replaceTrack(track)
      }
      useAppStore.getState().setCamOn(true)
      useAppStore.getState().setLocalStream(new MediaStream(this.localStream.getTracks()))
      this.socket?.emit('media:state', { camOn: true })
      toast({ title: 'Camera enabled' })
      return true
    } catch (err) {
      this.reportMediaError(err)
      return false
    }
  }

  /**
   * Screen sharing: the screen track REPLACES the camera track on every
   * peer's video sender (replaceTrack) — no renegotiation. Stopping is
   * detected both via the button and the browser's built-in "Stop sharing".
   */
  async startScreenShare(): Promise<boolean> {
    const store = useAppStore.getState()
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 15 },
        audio: false,
      })
      const screenTrack = screen.getVideoTracks()[0]
      if (!screenTrack) return false
      store.setScreenStream(screen)
      store.setScreenSharing(true)
      for (const entry of this.peers.values()) {
        void entry.videoSender?.replaceTrack(screenTrack)
      }
      this.socket?.emit('media:state', { screenSharing: true })
      screenTrack.addEventListener('ended', () => {
        void this.stopScreenShare()
      })
      return true
    } catch (err) {
      const name = (err as DOMException)?.name
      if (name === 'NotAllowedError') {
        const { title, hint } = describeMediaError('screen-denied')
        toast({ title, description: hint })
      } else {
        toast({
          title: 'Screen sharing failed',
          description: (err as Error)?.message,
          variant: 'destructive',
        })
      }
      return false
    }
  }

  async stopScreenShare() {
    const store = useAppStore.getState()
    if (!store.screenSharing) return
    const camTrack = this.getLocalTrack('video') // may be null (user without camera)
    for (const entry of this.peers.values()) {
      void entry.videoSender?.replaceTrack(camTrack)
    }
    store.screenStream?.getTracks().forEach((t) => t.stop())
    store.setScreenStream(null)
    store.setScreenSharing(false)
    this.socket?.emit('media:state', { screenSharing: false })
  }

  /** Stop all local media (called when leaving the meeting). */
  releaseLocalMedia() {
    this.localStream?.getTracks().forEach((t) => t.stop())
    this.localStream = null
    const store = useAppStore.getState()
    store.setLocalStream(null)
    store.setScreenSharing(false)
    store.screenStream?.getTracks().forEach((t) => t.stop())
    store.setScreenStream(null)
    store.setMicOn(true)
    store.setCamOn(true)
  }

  private reportMediaError(err: unknown) {
    const name = (err as DOMException)?.name
    const kind =
      name === 'NotAllowedError'
        ? 'camera-denied'
        : name === 'NotFoundError' || name === 'OverconstrainedError'
          ? 'not-found'
          : name === 'NotReadableError'
            ? 'in-use'
            : 'unknown'
    const { title, hint } = describeMediaError(kind)
    toast({ title, description: hint, variant: 'destructive' })
    useAppStore.getState().setMediaError({ kind, detail: title })
  }

  /** Server acknowledged our join — noop hook for symmetry/future use. */
  onJoinedAck(_ack: SimpleAck) {
    void _ack
  }
}

export const peerManager = new PeerManager()

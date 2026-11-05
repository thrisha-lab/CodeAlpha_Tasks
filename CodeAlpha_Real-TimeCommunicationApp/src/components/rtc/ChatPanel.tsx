'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Download,
  File as FileIcon,
  FileSpreadsheet,
  FileText,
  ImageIcon,
  Loader2,
  MessageSquare,
  Paperclip,
  Send,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAppStore } from '@/store/useAppStore'
import { getSocket } from '@/services/socket'
import { apiUpload } from '@/lib/rtc/api-client'
import { avatarColor, formatBytes, formatTime, initials } from '@/lib/rtc/format'
import { FILE_MIME_ALLOWLIST, MAX_FILE_MB, type ChatMsg } from '@/lib/rtc/types'
import { toast } from '@/hooks/use-toast'

interface Props {
  onClose: () => void
}

/** Real-time chat panel with file sharing (upload via REST, notify via socket). */
export function ChatPanel({ onClose }: Props) {
  const chat = useAppStore((s) => s.chat)
  const user = useAppStore((s) => s.user)
  const addChat = useAppStore((s) => s.addChat)
  const roomId = useAppStore((s) => s.roomId)

  const [text, setText] = useState('')
  const [uploading, setUploading] = useState<{ name: string; pct: number } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const xhrRef = useRef<XMLHttpRequest | null>(null)

  // autoscroll to newest message
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [chat])

  function send() {
    const trimmed = text.trim()
    const socket = getSocket()
    if (!trimmed || !socket) return
    socket.emit('chat:message', { text: trimmed })
    setText('')
  }

  function pickFile() {
    fileInputRef.current?.click()
  }

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file || !roomId) return

    // client-side validation (server enforces the same rules — defense in depth)
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: `Maximum size is ${MAX_FILE_MB} MB (got ${formatBytes(file.size)}).`,
        variant: 'destructive',
      })
      return
    }
    if (!FILE_MIME_ALLOWLIST.includes(file.type)) {
      toast({
        title: 'File type not allowed',
        description: `${file.type || 'Unknown type'} is not in the allowlist.`,
        variant: 'destructive',
      })
      return
    }

    setUploading({ name: file.name, pct: 0 })
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('roomId', roomId)
      const { file: meta } = await apiUpload<{ file: { id: string; filename: string; mimeType: string; size: number } }>(
        '/api/files/upload',
        form,
        (pct) => setUploading({ name: file.name, pct }),
        xhrRef,
      )
      // Broadcast metadata so everyone gets a download card.
      getSocket()?.emit('file:shared', {
        fileId: meta.id,
        filename: meta.filename,
        mimeType: meta.mimeType,
        size: meta.size,
      })
    } catch (err) {
      toast({
        title: 'File share failed',
        description: (err as Error).message,
        variant: 'destructive',
      })
    } finally {
      setUploading(null)
    }
  }

  function cancelUpload() {
    xhrRef.current?.abort()
    setUploading(null)
  }

  async function download(msg: ChatMsg) {
    if (!msg.file) return
    try {
      const res = await fetch(`/api/files/${msg.file.fileId}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Download failed (${res.status})`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = msg.file.filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast({ title: 'Download failed', description: (err as Error).message, variant: 'destructive' })
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Meeting chat</h2>
        <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close chat" className="h-8 w-8 text-muted-foreground hover:bg-secondary hover:text-foreground">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 wb-scroll">
        {chat.length === 0 ? (
          <div className="mt-8 flex flex-col items-center gap-2 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
              <MessageSquare className="h-5 w-5 text-muted-foreground/50" aria-hidden />
            </div>
            <p className="text-xs text-muted-foreground">
              No messages yet — say hello 👋
              <br />
              Messages and shared files last for this session.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {chat.map((m) => {
              if (m.userId === 'system') {
                return (
                  <li key={m.id} className="text-center text-[11px] italic text-muted-foreground/80">
                    {m.text}
                  </li>
                )
              }
              const isOwn = !!user && m.userId === user.id
              return (
                <li key={m.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                  <Avatar className="mt-0.5 h-7 w-7 shrink-0">
                    <AvatarFallback className={`${avatarColor(m.name)} text-[10px] text-white`}>
                      {initials(m.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[80%] ${isOwn ? 'items-end text-right' : ''} flex flex-col`}>
                    <span className="mb-0.5 text-[11px] text-muted-foreground">
                      {isOwn ? 'You' : m.name} · {formatTime(m.at)}
                    </span>
                    {m.file ? (
                      <FileCard msg={m} onDownload={() => void download(m)} />
                    ) : (
                      <p
                        className={`inline-block whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm shadow-xs ${
                          isOwn
                            ? 'rounded-br-sm bg-primary text-primary-foreground'
                            : 'rounded-bl-sm border border-border bg-secondary text-foreground'
                        }`}
                      >
                        {m.text}
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* upload progress */}
      {uploading && (
        <div className="mx-4 mb-2 rounded-xl border border-primary/20 bg-accent px-3 py-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 truncate text-accent-foreground">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              Uploading {uploading.name}
            </span>
            <button onClick={cancelUpload} className="text-muted-foreground transition-colors hover:text-foreground" aria-label="Cancel upload">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white">
            <div className="h-full bg-primary transition-all" style={{ width: `${uploading.pct}%` }} />
          </div>
        </div>
      )}

      {/* composer */}
      <div className="flex items-center gap-2 border-t border-border p-3">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => void onFileSelected(e)}
          aria-hidden
        />
        <Button
          size="icon"
          variant="ghost"
          onClick={pickFile}
          disabled={!!uploading}
          aria-label="Share a file"
          className="h-10 w-10 shrink-0 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          placeholder="Type a message…"
          maxLength={2000}
          aria-label="Chat message"
        />
        <Button
          size="icon"
          onClick={send}
          disabled={!text.trim()}
          aria-label="Send message"
          className="h-10 w-10 shrink-0 rounded-lg shadow-sm transition-all hover:shadow-md"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function FileCard({ msg, onDownload }: { msg: ChatMsg; onDownload: () => void }) {
  const { file } = msg
  if (!file) return null
  return (
    <div className="flex w-64 max-w-full items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent">
        {fileIcon(file.mimeType, file.filename)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground" title={file.filename}>
          {file.filename}
        </p>
        <p className="text-[11px] text-muted-foreground">{formatBytes(file.size)}</p>
      </div>
      <Button
        size="icon"
        variant="ghost"
        onClick={onDownload}
        aria-label={`Download ${file.filename}`}
        className="h-8 w-8 shrink-0 text-primary hover:bg-accent hover:text-accent-foreground"
      >
        <Download className="h-4 w-4" />
      </Button>
    </div>
  )
}

/** Returns a ready-to-render icon element for a file type. */
function fileIcon(mime: string, filename: string): React.ReactElement {
  const cls = 'h-5 w-5 text-primary'
  if (mime.startsWith('image/')) return <ImageIcon className={cls} aria-hidden />
  if (mime === 'application/pdf' || filename.endsWith('.pdf')) return <FileText className={cls} aria-hidden />
  if (filename.match(/\.(xlsx?|csv)$/)) return <FileSpreadsheet className={cls} aria-hidden />
  return <FileIcon className={cls} aria-hidden />
}

'use client'

import { useEffect, useState } from 'react'
import {
  CalendarDays,
  Copy,
  LogOut,
  Plus,
  Settings,
  UserRound,
  Users,
  Video,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAppStore } from '@/store/useAppStore'
import { useMeeting } from '@/hooks/useMeeting'
import { apiPost } from '@/lib/rtc/api-client'
import { avatarColor, formatDateTime, initials } from '@/lib/rtc/format'
import { ProfileDialog } from '@/components/rtc/ProfileDialog'

export function Lobby() {
  const user = useAppStore((s) => s.user)
  const meetingHistory = useAppStore((s) => s.meetingHistory)
  const historyLoading = useAppStore((s) => s.historyLoading)
  const { createMeeting, joinByRoomId, refreshHistory } = useMeeting()

  const [title, setTitle] = useState('')
  const [joinId, setJoinId] = useState('')
  const [creating, setCreating] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  // Support shareable links like /?room=ABC-DEF-GHIJ
  // (deferred via setTimeout so we don't setState synchronously inside an effect)
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(window.location.search)
      const room = params.get('room')
      if (room) setJoinId(room.replace(/-/g, '').toUpperCase())
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || creating) return
    setCreating(true)
    await createMeeting(title.trim())
    setCreating(false)
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!joinId.trim()) return
    await joinByRoomId(joinId)
  }

  async function handleLogout() {
    try {
      await apiPost('/api/auth/logout')
    } catch {
      /* ignore */
    }
    const store = useAppStore.getState()
    store.setUser(null)
    store.setHistory([])
    store.setView('auth')
  }

  function copyRoomId(roomId: string) {
    void navigator.clipboard.writeText(roomId)
  }

  if (!user) return null

  return (
    <main className="flex-1 bg-gradient-to-b from-emerald-50/50 via-background to-background">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
        {/* header */}
        <header className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Video className="h-5 w-5" aria-hidden />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">CodeAlpha Connect</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2" aria-label="Account menu">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className={`${avatarColor(user.username)} text-white text-xs`}>
                    {initials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium sm:inline">{user.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="text-sm font-semibold">{user.name}</div>
                <div className="text-xs text-muted-foreground">@{user.username}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                <Settings className="mr-2 h-4 w-4" aria-hidden /> Edit profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void refreshHistory()}>
                <CalendarDays className="mr-2 h-4 w-4" aria-hidden /> Refresh history
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void handleLogout()} variant="destructive">
                <LogOut className="mr-2 h-4 w-4" aria-hidden /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* greeting + actions */}
        <section className="mb-8 space-y-1.5">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Welcome back, {user.name.split(' ')[0]} 👋
          </h2>
          <p className="text-[15px] text-muted-foreground">
            Start a new meeting or join one with an ID — video, chat, files and whiteboard included.
          </p>
        </section>

        <section className="mb-10" aria-label="Start or join a meeting">
          <Tabs defaultValue="create">
            <TabsList className="h-11 w-full max-w-md rounded-xl bg-secondary p-1">
              <TabsTrigger
                value="create"
                className="gap-1.5 rounded-lg text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                <Plus className="h-4 w-4" aria-hidden /> New meeting
              </TabsTrigger>
              <TabsTrigger
                value="join"
                className="gap-1.5 rounded-lg text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                <Users className="h-4 w-4" aria-hidden /> Join meeting
              </TabsTrigger>
            </TabsList>

            <TabsContent value="join">
              <Card className="mt-4 rounded-2xl border-border shadow-card">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Join with a meeting ID</CardTitle>
                  <CardDescription>
                    Ask the host for the 10-character ID, e.g. <code>ABC-DEF-GHIJ</code>.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleJoin} className="flex flex-col gap-3 sm:flex-row">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="roomid" className="sr-only">
                        Meeting ID
                      </Label>
                      <Input
                        id="roomid"
                        value={joinId}
                        onChange={(e) => setJoinId(e.target.value.toUpperCase())}
                        placeholder="ABC-DEF-GHIJ"
                        className="font-mono tracking-widest"
                        maxLength={14}
                      />
                    </div>
                    <Button
                      type="submit"
                      className="h-10 rounded-lg font-semibold shadow-sm transition-all hover:shadow-md sm:w-32"
                      disabled={!joinId.trim()}
                    >
                      Join
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="create">
              <Card className="mt-4 rounded-2xl border-border shadow-card">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Start a new meeting</CardTitle>
                  <CardDescription>
                    A secure room ID is generated for you — share it with participants.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreate} className="flex flex-col gap-3 sm:flex-row">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="title" className="sr-only">
                        Meeting title
                      </Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Sprint stand-up"
                        minLength={3}
                        maxLength={80}
                      />
                    </div>
                    <Button
                      type="submit"
                      className="h-10 rounded-lg font-semibold shadow-sm transition-all hover:shadow-md sm:w-32"
                      disabled={title.trim().length < 3 || creating}
                    >
                      Create
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>

        {/* history */}
        <section aria-label="Recent meetings">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Recent meetings
          </h3>
          {historyLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : meetingHistory.length === 0 ? (
            <Card className="rounded-2xl border-border shadow-card">
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                  <UserRound className="h-6 w-6 text-muted-foreground/60" aria-hidden />
                </div>
                <p className="max-w-xs text-sm text-muted-foreground">
                  No meetings yet. Create one above to get started.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-2.5">
              {meetingHistory.map((m) => (
                <li key={m.roomId}>
                  <Card className="rounded-xl border-border shadow-card transition-all hover:shadow-md hover:bg-card">
                    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium">{m.title}</p>
                          <Badge
                            variant={m.role === 'host' ? 'default' : 'secondary'}
                            className={m.role === 'host' ? 'bg-emerald-600' : ''}
                          >
                            {m.role === 'host' ? 'Host' : 'Guest'}
                          </Badge>
                        </div>
                        <p className="mt-0.5 font-mono text-xs tracking-wider text-muted-foreground">
                          {m.roomId.slice(0, 3)}-{m.roomId.slice(3, 6)}-{m.roomId.slice(6)} ·{' '}
                          {formatDateTime(m.lastJoinedAt)} · hosted by {m.createdByName}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-lg"
                          onClick={() => copyRoomId(m.roomId)}
                          aria-label={`Copy meeting ID for ${m.title}`}
                        >
                          <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Copy ID
                        </Button>
                        <Button
                          size="sm"
                          className="rounded-lg font-semibold shadow-sm transition-all hover:shadow-md"
                          onClick={() => void joinByRoomId(m.roomId)}
                        >
                          Rejoin
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </main>
  )
}

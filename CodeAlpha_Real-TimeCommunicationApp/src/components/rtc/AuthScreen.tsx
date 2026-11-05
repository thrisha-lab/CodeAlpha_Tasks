'use client'

import { useState } from 'react'
import { Video, Loader2, ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { apiPost } from '@/lib/rtc/api-client'
import { useAppStore } from '@/store/useAppStore'
import { useMeeting } from '@/hooks/useMeeting'
import type { User } from '@/lib/rtc/types'

export function AuthScreen() {
  const setUser = useAppStore((s) => s.setUser)
  const setView = useAppStore((s) => s.setView)
  const { refreshHistory } = useMeeting()

  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const afterAuth = (user: User) => {
    setUser(user)
    setView('lobby')
    void refreshHistory()
  }

  // login fields
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  // register fields
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const { user } = await apiPost<{ user: User }>('/api/auth/login', { identifier, password })
      afterAuth(user)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function submitRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const { user } = await apiPost<{ user: User }>('/api/auth/register', {
        name,
        username,
        email,
        password: regPassword,
      })
      afterAuth(user)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-gradient-to-b from-emerald-50/70 via-background to-background px-4 py-10 sm:py-14">
      <div className="w-full max-w-md space-y-7">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-emerald-600/20">
            <Video className="h-8 w-8" aria-hidden />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">CodeAlpha Connect</h1>
            <p className="text-sm leading-5 text-muted-foreground">
              Real-time video meetings, chat, files &amp; whiteboard
            </p>
          </div>
        </div>

        <Card className="rounded-2xl border-border shadow-pop">
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'login' | 'register')}>
            <CardHeader className="px-6 pt-6">
              <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl bg-secondary p-1">
                <TabsTrigger
                  value="login"
                  className="rounded-lg text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm"
                >
                  Sign in
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="rounded-lg text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm"
                >
                  Create account
                </TabsTrigger>
              </TabsList>
              <CardDescription className="sr-only">
                {tab === 'login' ? 'Sign in to your account' : 'Create a new account'}
              </CardDescription>
              <CardTitle className="sr-only">Authentication</CardTitle>
            </CardHeader>

            <CardContent className="px-6 pb-8">
              {error && (
                <Alert variant="destructive" className="mb-5 rounded-xl">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <TabsContent value="login">
                <form onSubmit={submitLogin} className="space-y-5" aria-label="Sign in form">
                  <div className="space-y-2">
                    <Label htmlFor="identifier" className="text-sm font-medium">
                      Email or username
                    </Label>
                    <Input
                      id="identifier"
                      autoComplete="username"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="you@example.com"
                      className="h-11 rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-11 rounded-lg"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="h-11 w-full rounded-lg text-sm font-semibold shadow-sm transition-all hover:shadow-md"
                    disabled={busy}
                  >
                    {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                    Sign in
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={submitRegister} className="space-y-5" aria-label="Registration form">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">
                      Full name
                    </Label>
                    <Input
                      id="name"
                      required
                      minLength={2}
                      maxLength={50}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ada Lovelace"
                      className="h-11 rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-medium">
                      Username
                    </Label>
                    <Input
                      id="username"
                      required
                      minLength={3}
                      maxLength={20}
                      pattern="[A-Za-z0-9_]+"
                      title="3–20 characters, letters, numbers and underscore"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="ada_l"
                      className="h-11 rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="h-11 rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password" className="text-sm font-medium">
                      Password
                    </Label>
                    <Input
                      id="reg-password"
                      type="password"
                      required
                      minLength={8}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="At least 8 characters, letter + digit"
                      className="h-11 rounded-lg"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="h-11 w-full rounded-lg text-sm font-semibold shadow-sm transition-all hover:shadow-md"
                    disabled={busy}
                  >
                    {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                    Create account
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary/70" aria-hidden />
          Passwords are bcrypt-hashed · sessions use signed JWT httpOnly cookies
        </p>
      </div>
    </main>
  )
}

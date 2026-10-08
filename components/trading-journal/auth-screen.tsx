"use client"

import { useState, type FormEvent } from "react"
import { ArrowRight, BookOpen, Loader2, LockKeyhole, Mail, Sparkles, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getSupabase } from "@/lib/supabase/client"

type Mode = "login" | "signup" | "forgot" | "recovery"

const COPY: Record<Mode, { eyebrow: string; title: string; description: string; cta: string }> = {
  login: {
    eyebrow: "Bienvenida de vuelta",
    title: "Abre tu bitácora",
    description: "Entra para seguir registrando, revisando y aprendiendo de cada trade.",
    cta: "Entrar a mi bitácora",
  },
  signup: {
    eyebrow: "Empecemos",
    title: "Crea tu bitácora",
    description: "Una cuenta para guardar tus trades y capturas, disponibles en cualquier dispositivo.",
    cta: "Crear mi cuenta",
  },
  forgot: {
    eyebrow: "Sin prisa",
    title: "Recupera tu acceso",
    description: "Escribe tu correo y te enviaremos un enlace para elegir una nueva contraseña.",
    cta: "Enviar enlace",
  },
  recovery: {
    eyebrow: "Casi listo",
    title: "Elige una nueva contraseña",
    description: "Que sea fácil de recordar para ti y difícil de adivinar para los demás.",
    cta: "Guardar contraseña",
  },
}

function translateError(message: string): string {
  const text = message.toLowerCase()
  if (text.includes("invalid login credentials")) return "El correo o la contraseña no coinciden. Revisa e inténtalo de nuevo."
  if (text.includes("email not confirmed")) return "Aún falta confirmar tu correo. Revisa tu bandeja de entrada."
  if (text.includes("already registered") || text.includes("already been registered")) return "Ya existe una cuenta con este correo. Prueba a iniciar sesión."
  if (text.includes("password should be at least")) return "La contraseña debe tener al menos 8 caracteres."
  if (text.includes("rate limit") || text.includes("too many")) return "Demasiados intentos seguidos. Espera un momento e inténtalo otra vez."
  if (text.includes("same password")) return "Elige una contraseña distinta a la anterior."
  if (text.includes("fetch") || text.includes("network")) return "No pudimos conectarnos. Revisa tu conexión a internet."
  return message
}

export function AuthScreen({ initialMode = "login", onRecovered }: { initialMode?: Mode; onRecovered?: () => void }) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")

  const copy = COPY[mode]

  function switchMode(next: Mode) {
    setMode(next)
    setError("")
    setInfo("")
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setInfo("")

    if (mode !== "recovery" && !email.trim()) return setError("Escribe tu correo electrónico.")
    if ((mode === "signup" || mode === "recovery") && password.length < 8) {
      return setError("La contraseña debe tener al menos 8 caracteres.")
    }
    if (mode === "login" && !password) return setError("Escribe tu contraseña.")

    setIsBusy(true)
    try {
      const supabase = getSupabase()

      if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (authError) throw authError
      } else if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: name.trim() ? { nombre: name.trim().slice(0, 40) } : undefined,
            emailRedirectTo: window.location.origin,
          },
        })
        if (authError) throw authError
        if (!data.session) {
          setInfo("¡Cuenta creada! Te enviamos un correo para confirmarla. Ábrelo y vuelve aquí para entrar.")
          setMode("login")
          setPassword("")
        }
      } else if (mode === "forgot") {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        })
        if (authError) throw authError
        setInfo("Si ese correo tiene una cuenta, te llegará un enlace en unos minutos.")
      } else {
        const { error: authError } = await supabase.auth.updateUser({ password })
        if (authError) throw authError
        onRecovered?.()
      }
    } catch (caught) {
      setError(translateError(caught instanceof Error ? caught.message : "Algo salió mal. Inténtalo de nuevo."))
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen bg-background text-foreground lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 size-80 rounded-full bg-primary-foreground/10" aria-hidden="true" />
        <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-amber/25" aria-hidden="true" />
        <div className="relative flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-primary-foreground/15">
            <BookOpen aria-hidden="true" />
          </span>
          <div>
            <p className="font-display text-2xl leading-none">bitácora</p>
            <p className="mt-1 text-xs tracking-wide text-primary-foreground/75">de trading</p>
          </div>
        </div>
        <div className="relative max-w-md">
          <Sparkles aria-hidden="true" className="mb-5 size-6 text-amber" />
          <blockquote className="font-display text-3xl leading-snug">
            “La disciplina es repetir lo correcto, incluso cuando nadie está mirando.”
          </blockquote>
          <p className="mt-5 text-sm leading-relaxed text-primary-foreground/80">
            Registra por qué entras, cómo te sientes y qué aprendes. Tu mejor ventaja es conocerte.
          </p>
        </div>
        <p className="relative text-xs text-primary-foreground/70">Tus trades y capturas son privados: solo tú puedes verlos.</p>
      </aside>

      <main className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
              <BookOpen aria-hidden="true" className="size-5" />
            </span>
            <span className="font-display text-2xl">bitácora</span>
          </div>

          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">{copy.eyebrow}</p>
          <h1 className="font-display text-3xl leading-tight sm:text-4xl">{copy.title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">{copy.description}</p>

          <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4 rounded-3xl border border-border/70 bg-card p-5 shadow-[0_18px_45px_-28px_rgba(74,51,40,0.35)] sm:p-6" noValidate>
            {mode === "signup" ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="auth-name">¿Cómo te llamas? <span className="font-normal text-muted-foreground">(opcional)</span></Label>
                <div className="relative">
                  <User aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="auth-name" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" className="h-11 rounded-xl pl-9" />
                </div>
              </div>
            ) : null}

            {mode !== "recovery" ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="auth-email">Correo electrónico</Label>
                <div className="relative">
                  <Mail aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="auth-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" className="h-11 rounded-xl pl-9" />
                </div>
              </div>
            ) : null}

            {mode !== "forgot" ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auth-password">{mode === "recovery" ? "Nueva contraseña" : "Contraseña"}</Label>
                  {mode === "login" ? (
                    <button type="button" onClick={() => switchMode("forgot")} className="text-xs text-primary underline-offset-4 hover:underline">¿Olvidaste tu contraseña?</button>
                  ) : null}
                </div>
                <div className="relative">
                  <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="auth-password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "login" ? "Tu contraseña" : "Mínimo 8 caracteres"} className="h-11 rounded-xl pl-9" />
                </div>
              </div>
            ) : null}

            {error ? <p role="alert" className="rounded-xl border border-loss/20 bg-loss/5 px-3.5 py-2.5 text-sm text-loss">{error}</p> : null}
            {info ? <p role="status" className="rounded-xl border border-gain/25 bg-gain/10 px-3.5 py-2.5 text-sm text-foreground">{info}</p> : null}

            <Button type="submit" disabled={isBusy} className="mt-1 h-11 rounded-xl text-sm">
              {isBusy ? <Loader2 data-icon="inline-start" aria-hidden="true" className="animate-spin" /> : null}
              {isBusy ? "Un momento…" : copy.cta}
              {!isBusy ? <ArrowRight data-icon="inline-end" aria-hidden="true" /> : null}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>¿Primera vez por aquí? <button type="button" onClick={() => switchMode("signup")} className="font-medium text-primary underline-offset-4 hover:underline">Crea tu cuenta</button></>
            ) : mode === "signup" || mode === "forgot" ? (
              <>¿Ya tienes cuenta? <button type="button" onClick={() => switchMode("login")} className="font-medium text-primary underline-offset-4 hover:underline">Inicia sesión</button></>
            ) : null}
          </p>
        </div>
      </main>
    </div>
  )
}

export function SetupNeededScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-5 py-10 text-foreground">
      <div className="w-full max-w-lg rounded-3xl border border-border/70 bg-card p-6 shadow-sm sm:p-8">
        <span className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground"><BookOpen aria-hidden="true" /></span>
        <h1 className="mt-5 font-display text-3xl leading-tight">Falta conectar Supabase</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Para activar el inicio de sesión y guardar tus trades en la nube, añade estas dos variables de entorno y vuelve a iniciar la app:
        </p>
        <pre className="mt-4 overflow-x-auto rounded-2xl bg-muted p-4 text-xs leading-relaxed">{`NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_ANON_PUBLIC_KEY`}</pre>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          En local van en un archivo <code className="rounded bg-muted px-1.5 py-0.5 text-xs">.env.local</code>; en Vercel, en <em>Settings → Environment Variables</em>. Los pasos completos están en el README.
        </p>
      </div>
    </div>
  )
}

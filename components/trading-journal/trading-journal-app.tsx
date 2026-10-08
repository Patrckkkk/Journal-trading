"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { BookOpen, Loader2, LogOut, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { JournalNavigation, MobileBackupActions, type JournalView, type PrimaryView } from "@/components/trading-journal/navigation"
import { DashboardView } from "@/components/trading-journal/dashboard-view"
import { TradeForm, type TradeFormValues } from "@/components/trading-journal/trade-form"
import { TradesView } from "@/components/trading-journal/trades-view"
import { TradeDetailView } from "@/components/trading-journal/trade-detail-view"
import { StatsView } from "@/components/trading-journal/stats-view"
import { AuthScreen, SetupNeededScreen } from "@/components/trading-journal/auth-screen"
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client"
import {
  deleteTradeRemote,
  fetchTrades,
  imageUrlToDataUrl,
  saveManyTradesRemote,
  saveTradeRemote,
} from "@/lib/trades-db"
import {
  createSampleTrades,
  createTradeId,
  parseTradeBackup,
  STORAGE_KEY,
  type Trade,
} from "@/lib/trading-journal"

type Notice = { text: string; tone: "success" | "error" }
type Theme = "light" | "dark"

const dailyNotes = [
  "El mejor trade es el que sigue tu plan, no el que persigue el ruido.",
  "La paciencia también es una posición. Espera a que tu ventaja aparezca.",
  "Cuida tu proceso y deja que los resultados se ocupen de sí mismos.",
  "La disciplina es repetir lo correcto, incluso cuando nadie está mirando.",
  "Cada cierre es información. Cada revisión, una oportunidad para mejorar.",
]

const samplesFlag = (userId: string) => `bitacora-sin-ejemplos-${userId}`
const legacyFlag = (userId: string) => `bitacora-local-revisado-${userId}`

function sortByDate(trades: Trade[]): Trade[] {
  return [...trades].sort((a, b) => b.date.localeCompare(a.date))
}

/* ------------------------------------------------------------------ */
/*  Puerta de acceso: decide entre login, configuración o la bitácora  */
/* ------------------------------------------------------------------ */
export function TradingJournalApp() {
  const [session, setSession] = useState<Session | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isRecovering, setIsRecovering] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsReady(true)
      return
    }
    const supabase = getSupabase()
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setIsReady(true)
    })

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      if (event === "PASSWORD_RECOVERY") setIsRecovering(true)
      if (event === "SIGNED_OUT") setIsRecovering(false)
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  if (!isSupabaseConfigured) return <SetupNeededScreen />

  if (!isReady) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        <span className="flex items-center gap-2"><Loader2 aria-hidden="true" className="size-4 animate-spin" /> Abriendo tu bitácora…</span>
      </div>
    )
  }

  if (!session) return <AuthScreen />
  if (isRecovering) return <AuthScreen initialMode="recovery" onRecovered={() => setIsRecovering(false)} />

  return (
    <JournalWorkspace
      key={session.user.id}
      user={session.user}
      onSignOut={() => void getSupabase().auth.signOut()}
    />
  )
}

/* ------------------------------------------------------------------ */
/*  La bitácora (ya con sesión iniciada)                               */
/* ------------------------------------------------------------------ */
function JournalWorkspace({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const [remoteTrades, setRemoteTrades] = useState<Trade[]>([])
  const [samples, setSamples] = useState<Trade[]>([])
  const [legacyTrades, setLegacyTrades] = useState<Trade[]>([])
  const [activeView, setActiveView] = useState<JournalView>("dashboard")
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null)
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isWorking, setIsWorking] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [theme, setTheme] = useState<Theme>("light")
  const [quoteIndex, setQuoteIndex] = useState(0)
  const importInputRef = useRef<HTMLInputElement>(null)

  const trades = useMemo(() => sortByDate([...remoteTrades, ...samples]), [remoteTrades, samples])
  const userName = typeof user.user_metadata?.nombre === "string" ? user.user_metadata.nombre : ""

  useEffect(() => {
    setQuoteIndex(Math.floor(Math.random() * dailyNotes.length))
  }, [])

  useEffect(() => {
    let active = true
    setIsLoaded(false)
    setLoadError("")

    fetchTrades()
      .then((loaded) => {
        if (!active) return
        setRemoteTrades(loaded)

        const dismissed =
          window.localStorage.getItem(samplesFlag(user.id)) === "1" || user.user_metadata?.sin_ejemplos === true
        setSamples(loaded.length === 0 && !dismissed ? createSampleTrades() : [])

        try {
          const stored = window.localStorage.getItem(STORAGE_KEY)
          if (stored && window.localStorage.getItem(legacyFlag(user.id)) !== "1") {
            setLegacyTrades(parseTradeBackup(JSON.parse(stored)).filter((trade) => !trade.isSample))
          }
        } catch {
          /* el respaldo local antiguo no se pudo leer: se ignora */
        }
      })
      .catch((error) => {
        if (!active) return
        setLoadError(error instanceof Error ? error.message : "No pudimos cargar tu bitácora.")
      })
      .finally(() => {
        if (active) setIsLoaded(true)
      })

    return () => {
      active = false
    }
  }, [user.id, loadAttempt])

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", theme === "dark")
    root.classList.toggle("light", theme === "light")
    root.style.colorScheme = theme
  }, [theme])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [activeView])

  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(null), 6_000)
    return () => window.clearTimeout(timeout)
  }, [notice])

  const selectedTrade = trades.find((trade) => trade.id === selectedTradeId) ?? null
  const hasSamples = samples.length > 0

  function notify(text: string, tone: Notice["tone"] = "success") {
    setNotice({ text, tone })
  }

  function navigate(view: PrimaryView) {
    setEditingTrade(null)
    setActiveView(view)
  }

  function openTrade(trade: Trade) {
    setSelectedTradeId(trade.id)
    setEditingTrade(null)
    setActiveView("detail")
  }

  function startEditing(trade: Trade) {
    setSelectedTradeId(trade.id)
    setEditingTrade(trade)
    setActiveView("new")
  }

  function cancelForm() {
    setActiveView(editingTrade ? "detail" : "dashboard")
    setEditingTrade(null)
  }

  async function saveTrade(values: TradeFormValues) {
    if (isSaving) return
    setIsSaving(true)
    try {
      const existing = editingTrade
      const isRemoteEdit = Boolean(existing && !existing.isSample)
      const draft: Trade = {
        ...values,
        id: isRemoteEdit && existing ? existing.id : createTradeId(),
        isSample: false,
      }
      const saved = await saveTradeRemote(user.id, draft, isRemoteEdit ? existing?.imagePath : undefined)

      setRemoteTrades((current) =>
        isRemoteEdit ? current.map((trade) => (trade.id === saved.id ? saved : trade)) : [saved, ...current],
      )
      if (existing?.isSample) setSamples((current) => current.filter((trade) => trade.id !== existing.id))

      setSelectedTradeId(saved.id)
      setEditingTrade(null)
      setActiveView("detail")
      notify(isRemoteEdit ? "Los cambios del trade quedaron guardados." : "Trade guardado en tu bitácora.")
    } catch (error) {
      notify(error instanceof Error ? error.message : "No pudimos guardar el trade. Inténtalo de nuevo.", "error")
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteTrade(trade: Trade) {
    const confirmed = window.confirm(`¿Eliminar el trade de ${trade.asset}? Esta acción no se puede deshacer.`)
    if (!confirmed) return
    try {
      if (trade.isSample) {
        setSamples((current) => current.filter((item) => item.id !== trade.id))
        if (samples.length <= 1) rememberSamplesDismissed()
      } else {
        setIsWorking(true)
        await deleteTradeRemote(trade)
        setRemoteTrades((current) => current.filter((item) => item.id !== trade.id))
      }
      setSelectedTradeId(null)
      setActiveView("trades")
      notify("Trade eliminado de tu historial.")
    } catch (error) {
      notify(error instanceof Error ? error.message : "No pudimos eliminar el trade.", "error")
    } finally {
      setIsWorking(false)
    }
  }

  function rememberSamplesDismissed() {
    window.localStorage.setItem(samplesFlag(user.id), "1")
    // También se guarda en la cuenta, para que no vuelvan en otro navegador o dispositivo.
    void getSupabase().auth.updateUser({ data: { sin_ejemplos: true } })
  }

  function clearSamples() {
    if (!samples.length) return
    const count = samples.length
    setSamples([])
    rememberSamplesDismissed()
    notify(count === 1 ? "Se quitó el trade de ejemplo." : `Se quitaron ${count} trades de ejemplo.`)
  }

  async function exportBackup() {
    setIsWorking(true)
    notify("Preparando tu respaldo con las capturas…")
    try {
      const portable = await Promise.all(
        remoteTrades.map(async (trade) => {
          const { imagePath: _imagePath, ...rest } = trade
          if (trade.image && !trade.image.startsWith("data:")) {
            return { ...rest, image: await imageUrlToDataUrl(trade.image) }
          }
          return rest
        }),
      )
      const backup = { version: 2, exportedAt: new Date().toISOString(), trades: portable }
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `bitacora-trading-${new Date().toISOString().slice(0, 10)}.json`
      document.body.append(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
      notify("Respaldo JSON listo para descargar.")
    } catch {
      notify("No pudimos preparar el respaldo. Inténtalo de nuevo.", "error")
    } finally {
      setIsWorking(false)
    }
  }

  async function importBackup(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    try {
      if (file.size > 30 * 1024 * 1024) throw new Error("El respaldo supera el límite de 30 MB.")
      const parsed = parseTradeBackup(JSON.parse(await file.text()))
      if (!parsed.length) throw new Error("El respaldo no contiene operaciones.")
      if (!window.confirm(`Se añadirán ${parsed.length} ${parsed.length === 1 ? "trade" : "trades"} a tu cuenta. Los que ya tienes se conservan. ¿Continuar?`)) return

      setIsWorking(true)
      notify("Subiendo tus trades…")
      const saved = await saveManyTradesRemote(user.id, parsed)
      setRemoteTrades((current) => [...saved, ...current])
      setSelectedTradeId(null)
      setEditingTrade(null)
      setActiveView("dashboard")
      notify(`${saved.length} ${saved.length === 1 ? "trade importado" : "trades importados"} correctamente.`)
    } catch (error) {
      notify(error instanceof Error ? error.message : "No pudimos importar este archivo JSON.", "error")
    } finally {
      setIsWorking(false)
      input.value = ""
    }
  }

  async function uploadLegacyTrades() {
    setIsWorking(true)
    try {
      const saved = await saveManyTradesRemote(user.id, legacyTrades)
      setRemoteTrades((current) => [...saved, ...current])
      window.localStorage.setItem(legacyFlag(user.id), "1")
      setLegacyTrades([])
      notify(`Listo: ${saved.length} ${saved.length === 1 ? "trade subido" : "trades subidos"} a tu cuenta.`)
    } catch (error) {
      notify(error instanceof Error ? error.message : "No pudimos subir tus trades.", "error")
    } finally {
      setIsWorking(false)
    }
  }

  function dismissLegacyTrades() {
    window.localStorage.setItem(legacyFlag(user.id), "1")
    setLegacyTrades([])
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <JournalNavigation
        activeView={activeView}
        hasSamples={hasSamples}
        userEmail={user.email ?? ""}
        onNavigate={navigate}
        onExport={exportBackup}
        onImport={() => importInputRef.current?.click()}
        onClearSamples={clearSamples}
        onSignOut={onSignOut}
      />
      <main className="min-h-screen px-4 pb-28 pt-5 sm:px-6 sm:pt-7 md:ml-[236px] md:px-7 md:pb-10 lg:px-9">
        <div className="mx-auto max-w-7xl">
          <header className="mb-7 flex min-h-10 items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 md:hidden">
              <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><BookOpen aria-hidden="true" className="size-4" /></span>
              <span className="font-display text-xl text-foreground">bitácora</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <MobileBackupActions onExport={exportBackup} onImport={() => importInputRef.current?.click()} />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setTheme((current) => current === "light" ? "dark" : "light")}
                aria-label={theme === "light" ? "Activar modo oscuro" : "Activar modo claro"}
                title={theme === "light" ? "Modo oscuro" : "Modo claro"}
                className="size-10 rounded-xl border-border/70 bg-card"
              >
                {theme === "light" ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onSignOut}
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
                className="size-10 rounded-xl border-border/70 bg-card md:hidden"
              >
                <LogOut aria-hidden="true" />
              </Button>
            </div>
          </header>

          <input ref={importInputRef} type="file" accept="application/json,.json" aria-label="Importar respaldo JSON" className="sr-only" onChange={importBackup} />

          {loadError ? (
            <div role="alert" className="mb-5 flex flex-col gap-3 rounded-2xl border border-loss/20 bg-loss/5 px-4 py-3 text-sm leading-relaxed text-loss sm:flex-row sm:items-center sm:justify-between">
              <span>{loadError}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => setLoadAttempt((n) => n + 1)} className="rounded-xl">Reintentar</Button>
            </div>
          ) : null}

          {legacyTrades.length ? (
            <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-amber/40 bg-amber/10 px-4 py-3.5 text-sm leading-relaxed sm:flex-row sm:items-center sm:justify-between">
              <span>
                Encontramos <strong>{legacyTrades.length} {legacyTrades.length === 1 ? "trade guardado" : "trades guardados"}</strong> en este navegador de cuando tu bitácora era local. ¿Los subimos a tu cuenta?
              </span>
              <span className="flex shrink-0 gap-2">
                <Button type="button" size="sm" onClick={uploadLegacyTrades} disabled={isWorking} className="rounded-xl">
                  {isWorking ? <Loader2 data-icon="inline-start" aria-hidden="true" className="animate-spin" /> : null}
                  Subir a mi cuenta
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={dismissLegacyTrades} disabled={isWorking} className="rounded-xl">Ahora no</Button>
              </span>
            </div>
          ) : null}

          {notice ? (
            <div role={notice.tone === "error" ? "alert" : "status"} aria-live="polite" className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${notice.tone === "error" ? "border-loss/20 bg-loss/5 text-loss" : "border-gain/20 bg-gain/5 text-foreground"}`}>
              {notice.text}
            </div>
          ) : null}

          {!isLoaded ? (
            <div className="flex items-center justify-center gap-2 rounded-3xl border border-border/70 bg-card px-5 py-12 text-center text-sm text-muted-foreground">
              <Loader2 aria-hidden="true" className="size-4 animate-spin" /> Preparando tu bitácora…
            </div>
          ) : activeView === "dashboard" ? (
            <DashboardView trades={trades} userName={userName} quote={dailyNotes[quoteIndex]} onNewTrade={() => navigate("new")} onOpenTrade={openTrade} onViewAll={() => navigate("trades")} />
          ) : activeView === "new" ? (
            <TradeForm key={editingTrade?.id ?? "new-trade"} initialTrade={editingTrade} isSaving={isSaving} onSave={saveTrade} onCancel={cancelForm} />
          ) : activeView === "trades" ? (
            <TradesView trades={trades} onOpenTrade={openTrade} onNewTrade={() => navigate("new")} />
          ) : activeView === "stats" ? (
            <StatsView trades={trades} onNewTrade={() => navigate("new")} />
          ) : selectedTrade ? (
            <TradeDetailView trade={selectedTrade} onBack={() => navigate("trades")} onEdit={startEditing} onDelete={deleteTrade} />
          ) : (
            <DashboardView trades={trades} userName={userName} quote={dailyNotes[quoteIndex]} onNewTrade={() => navigate("new")} onOpenTrade={openTrade} onViewAll={() => navigate("trades")} />
          )}
        </div>
      </main>
    </div>
  )
}

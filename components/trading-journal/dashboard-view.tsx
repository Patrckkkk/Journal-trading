import { ArrowRight, BookOpen, CircleDollarSign, Crosshair, Medal, Plus, Sparkles, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  formatResult,
  formatTotalSummary,
  getPrimaryUnit,
  type Trade,
} from "@/lib/trading-journal"
import { MetricCard, SectionTitle, TradeCard } from "@/components/trading-journal/shared"

type DashboardViewProps = {
  trades: Trade[]
  quote: string
  userName?: string
  onNewTrade: () => void
  onOpenTrade: (trade: Trade) => void
  onViewAll: () => void
}

export function DashboardView({ trades, quote, userName, onNewTrade, onOpenTrade, onViewAll }: DashboardViewProps) {
  const winCount = trades.filter((trade) => trade.status === "win").length
  const lossCount = trades.filter((trade) => trade.status === "loss").length
  const resolvedCount = winCount + lossCount
  const winRate = resolvedCount ? `${Math.round((winCount / resolvedCount) * 100)}%` : "—"
  const primaryUnit = getPrimaryUnit(trades)
  const comparableTrades = trades.filter((trade) => trade.unit === primaryUnit)
  const bestTrade = comparableTrades.reduce<Trade | null>(
    (best, trade) => (!best || trade.result > best.result ? trade : best),
    null,
  )
  const worstTrade = comparableTrades.reduce<Trade | null>(
    (worst, trade) => (!worst || trade.result < worst.result ? trade : worst),
    null,
  )
  const recentTrades = [...trades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5)

  return (
    <div className="animate-in fade-in duration-300">
      <header className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">TU CUADERNO PERSONAL</p>
          <h1 className="font-display text-4xl leading-tight text-foreground sm:text-5xl">Hola, {userName || "trader"}.</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Un espacio tranquilo para registrar, revisar y aprender de cada decisión.
          </p>
        </div>
        <Button onClick={onNewTrade} size="lg" className="h-12 w-full rounded-2xl px-5 shadow-[0_8px_18px_rgba(200,101,74,0.2)] sm:w-auto">
          <Plus data-icon="inline-start" aria-hidden="true" />
          Nuevo trade
        </Button>
      </header>

      <section aria-label="Recordatorio de disciplina" className="relative mb-7 overflow-hidden rounded-[1.75rem] bg-primary px-5 py-6 text-primary-foreground shadow-[0_16px_36px_rgba(200,101,74,0.18)] sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-12 -top-16 size-48 rounded-full border border-primary-foreground/10" />
        <div className="pointer-events-none absolute -right-2 -top-10 size-32 rounded-full border border-primary-foreground/10" />
        <div className="relative flex items-start gap-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary-foreground/15">
            <Sparkles aria-hidden="true" className="size-5" />
          </span>
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground/75">Una nota para hoy</p>
            <blockquote className="mt-2 font-display text-xl leading-snug sm:text-2xl">“{quote}”</blockquote>
            <p className="mt-3 text-xs text-primary-foreground/75">Confía en tu proceso. El mercado no tiene prisa.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="journal-overview-title" className="mb-8">
        <SectionTitle title="Tu proceso, en perspectiva" detail="Pequeñas observaciones que construyen consistencia." />
        <h2 id="journal-overview-title" className="sr-only">Resumen de estadísticas</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
          <MetricCard label="Total de trades" value={String(trades.length)} hint="operaciones registradas" icon={BookOpen} tone="accent" />
          <MetricCard label="Win rate" value={winRate} hint={`${winCount} ganados · ${lossCount} perdidos`} icon={Target} tone="positive" />
          <MetricCard label="Resultado neto" value={formatTotalSummary(trades)} hint="suma de tus resultados" icon={CircleDollarSign} tone="accent" />
          <MetricCard label="Mejor trade" value={bestTrade ? formatResult(bestTrade.result, bestTrade.unit) : "—"} hint={bestTrade ? `${bestTrade.asset} · ${bestTrade.unit}` : "aún por descubrir"} icon={Medal} tone="positive" />
          <MetricCard label="Trade a revisar" value={worstTrade ? formatResult(worstTrade.result, worstTrade.unit) : "—"} hint={worstTrade ? `${worstTrade.asset} · ${worstTrade.unit}` : "cada operación enseña"} icon={Crosshair} tone={worstTrade?.result !== undefined && worstTrade.result < 0 ? "negative" : "neutral"} />
        </div>
      </section>

      <section aria-labelledby="recent-trades-title">
        <SectionTitle
          title="Últimos movimientos"
          detail={recentTrades.length ? "Tus cinco operaciones más recientes." : "Tu cuaderno empieza con una decisión."}
          action={trades.length ? (
            <Button type="button" variant="ghost" onClick={onViewAll} className="rounded-xl text-primary">
              Ver todos <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Button>
          ) : null}
        />
        <h2 id="recent-trades-title" className="sr-only">Últimos trades</h2>
        {recentTrades.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {recentTrades.map((trade) => <TradeCard key={trade.id} trade={trade} onOpen={onOpenTrade} />)}
          </div>
        ) : (
          <Card className="rounded-[1.5rem] border-dashed border-border bg-card/70 shadow-none">
            <CardContent className="flex flex-col items-center px-5 py-10 text-center sm:py-14">
              <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-secondary text-primary">
                <BookOpen aria-hidden="true" className="size-6" />
              </span>
              <h3 className="font-display text-2xl text-foreground">Una página en blanco</h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Registra tu primera operación y empieza a convertir cada experiencia en aprendizaje.
              </p>
              <Button onClick={onNewTrade} className="mt-5 rounded-xl">
                <Plus data-icon="inline-start" aria-hidden="true" />
                Registrar mi primer trade
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      <Card className="mt-6 rounded-2xl border-border/70 bg-secondary/55 shadow-none">
        <CardContent className="flex items-start gap-3 p-4 sm:items-center sm:px-5">
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-background/70 text-amber sm:mt-0">
            <Sparkles aria-hidden="true" className="size-4" />
          </span>
          <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Una buena bitácora no mide cuánto operas: te ayuda a entender por qué lo haces.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

  

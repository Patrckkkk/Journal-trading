import type { ReactNode } from "react"
import { ArrowUpRight, ChartNoAxesCombined, type LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  formatResult,
  formatTradeDate,
  getSideLabel,
  getStatusLabel,
  type Trade,
  type TradeSide,
  type TradeStatus,
} from "@/lib/trading-journal"

type PageHeadingProps = {
  eyebrow: string
  title: ReactNode
  description: string
  actions?: ReactNode
}

export function PageHeading({ eyebrow, title, description, actions }: PageHeadingProps) {
  return (
    <header className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          {eyebrow}
        </p>
        <h1 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </p>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
}: {
  label: string
  value: string
  hint: string
  icon: LucideIcon
  tone?: "neutral" | "positive" | "negative" | "accent"
}) {
  const toneClass =
    tone === "positive"
      ? "text-gain"
      : tone === "negative"
        ? "text-loss"
        : tone === "accent"
          ? "text-primary"
          : "text-foreground"

  return (
    <Card className="h-full rounded-2xl border-border/70 bg-card shadow-[0_8px_24px_rgba(74,51,40,0.045)]">
      <CardContent className="flex h-full min-h-32 flex-col justify-between gap-4 p-4 sm:min-h-36 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
            <Icon aria-hidden="true" className="size-4" />
          </span>
        </div>
        <div className="min-w-0">
          <p className={`break-words font-display text-xl leading-tight tabular-nums sm:text-2xl ${toneClass}`}>
            {value}
          </p>
          <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground sm:text-xs">{hint}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export function DirectionBadge({ side }: { side: TradeSide }) {
  const isLong = side === "long"
  return (
    <Badge
      variant="outline"
      className={
        isLong
          ? "rounded-full border-gain/25 bg-gain/10 px-2.5 py-1 text-gain"
          : "rounded-full border-terracotta/25 bg-terracotta/10 px-2.5 py-1 text-terracotta"
      }
    >
      {getSideLabel(side)} · {isLong ? "Long" : "Short"}
    </Badge>
  )
}

export function StatusBadge({ status }: { status: TradeStatus }) {
  const className =
    status === "win"
      ? "border-gain/25 bg-gain/10 text-gain"
      : status === "loss"
        ? "border-loss/25 bg-loss/10 text-loss"
        : "border-amber/30 bg-amber/10 text-amber-foreground"

  return (
    <Badge variant="outline" className={`rounded-full px-2.5 py-1 ${className}`}>
      {getStatusLabel(status)}
    </Badge>
  )
}

export function TradeCard({ trade, onOpen }: { trade: Trade; onOpen: (trade: Trade) => void }) {
  const resultTone =
    trade.status === "win" ? "text-gain" : trade.status === "loss" ? "text-loss" : "text-foreground"

  return (
    <Card className="group h-full overflow-hidden rounded-[1.5rem] border-border/70 bg-card p-0 shadow-[0_8px_24px_rgba(74,51,40,0.045)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(74,51,40,0.11)]">
      <button
        type="button"
        onClick={() => onOpen(trade)}
        aria-label={`Abrir detalle de ${trade.asset}, ${formatResult(trade.result, trade.unit)}`}
        className="block w-full cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <div className="relative aspect-[16/8.5] overflow-hidden bg-muted">
          {trade.image ? (
            <img
              src={trade.image}
              alt={`Gráfico de la operación ${getSideLabel(trade.side)} en ${trade.asset}`}
              loading="lazy"
              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.025]"
            />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-2 bg-[radial-gradient(ellipse_at_top,_var(--color-secondary),_transparent_72%)] text-muted-foreground">
              <ChartNoAxesCombined aria-hidden="true" className="size-7 text-primary/70" />
              <span className="text-xs">Sin captura adjunta</span>
            </div>
          )}
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <StatusBadge status={trade.status} />
            {trade.isSample ? (
              <Badge variant="secondary" className="rounded-full bg-background/90 px-2.5 py-1 text-foreground backdrop-blur">
                Ejemplo
              </Badge>
            ) : null}
          </div>
        </div>
        <CardContent className="flex flex-col gap-3 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-display text-xl font-semibold text-foreground">{trade.asset}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatTradeDate(trade.date, true)}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className={`font-display text-lg font-semibold tabular-nums ${resultTone}`}>
                {formatResult(trade.result, trade.unit)}
              </p>
              <span className="text-[11px] text-muted-foreground">resultado</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
            <DirectionBadge side={trade.side} />
            {trade.tags.length ? (
              <span className="max-w-[55%] truncate text-xs text-muted-foreground">
                {trade.tags.slice(0, 2).map((tag) => `#${tag}`).join("  ")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                Ver detalle <ArrowUpRight aria-hidden="true" className="size-3" />
              </span>
            )}
          </div>
        </CardContent>
      </button>
    </Card>
  )
}

export function SectionTitle({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-2xl text-foreground">{title}</h2>
        {detail ? <p className="mt-1 text-sm text-muted-foreground">{detail}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function formatShortDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" }).format(date)
}


  

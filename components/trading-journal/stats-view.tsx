"use client"

import { useMemo, useState } from "react"
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { Activity, ArrowDownRight, ArrowUpRight, CircleDollarSign, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { formatResult, formatTotalSummary, getAvailableUnits, getPrimaryUnit, sumResults, type ResultUnit, type Trade } from "@/lib/trading-journal"
import { MetricCard, PageHeading, formatShortDate } from "@/components/trading-journal/shared"

const equityConfig = {
  equity: { label: "Resultado acumulado", color: "var(--chart-1)" },
} satisfies ChartConfig

const sideConfig = {
  result: { label: "Resultado neto", color: "var(--chart-2)" },
} satisfies ChartConfig

export function StatsView({ trades, onNewTrade }: { trades: Trade[]; onNewTrade: () => void }) {
  const availableUnits = getAvailableUnits(trades)
  const [preferredUnit, setPreferredUnit] = useState<ResultUnit>(() => getPrimaryUnit(trades))
  const unit = availableUnits.includes(preferredUnit) ? preferredUnit : availableUnits[0] ?? "USD"
  const unitTrades = useMemo(
    () => trades.filter((trade) => trade.unit === unit).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [trades, unit],
  )
  const equityCurve = useMemo(() => {
    let runningResult = 0
    const points = unitTrades.map((trade, index) => {
      runningResult += trade.result
      return {
        index: index + 1,
        label: formatShortDate(trade.date),
        equity: Number(runningResult.toFixed(4)),
        date: trade.date,
      }
    })
    if (points.length <= 70) return points
    const stride = Math.ceil(points.length / 70)
    return points.filter((point, index) => index % stride === 0 || index === points.length - 1)
  }, [unitTrades])
  const wins = unitTrades.filter((trade) => trade.status === "win").length
  const losses = unitTrades.filter((trade) => trade.status === "loss").length
  const resolved = wins + losses
  const winRate = resolved ? `${Math.round((wins / resolved) * 100)}%` : "—"
  const longTrades = unitTrades.filter((trade) => trade.side === "long")
  const shortTrades = unitTrades.filter((trade) => trade.side === "short")
  const comparison = [
    { direction: "Compras", result: sumResults(longTrades, unit) },
    { direction: "Ventas", result: sumResults(shortTrades, unit) },
  ]
  const axisFormatter = (value: number) => formatResult(Number(value), unit)

  return (
    <div className="animate-in fade-in duration-300">
      <PageHeading
        eyebrow="REVISIÓN DEL PROCESO"
        title="Estadísticas"
        description="Observa la curva, compara tus decisiones y encuentra patrones con perspectiva."
        actions={trades.length ? null : <Button onClick={onNewTrade} className="rounded-xl">Registrar primer trade</Button>}
      />

      {trades.length ? (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <MetricCard label="Operaciones" value={String(unitTrades.length)} hint={unit === "USD" ? "en dólares" : "en múltiplos R"} icon={Activity} tone="accent" />
            <MetricCard label="Win rate" value={winRate} hint={`${wins} ganados · ${losses} perdidos`} icon={Target} tone="positive" />
            <MetricCard label="Resultado neto" value={formatResult(sumResults(unitTrades, unit), unit)} hint="para esta unidad" icon={CircleDollarSign} tone={sumResults(unitTrades, unit) < 0 ? "negative" : "positive"} />
            <MetricCard label="Compras / ventas" value={`${longTrades.length} / ${shortTrades.length}`} hint="operaciones por dirección" icon={ArrowUpRight} tone="neutral" />
          </div>

          {availableUnits.length > 1 ? (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3">
              <p className="text-sm text-muted-foreground">Elige una unidad para comparar resultados equivalentes.</p>
              <ToggleGroup
                aria-label="Unidad de las estadísticas"
                value={[unit]}
                onValueChange={(values) => values[0] && setPreferredUnit(values[0] as ResultUnit)}
                variant="outline"
                className="rounded-xl bg-muted/60 p-1"
              >
                {availableUnits.map((option) => (
                  <ToggleGroupItem key={option} value={option} className="h-9 rounded-lg border-transparent px-3 data-pressed:border-border data-pressed:bg-background data-pressed:text-foreground">
                    {option === "USD" ? "USD · dólares" : "R · riesgo"}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          ) : null}

          <div className="grid gap-5 xl:grid-cols-2">
            <Card className="rounded-[1.5rem] border-border/70 shadow-[0_8px_24px_rgba(74,51,40,0.045)]">
              <CardHeader>
                <CardTitle className="font-display text-xl">Ganancia acumulada</CardTitle>
                <CardDescription>Resultado neto a medida que registras operaciones.</CardDescription>
                <CardAction>
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">{unit}</span>
                </CardAction>
              </CardHeader>
              <CardContent>
                {equityCurve.length ? (
                  <ChartContainer config={equityConfig} className="h-[280px] min-h-[280px] w-full">
                    <LineChart accessibilityLayer data={equityCurve} margin={{ left: 8, right: 12, top: 12, bottom: 4 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 5" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} minTickGap={24} />
                      <YAxis tickLine={false} axisLine={false} width={66} tickFormatter={axisFormatter} />
                      <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatResult(Number(value), unit)} />} />
                      <Line dataKey="equity" type="monotone" stroke="var(--color-equity)" strokeWidth={2.5} dot={equityCurve.length < 18 ? { r: 3, fill: "var(--color-equity)" } : false} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ChartContainer>
                ) : (
                  <ChartEmpty onNewTrade={onNewTrade} message={`Aún no hay operaciones en ${unit}.`} />
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[1.5rem] border-border/70 shadow-[0_8px_24px_rgba(74,51,40,0.045)]">
              <CardHeader>
                <CardTitle className="font-display text-xl">Compras vs. ventas</CardTitle>
                <CardDescription>Compara el resultado neto por dirección.</CardDescription>
                <CardAction>
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">{unit}</span>
                </CardAction>
              </CardHeader>
              <CardContent>
                {unitTrades.length ? (
                  <ChartContainer config={sideConfig} className="h-[280px] min-h-[280px] w-full">
                    <BarChart accessibilityLayer data={comparison} margin={{ left: 8, right: 12, top: 12, bottom: 4 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 5" />
                      <XAxis dataKey="direction" tickLine={false} axisLine={false} tickMargin={10} />
                      <YAxis tickLine={false} axisLine={false} width={66} tickFormatter={axisFormatter} />
                      <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatResult(Number(value), unit)} />} />
                      <Bar dataKey="result" fill="var(--color-result)" radius={8} maxBarSize={76} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <ChartEmpty onNewTrade={onNewTrade} message={`Aún no hay operaciones en ${unit}.`} />
                )}
                <div className="mt-2 grid grid-cols-2 gap-3 border-t border-border/70 pt-4">
                  <DirectionSummary label="Compra · Long" count={longTrades.length} result={sumResults(longTrades, unit)} unit={unit} tone="gain" />
                  <DirectionSummary label="Venta · Short" count={shortTrades.length} result={sumResults(shortTrades, unit)} unit={unit} tone="loss" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-5 rounded-2xl border-border/70 bg-secondary/45 shadow-none">
            <CardContent className="flex items-start gap-3 p-4 sm:items-center sm:px-5">
              <ArrowDownRight aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary sm:mt-0" />
              <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Los resultados de unidades distintas no se mezclan. Tu resumen general es <span className="font-medium text-foreground">{formatTotalSummary(trades)}</span>.
              </p>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="rounded-[1.5rem] border-dashed border-border bg-card/70 shadow-none">
          <CardContent className="flex flex-col items-center px-5 py-12 text-center">
            <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-secondary text-primary"><Activity aria-hidden="true" className="size-6" /></span>
            <h2 className="font-display text-2xl text-foreground">Tus estadísticas se escriben con el tiempo</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">Añade algunas operaciones para ver tu curva acumulada y comparar compras con ventas.</p>
            <Button onClick={onNewTrade} className="mt-5 rounded-xl">Registrar un trade</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function DirectionSummary({ label, count, result, unit, tone }: { label: string; count: number; result: number; unit: ResultUnit; tone: "gain" | "loss" }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-xs text-muted-foreground">{label} · {count}</p>
      <p className={`mt-1 truncate font-display text-lg font-semibold tabular-nums ${tone === "gain" ? "text-gain" : "text-terracotta"}`}>{formatResult(result, unit)}</p>
    </div>
  )
}

function ChartEmpty({ message, onNewTrade }: { message: string; onNewTrade: () => void }) {
  return (
    <div className="flex h-[280px] flex-col items-center justify-center gap-3 rounded-2xl bg-muted/45 px-5 text-center">
      <Activity aria-hidden="true" className="size-6 text-primary/70" />
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button type="button" size="sm" variant="ghost" onClick={onNewTrade} className="rounded-lg text-primary">Añadir operación</Button>
    </div>
  )
}

  

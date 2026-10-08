"use client"

import { useMemo, useState } from "react"
import { Plus, RotateCcw, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { type Trade, type TradeSide, type TradeStatus } from "@/lib/trading-journal"
import { PageHeading, TradeCard } from "@/components/trading-journal/shared"

type TradeFilters = {
  query: string
  side: "all" | TradeSide
  status: "all" | TradeStatus
  asset: string
  tag: string
}

type FilterSelectProps = {
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
}

function FilterSelect({ label, value, options, onChange }: FilterSelectProps) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Select value={value} onValueChange={(nextValue) => onChange(nextValue ?? "all")}>
        <SelectTrigger aria-label={label} className="h-10 w-full rounded-xl bg-background">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  )
}

const defaultFilters: TradeFilters = { query: "", side: "all", status: "all", asset: "all", tag: "all" }

export function TradesView({
  trades,
  onOpenTrade,
  onNewTrade,
}: {
  trades: Trade[]
  onOpenTrade: (trade: Trade) => void
  onNewTrade: () => void
}) {
  const [filters, setFilters] = useState<TradeFilters>(defaultFilters)
  const assets = useMemo(() => Array.from(new Set(trades.map((trade) => trade.asset))).sort((a, b) => a.localeCompare(b, "es")), [trades])
  const tags = useMemo(() => Array.from(new Set(trades.flatMap((trade) => trade.tags))).sort((a, b) => a.localeCompare(b, "es")), [trades])
  const filteredTrades = useMemo(() => {
    const query = filters.query.trim().toLocaleLowerCase("es")
    return [...trades]
      .filter((trade) => filters.side === "all" || trade.side === filters.side)
      .filter((trade) => filters.status === "all" || trade.status === filters.status)
      .filter((trade) => filters.asset === "all" || trade.asset === filters.asset)
      .filter((trade) => filters.tag === "all" || trade.tags.includes(filters.tag))
      .filter((trade) => {
        if (!query) return true
        return [trade.asset, trade.setup, trade.lessons, ...trade.tags]
          .join(" ")
          .toLocaleLowerCase("es")
          .includes(query)
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [trades, filters])
  const hasActiveFilters = filters.query !== "" || filters.side !== "all" || filters.status !== "all" || filters.asset !== "all" || filters.tag !== "all"

  function resetFilters() {
    setFilters(defaultFilters)
  }

  return (
    <div className="animate-in fade-in duration-300">
      <PageHeading
        eyebrow="TU HISTORIAL"
        title="Mis trades"
        description="Cada operación cuenta una historia. Encuentra la que quieres volver a leer."
        actions={<Button onClick={onNewTrade} className="rounded-xl"><Plus data-icon="inline-start" aria-hidden="true" />Nuevo trade</Button>}
      />

      <Card className="mb-6 rounded-[1.5rem] border-border/70 bg-card shadow-[0_8px_24px_rgba(74,51,40,0.045)]">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-lg">Buscar en el cuaderno</CardTitle>
          <CardDescription>Filtra por dirección, resultado, activo o etiqueta.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Field className="sm:col-span-2 xl:col-span-1">
              <FieldLabel htmlFor="trade-search">Buscar</FieldLabel>
              <div className="relative">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="trade-search" value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} placeholder="Activo, idea o etiqueta…" className="h-10 rounded-xl bg-background pl-9" />
              </div>
            </Field>
            <FilterSelect
              label="Tipo"
              value={filters.side}
              onChange={(side) => setFilters((current) => ({ ...current, side: side as TradeFilters["side"] }))}
              options={[{ value: "all", label: "Compra y venta" }, { value: "long", label: "Compra · Long" }, { value: "short", label: "Venta · Short" }]}
            />
            <FilterSelect
              label="Resultado"
              value={filters.status}
              onChange={(status) => setFilters((current) => ({ ...current, status: status as TradeFilters["status"] }))}
              options={[{ value: "all", label: "Todos los resultados" }, { value: "win", label: "Ganados" }, { value: "loss", label: "Perdidos" }, { value: "break-even", label: "Break-even" }]}
            />
            <FilterSelect
              label="Activo"
              value={filters.asset}
              onChange={(asset) => setFilters((current) => ({ ...current, asset }))}
              options={[{ value: "all", label: "Todos los activos" }, ...assets.map((asset) => ({ value: asset, label: asset }))]}
            />
            <FilterSelect
              label="Etiqueta"
              value={filters.tag}
              onChange={(tag) => setFilters((current) => ({ ...current, tag }))}
              options={[{ value: "all", label: "Todas las etiquetas" }, ...tags.map((tag) => ({ value: tag, label: `#${tag}` }))]}
            />
          </FieldGroup>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              <span className="font-medium text-foreground">{filteredTrades.length}</span> {filteredTrades.length === 1 ? "trade encontrado" : "trades encontrados"}
            </p>
            {hasActiveFilters ? (
              <Button type="button" variant="ghost" size="sm" onClick={resetFilters} className="rounded-lg text-muted-foreground">
                <RotateCcw data-icon="inline-start" aria-hidden="true" />
                Limpiar filtros
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {filteredTrades.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredTrades.map((trade) => <TradeCard key={trade.id} trade={trade} onOpen={onOpenTrade} />)}
        </div>
      ) : (
        <Card className="rounded-[1.5rem] border-dashed border-border bg-card/70 shadow-none">
          <CardContent className="flex flex-col items-center px-5 py-10 text-center sm:py-14">
            <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-secondary text-primary">
              <Search aria-hidden="true" className="size-6" />
            </span>
            <h2 className="font-display text-2xl text-foreground">{trades.length ? "No encontramos coincidencias" : "Todavía no hay trades"}</h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {trades.length ? "Prueba con otra búsqueda o limpia los filtros para ver el historial completo." : "Registra una operación para comenzar a construir tu historial."}
            </p>
            {trades.length ? (
              <Button type="button" variant="outline" onClick={resetFilters} className="mt-5 rounded-xl">Limpiar filtros</Button>
            ) : (
              <Button type="button" onClick={onNewTrade} className="mt-5 rounded-xl"><Plus data-icon="inline-start" aria-hidden="true" />Nuevo trade</Button>
            )}
          </CardContent>
        </Card>
      )}

      {tags.length ? (
        <div className="mt-6 flex flex-wrap items-center gap-2" aria-label="Etiquetas disponibles">
          <span className="mr-1 text-xs text-muted-foreground">Etiquetas:</span>
          {tags.slice(0, 8).map((tag) => <Badge key={tag} variant="secondary" className="rounded-full bg-secondary/70 px-2.5 py-1 text-secondary-foreground">#{tag}</Badge>)}
        </div>
      ) : null}
    </div>
  )
}

  

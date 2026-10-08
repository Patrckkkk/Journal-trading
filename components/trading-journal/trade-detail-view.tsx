import { ArrowLeft, Pencil, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getEmotionEmoji, getEmotionLabel, formatPrice, formatResult, formatTradeDate, type Trade } from "@/lib/trading-journal"
import { DirectionBadge, PageHeading, StatusBadge } from "@/components/trading-journal/shared"

type TradeDetailViewProps = {
  trade: Trade
  onBack: () => void
  onEdit: (trade: Trade) => void
  onDelete: (trade: Trade) => void
}

export function TradeDetailView({ trade, onBack, onEdit, onDelete }: TradeDetailViewProps) {
  const resultTone = trade.status === "win" ? "text-gain" : trade.status === "loss" ? "text-loss" : "text-foreground"
  const details = [
    { label: "Entrada", value: formatPrice(trade.entry) },
    { label: "Stop loss", value: formatPrice(trade.stopLoss) },
    { label: "Take profit", value: formatPrice(trade.takeProfit) },
    { label: "Salida", value: formatPrice(trade.exitPrice) },
  ]

  return (
    <div className="animate-in fade-in duration-300">
      <div className="mb-4">
        <Button type="button" variant="ghost" onClick={onBack} className="rounded-xl px-2 text-muted-foreground">
          <ArrowLeft data-icon="inline-start" aria-hidden="true" />
          Volver a mis trades
        </Button>
      </div>
      <PageHeading
        eyebrow={`DETALLE DE OPERACIÓN · ${formatTradeDate(trade.date, true)}`}
        title={trade.asset}
        description="Revisa el plan, el resultado y lo que te llevas de esta operación."
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => onEdit(trade)} className="rounded-xl">
              <Pencil data-icon="inline-start" aria-hidden="true" />
              Editar
            </Button>
            <Button type="button" variant="ghost" onClick={() => onDelete(trade)} className="rounded-xl text-loss hover:bg-loss/10 hover:text-loss">
              <Trash2 data-icon="inline-start" aria-hidden="true" />
              Eliminar
            </Button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <DirectionBadge side={trade.side} />
        <StatusBadge status={trade.status} />
        {trade.isSample ? <Badge variant="secondary" className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">Trade de ejemplo</Badge> : null}
        {trade.tags.map((tag) => <Badge key={tag} variant="outline" className="rounded-full border-border bg-card px-2.5 py-1 text-muted-foreground">#{tag}</Badge>)}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
        <Card className="overflow-hidden rounded-[1.5rem] border-border/70 shadow-[0_8px_24px_rgba(74,51,40,0.045)]">
          <CardHeader>
            <CardTitle className="font-display text-xl">La captura</CardTitle>
            <CardDescription>Contexto visual de la entrada y la salida.</CardDescription>
          </CardHeader>
          <CardContent>
            {trade.image ? (
              <div className="overflow-hidden rounded-2xl border border-border/70 bg-muted/40">
                <img src={trade.image} alt={`Gráfico de ${trade.asset}, operación ${trade.side === "long" ? "de compra" : "de venta"}`} className="max-h-[520px] w-full object-contain" />
              </div>
            ) : (
              <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-border bg-muted/40 px-5 text-center text-sm text-muted-foreground">
                No se adjuntó una captura para esta operación.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-5">
          <Card className="rounded-[1.5rem] border-border/70 shadow-[0_8px_24px_rgba(74,51,40,0.045)]">
            <CardHeader>
              <CardTitle className="font-display text-xl">Números del trade</CardTitle>
              <CardDescription>Precios registrados y resultado final.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                {details.map((detail) => (
                  <div key={detail.label} className="rounded-xl bg-muted/55 p-3">
                    <p className="text-xs text-muted-foreground">{detail.label}</p>
                    <p className="mt-1 font-medium tabular-nums text-foreground">{detail.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary/65 px-4 py-3">
                <div>
                  <p className="text-xs text-muted-foreground">Resultado</p>
                  <p className="mt-1 text-xs text-muted-foreground">{trade.unit === "USD" ? "Dólares" : "Múltiplos de riesgo"}</p>
                </div>
                <p className={`font-display text-2xl font-semibold tabular-nums ${resultTone}`}>{formatResult(trade.result, trade.unit)}</p>
              </div>
              <p className="text-xs text-muted-foreground">Emoción: <span aria-hidden="true">{getEmotionEmoji(trade.emotion)}</span> {getEmotionLabel(trade.emotion)}</p>
            </CardContent>
          </Card>

          <Card className="rounded-[1.5rem] border-border/70 shadow-[0_8px_24px_rgba(74,51,40,0.045)]">
            <CardHeader>
              <CardTitle className="font-display text-xl">Notas personales</CardTitle>
              <CardDescription>El aprendizaje detrás de los números.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <NoteBlock title="¿Por qué tomé este trade?" text={trade.setup} emptyText="No se anotó el motivo de entrada." />
              <NoteBlock title="Lecciones aprendidas" text={trade.lessons} emptyText="Todavía no hay una lección anotada." />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function NoteBlock({ title, text, emptyText }: { title: string; text: string; emptyText: string }) {
  return (
    <section className="border-b border-border/70 pb-4 last:border-b-0 last:pb-0">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className={`mt-2 whitespace-pre-wrap text-sm leading-relaxed ${text ? "text-muted-foreground" : "italic text-muted-foreground/75"}`}>
        {text || emptyText}
      </p>
    </section>
  )
}

  

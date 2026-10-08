"use client"

import { useRef, useState, type FormEvent } from "react"
import { ArrowLeft, Check, ImagePlus, LoaderCircle, Sparkles, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { compressTradeImage, EMOTIONS, getLocalDateTimeValue, type ResultUnit, type Trade, type TradeSide, type TradeStatus } from "@/lib/trading-journal"
import { PageHeading } from "@/components/trading-journal/shared"

export type TradeFormValues = Omit<Trade, "id" | "isSample">

type TradeFormProps = {
  initialTrade?: Trade | null
  isSaving?: boolean
  onSave: (trade: TradeFormValues) => void | Promise<void>
  onCancel: () => void
}

type TradeFormState = {
  date: string
  asset: string
  side: TradeSide
  entry: string
  stopLoss: string
  takeProfit: string
  exitPrice: string
  result: string
  unit: ResultUnit
  status: TradeStatus
  image?: string
  setup: string
  emotion: string
  lessons: string
}

function valueForInput(value: number | null | undefined) {
  return value === null || value === undefined ? "" : String(value)
}

function makeFormState(trade?: Trade | null): TradeFormState {
  return {
    date: trade?.date ?? getLocalDateTimeValue(),
    asset: trade?.asset ?? "",
    side: trade?.side ?? "long",
    entry: valueForInput(trade?.entry),
    stopLoss: valueForInput(trade?.stopLoss),
    takeProfit: valueForInput(trade?.takeProfit),
    exitPrice: valueForInput(trade?.exitPrice),
    result: trade ? String(Math.abs(trade.result)) : "",
    unit: trade?.unit ?? "USD",
    status: trade?.status ?? "win",
    image: trade?.image,
    setup: trade?.setup ?? "",
    emotion: trade?.emotion ?? "serena",
    lessons: trade?.lessons ?? "",
  }
}

function parseOptionalNumber(value: string): number | null {
  if (!value.trim()) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function PriceField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} type="number" inputMode="decimal" step="any" placeholder="Opcional" value={value} onChange={(event) => onChange(event.target.value)} />
    </Field>
  )
}

export function TradeForm({ initialTrade, isSaving = false, onSave, onCancel }: TradeFormProps) {
  const [form, setForm] = useState(() => makeFormState(initialTrade))
  const [tagText, setTagText] = useState(() => initialTrade?.tags.map((tag) => `#${tag}`).join(", ") ?? "")
  const [fieldError, setFieldError] = useState<"asset" | "date" | "result" | null>(null)
  const [formError, setFormError] = useState("")
  const [imageError, setImageError] = useState("")
  const [isCompressing, setIsCompressing] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

  function updateField<Key extends keyof TradeFormState>(key: Key, value: TradeFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }))
    setFieldError(null)
    setFormError("")
  }

  async function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    if (!file) return

    setImageError("")
    setIsCompressing(true)
    try {
      const image = await compressTradeImage(file)
      updateField("image", image)
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "No pudimos procesar esa imagen.")
    } finally {
      setIsCompressing(false)
      event.currentTarget.value = ""
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSaving) return
    const asset = form.asset.trim()
    if (!asset) {
      setFieldError("asset")
      setFormError("Escribe el activo de la operación para continuar.")
      return
    }
    if (!form.date || Number.isNaN(new Date(form.date).getTime())) {
      setFieldError("date")
      setFormError("Revisa la fecha y la hora de la operación.")
      return
    }

    const amount = form.status === "break-even" ? 0 : Number(form.result)
    if (form.status !== "break-even" && (!Number.isFinite(amount) || amount <= 0)) {
      setFieldError("result")
      setFormError("Añade un resultado mayor que cero o selecciona Break-even.")
      return
    }

    const tags = Array.from(
      new Set(
        tagText
          .split(/[,;\n]/)
          .map((tag) => tag.replace(/^#+/, "").trim().slice(0, 32))
          .filter(Boolean),
      ),
    ).slice(0, 12)
    const signedResult = form.status === "loss" ? -Math.abs(amount) : Math.abs(amount)

    onSave({
      date: form.date,
      asset: asset.slice(0, 40),
      side: form.side,
      entry: parseOptionalNumber(form.entry),
      stopLoss: parseOptionalNumber(form.stopLoss),
      takeProfit: parseOptionalNumber(form.takeProfit),
      exitPrice: parseOptionalNumber(form.exitPrice),
      result: form.status === "break-even" ? 0 : signedResult,
      unit: form.unit,
      status: form.status,
      image: form.image,
      setup: form.setup.trim().slice(0, 4_000),
      emotion: form.emotion,
      lessons: form.lessons.trim().slice(0, 4_000),
      tags,
    })
  }

  const editing = Boolean(initialTrade)

  return (
    <div className="animate-in fade-in duration-300">
      <PageHeading
        eyebrow={editing ? "ACTUALIZA TU REGISTRO" : "NUEVA PÁGINA"}
        title={editing ? "Editar trade" : "Nuevo trade"}
        description={editing ? "Ajusta los detalles y conserva lo que aprendiste." : "Registra la operación con calma. El contexto también cuenta."}
        actions={
          <Button type="button" variant="ghost" onClick={onCancel} className="rounded-xl">
            <ArrowLeft data-icon="inline-start" aria-hidden="true" />
            Volver
          </Button>
        }
      />

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
          <div className="flex flex-col gap-5">
            <Card className="rounded-[1.5rem] border-border/70 shadow-[0_8px_24px_rgba(74,51,40,0.045)]">
              <CardHeader>
                <CardTitle className="font-display text-xl">La operación</CardTitle>
                <CardDescription>Datos esenciales para poder revisarla después.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <FieldGroup className="grid gap-4 sm:grid-cols-2">
                  <Field data-invalid={fieldError === "date" || undefined}>
                    <FieldLabel htmlFor="trade-date">Fecha y hora</FieldLabel>
                    <Input id="trade-date" type="datetime-local" required value={form.date} aria-invalid={fieldError === "date" || undefined} onChange={(event) => updateField("date", event.target.value)} />
                    {fieldError === "date" ? <FieldError>Indica una fecha y hora válidas.</FieldError> : null}
                  </Field>
                  <Field data-invalid={fieldError === "asset" || undefined}>
                    <FieldLabel htmlFor="trade-asset">Activo o par</FieldLabel>
                    <Input id="trade-asset" autoComplete="off" maxLength={40} placeholder="EUR/USD, BTC, AAPL…" required value={form.asset} aria-invalid={fieldError === "asset" || undefined} onChange={(event) => updateField("asset", event.target.value)} />
                    {fieldError === "asset" ? <FieldError>Escribe el activo de esta operación.</FieldError> : null}
                  </Field>
                </FieldGroup>

                <FieldSet className="gap-3">
                  <FieldLegend variant="label" className="text-sm">Tipo de operación</FieldLegend>
                  <ToggleGroup
                    aria-label="Dirección de la operación"
                    value={[form.side]}
                    onValueChange={(values) => values[0] && updateField("side", values[0] as TradeSide)}
                    variant="outline"
                    className="grid w-full grid-cols-2 rounded-2xl bg-muted/65 p-1"
                  >
                    <ToggleGroupItem value="long" className="h-11 rounded-xl border-transparent bg-transparent text-sm data-pressed:border-gain/25 data-pressed:bg-gain/10 data-pressed:text-gain">
                      Compra <span className="text-xs opacity-70">Long</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="short" className="h-11 rounded-xl border-transparent bg-transparent text-sm data-pressed:border-loss/25 data-pressed:bg-loss/10 data-pressed:text-loss">
                      Venta <span className="text-xs opacity-70">Short</span>
                    </ToggleGroupItem>
                  </ToggleGroup>
                </FieldSet>

                <FieldSet className="gap-3">
                  <FieldLegend variant="label" className="text-sm">Precios del trade</FieldLegend>
                  <FieldGroup className="grid gap-4 sm:grid-cols-2">
                    <PriceField id="trade-entry" label="Precio de entrada" value={form.entry} onChange={(value) => updateField("entry", value)} />
                    <PriceField id="trade-stop" label="Stop loss" value={form.stopLoss} onChange={(value) => updateField("stopLoss", value)} />
                    <PriceField id="trade-target" label="Take profit" value={form.takeProfit} onChange={(value) => updateField("takeProfit", value)} />
                    <PriceField id="trade-exit" label="Precio de salida" value={form.exitPrice} onChange={(value) => updateField("exitPrice", value)} />
                  </FieldGroup>
                </FieldSet>

                <div className="grid gap-5 border-t border-border/70 pt-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,1fr)]">
                  <FieldSet className="gap-3">
                    <FieldLegend variant="label" className="text-sm">Cómo terminó</FieldLegend>
                    <ToggleGroup
                      aria-label="Resultado del trade"
                      value={[form.status]}
                      onValueChange={(values) => values[0] && updateField("status", values[0] as TradeStatus)}
                      variant="outline"
                      className="grid w-full grid-cols-3 rounded-2xl bg-muted/65 p-1"
                    >
                      <ToggleGroupItem value="win" className="h-10 rounded-xl border-transparent bg-transparent px-2 text-xs data-pressed:border-gain/25 data-pressed:bg-gain/10 data-pressed:text-gain sm:text-sm">Ganado</ToggleGroupItem>
                      <ToggleGroupItem value="loss" className="h-10 rounded-xl border-transparent bg-transparent px-2 text-xs data-pressed:border-loss/25 data-pressed:bg-loss/10 data-pressed:text-loss sm:text-sm">Perdido</ToggleGroupItem>
                      <ToggleGroupItem value="break-even" className="h-10 rounded-xl border-transparent bg-transparent px-2 text-xs data-pressed:border-amber/30 data-pressed:bg-amber/10 data-pressed:text-amber-foreground sm:text-sm">Break-even</ToggleGroupItem>
                    </ToggleGroup>
                  </FieldSet>
                  <FieldGroup className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_110px]">
                    <Field data-invalid={fieldError === "result" || undefined}>
                      <FieldLabel htmlFor="trade-result">Resultado</FieldLabel>
                      <Input id="trade-result" type="number" inputMode="decimal" min="0" step="any" placeholder="0,00" disabled={form.status === "break-even"} value={form.status === "break-even" ? "0" : form.result} aria-invalid={fieldError === "result" || undefined} onChange={(event) => updateField("result", event.target.value)} />
                      {fieldError === "result" ? <FieldError>Usa un valor positivo para registrar el resultado.</FieldError> : null}
                    </Field>
                    <Field>
                      <FieldLabel>Unidad</FieldLabel>
                      <Select value={form.unit} onValueChange={(value) => value && updateField("unit", value as ResultUnit)}>
                        <SelectTrigger aria-label="Unidad del resultado" className="h-10 w-full rounded-xl bg-background">
                          <SelectValue placeholder="Unidad" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="USD">USD · dólares</SelectItem>
                            <SelectItem value="R">R · riesgo</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  </FieldGroup>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.5rem] border-border/70 shadow-[0_8px_24px_rgba(74,51,40,0.045)]">
              <CardHeader>
                <CardTitle className="font-display text-xl">El contexto</CardTitle>
                <CardDescription>La parte que más valor tiene al releer tu bitácora.</CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="trade-setup">¿Por qué tomé este trade?</FieldLabel>
                    <Textarea id="trade-setup" rows={4} maxLength={4_000} placeholder="Describe el setup, la señal y qué esperabas que ocurriera…" value={form.setup} onChange={(event) => updateField("setup", event.target.value)} className="min-h-28 resize-y rounded-xl bg-background" />
                    <FieldDescription>Escribe lo que veías antes de entrar, no lo que sabes después.</FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="trade-lessons">Lecciones aprendidas</FieldLabel>
                    <Textarea id="trade-lessons" rows={3} maxLength={4_000} placeholder="¿Qué repetirías? ¿Qué cambiarías la próxima vez?" value={form.lessons} onChange={(event) => updateField("lessons", event.target.value)} className="min-h-24 resize-y rounded-xl bg-background" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="trade-emotion">¿Cómo me sentí?</FieldLabel>
                    <Select value={form.emotion} onValueChange={(value) => value && updateField("emotion", value)}>
                      <SelectTrigger id="trade-emotion" aria-label="Emoción durante el trade" className="h-11 w-full rounded-xl bg-background">
                        <SelectValue placeholder="Elige una emoción" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {EMOTIONS.map((emotion) => (
                            <SelectItem key={emotion.value} value={emotion.value}>
                              <span aria-hidden="true">{emotion.emoji}</span>
                              {emotion.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="trade-tags">Etiquetas</FieldLabel>
                    <Input id="trade-tags" autoComplete="off" placeholder="#breakout, #tendencia, #noticias" value={tagText} onChange={(event) => setTagText(event.target.value)} className="h-10 rounded-xl bg-background" />
                    <FieldDescription>Separa cada etiqueta con una coma o punto y coma.</FieldDescription>
                    {tagText.trim() ? (
                      <div className="flex flex-wrap gap-2 pt-1" aria-label="Vista previa de etiquetas">
                        {tagText.split(/[,;\n]/).map((tag) => tag.replace(/^#+/, "").trim()).filter(Boolean).slice(0, 12).map((tag, index) => (
                          <Badge key={`${tag}-${index}`} variant="secondary" className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">#{tag.slice(0, 32)}</Badge>
                        ))}
                      </div>
                    ) : null}
                  </Field>
                </FieldGroup>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-5">
            <Card className="rounded-[1.5rem] border-border/70 shadow-[0_8px_24px_rgba(74,51,40,0.045)]">
              <CardHeader>
                <CardTitle className="font-display text-xl">Captura del gráfico</CardTitle>
                <CardDescription>La captura se comprime y se guarda de forma privada en tu cuenta.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <input ref={imageInputRef} type="file" accept="image/*" aria-label="Subir captura del gráfico" className="sr-only" onChange={handleImageChange} />
                {form.image ? (
                  <div className="overflow-hidden rounded-2xl border border-border/70 bg-muted">
                    <img src={form.image} alt={`Vista previa del gráfico de ${form.asset || "la operación"}`} className="max-h-[320px] w-full object-contain" />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={isCompressing}
                    className="flex min-h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/40 px-5 py-8 text-center transition-colors hover:bg-muted/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-wait disabled:opacity-70"
                  >
                    <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
                      {isCompressing ? <LoaderCircle aria-hidden="true" className="size-5 animate-spin" /> : <ImagePlus aria-hidden="true" className="size-5" />}
                    </span>
                    <span className="font-medium text-foreground">{isCompressing ? "Comprimiendo imagen…" : "Añade una captura"}</span>
                    <span className="text-xs text-muted-foreground">JPG, PNG o WebP · hasta 20 MB</span>
                  </button>
                )}
                {form.image ? (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => imageInputRef.current?.click()} disabled={isCompressing} className="flex-1 rounded-xl">
                      {isCompressing ? <LoaderCircle data-icon="inline-start" aria-hidden="true" className="animate-spin" /> : <ImagePlus data-icon="inline-start" aria-hidden="true" />}
                      Cambiar imagen
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => updateField("image", undefined)} className="rounded-xl text-muted-foreground hover:text-loss" aria-label="Quitar imagen">
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                ) : null}
                {imageError ? <p role="alert" className="text-sm text-loss">{imageError}</p> : null}
                {form.image ? <p className="text-xs text-muted-foreground">La captura quedará guardada en tu cuenta y en tus respaldos JSON.</p> : null}
              </CardContent>
            </Card>

            <Card className="rounded-[1.5rem] border-border/70 bg-secondary/50 shadow-none">
              <CardContent className="flex items-start gap-3 p-4">
                <Sparkles aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  La constancia se construye al anotar también los trades que no salieron como esperabas.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving} className="rounded-xl">Cancelar</Button>
          <Button type="submit" disabled={isSaving} className="rounded-xl px-5">
            {isSaving ? <LoaderCircle data-icon="inline-start" aria-hidden="true" className="animate-spin" /> : <Check data-icon="inline-start" aria-hidden="true" />}
            {isSaving ? "Guardando tu trade…" : editing ? "Guardar cambios" : "Guardar trade"}
          </Button>
        </div>
        {formError ? <p role="alert" className="mt-3 text-right text-sm text-loss">{formError}</p> : null}
      </form>
    </div>
  )
}



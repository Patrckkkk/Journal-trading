export type TradeSide = "long" | "short"
export type TradeStatus = "win" | "loss" | "break-even"
export type ResultUnit = "USD" | "R"

export interface Trade {
  id: string
  date: string
  asset: string
  side: TradeSide
  entry: number | null
  stopLoss: number | null
  takeProfit: number | null
  exitPrice: number | null
  result: number
  unit: ResultUnit
  status: TradeStatus
  image?: string
  imagePath?: string
  setup: string
  emotion: string
  lessons: string
  tags: string[]
  isSample?: boolean
}

export const STORAGE_KEY = "bitacora-trading-v1"

export const EMOTIONS = [
  { value: "serena", label: "Serena", emoji: "🌿" },
  { value: "enfocada", label: "Enfocada", emoji: "✨" },
  { value: "confiada", label: "Confiada", emoji: "☀️" },
  { value: "impaciente", label: "Impaciente", emoji: "⚡" },
  { value: "ansiosa", label: "Ansiosa", emoji: "🌧️" },
  { value: "cansada", label: "Cansada", emoji: "🌙" },
] as const

const SAMPLE_TRADES: Trade[] = [
  {
    id: "sample-eurusd",
    date: "2026-10-05T09:20",
    asset: "EUR/USD",
    side: "long",
    entry: 1.1712,
    stopLoss: 1.1685,
    takeProfit: 1.176,
    exitPrice: 1.1754,
    result: 245.5,
    unit: "USD",
    status: "win",
    image: "/trades/demo-eurusd.png",
    setup: "Rompimiento de rango durante la apertura europea. Esperé el retesteo antes de entrar.",
    emotion: "enfocada",
    lessons: "La paciencia para esperar confirmación hizo la diferencia. Mantener esta rutina.",
    tags: ["breakout", "sesión europea"],
    isSample: true,
  },
  {
    id: "sample-btcusd",
    date: "2026-10-04T14:55",
    asset: "BTC/USD",
    side: "short",
    entry: 64_100,
    stopLoss: 64_900,
    takeProfit: 62_500,
    exitPrice: 64_900,
    result: -86.25,
    unit: "USD",
    status: "loss",
    image: "/trades/demo-btc.png",
    setup: "Busqué una reversión después de una subida rápida, pero entré antes de ver un rechazo claro.",
    emotion: "impaciente",
    lessons: "No anticipar el patrón. Esperar una vela de confirmación y respetar el tamaño de posición.",
    tags: ["reversión", "gestión de riesgo"],
    isSample: true,
  },
  {
    id: "sample-aapl",
    date: "2026-10-02T10:12",
    asset: "AAPL",
    side: "long",
    entry: 255.4,
    stopLoss: 252.9,
    takeProfit: 260.4,
    exitPrice: 259.9,
    result: 1.8,
    unit: "R",
    status: "win",
    setup: "Continuación de tendencia tras consolidar por encima del máximo de la mañana.",
    emotion: "serena",
    lessons: "Reducir riesgo al acercarme al objetivo me ayudó a sostener el plan sin salir por impulso.",
    tags: ["continuación", "plan A"],
    isSample: true,
  },
]

export function createSampleTrades(): Trade[] {
  return SAMPLE_TRADES.map((trade) => ({ ...trade, tags: [...trade.tags] }))
}

export function createTradeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `trade-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function getLocalDateTimeValue(date = new Date()): string {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 16)
}

export function formatTradeDate(value: string, includeTime = false): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Fecha sin definir"

  return new Intl.DateTimeFormat(
    "es-ES",
    includeTime
      ? { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }
      : { day: "numeric", month: "short", year: "numeric" },
  ).format(date)
}

export function formatResult(value: number, unit: ResultUnit): string {
  const formatted = new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(Math.abs(value))
  const sign = value > 0 ? "+" : value < 0 ? "−" : ""

  return unit === "USD" ? `${sign}$${formatted}` : `${sign}${formatted}R`
}

export function formatPrice(value: number | null, maximumFractionDigits = 5): string {
  if (value === null || !Number.isFinite(value)) return "—"
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits }).format(value)
}

export function sumResults(trades: Trade[], unit: ResultUnit): number {
  return trades.reduce((total, trade) => total + (trade.unit === unit ? trade.result : 0), 0)
}

export function getAvailableUnits(trades: Trade[]): ResultUnit[] {
  return (["USD", "R"] as const).filter((unit) => trades.some((trade) => trade.unit === unit))
}

export function getPrimaryUnit(trades: Trade[]): ResultUnit {
  const usdCount = trades.filter((trade) => trade.unit === "USD").length
  const rCount = trades.length - usdCount
  return rCount > usdCount ? "R" : "USD"
}

export function formatTotalSummary(trades: Trade[]): string {
  const available = getAvailableUnits(trades)
  if (available.length === 0) return formatResult(0, "USD")

  return available
    .map((unit) => formatResult(sumResults(trades, unit), unit))
    .join(" · ")
}

function normalizeDate(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Hay una operación sin fecha válida.")
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new Error("Hay una operación con una fecha que no se reconoce.")
  }

  return getLocalDateTimeValue(date)
}

function optionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function isSafeImage(value: string): boolean {
  return (
    /^data:image\/(jpeg|png|webp);base64,/i.test(value) ||
    /^\/trades\/[a-zA-Z0-9._-]+\.png$/i.test(value)
  )
}

export function parseTradeBackup(value: unknown): Trade[] {
  const rows = Array.isArray(value)
    ? value
    : value && typeof value === "object" && "trades" in value && Array.isArray(value.trades)
      ? value.trades
      : null

  if (!rows) {
    throw new Error("El archivo no contiene una lista de operaciones.")
  }
  if (rows.length > 2_500) {
    throw new Error("El archivo supera el máximo de 2.500 operaciones.")
  }

  return rows.map((row, index) => {
    if (!row || typeof row !== "object") {
      throw new Error(`La operación ${index + 1} no tiene un formato válido.`)
    }

    const source = row as Record<string, unknown>
    const asset = typeof source.asset === "string" ? source.asset.trim().slice(0, 40) : ""
    const side = source.side
    const status = source.status
    const unit = source.unit
    const result = Number(source.result)

    if (!asset || !["long", "short"].includes(String(side))) {
      throw new Error(`La operación ${index + 1} necesita un activo y una dirección válidos.`)
    }
    if (!["win", "loss", "break-even"].includes(String(status))) {
      throw new Error(`La operación ${index + 1} tiene un resultado no reconocido.`)
    }
    if (!["USD", "R"].includes(String(unit)) || !Number.isFinite(result)) {
      throw new Error(`La operación ${index + 1} tiene un valor de resultado no válido.`)
    }

    const normalizedStatus = status as TradeStatus
    const normalizedResult =
      normalizedStatus === "break-even"
        ? 0
        : normalizedStatus === "loss"
          ? -Math.abs(result)
          : Math.abs(result)
    const rawImage = typeof source.image === "string" ? source.image : ""
    const image = rawImage.length <= 4_000_000 && isSafeImage(rawImage) ? rawImage : undefined
    const rawTags = Array.isArray(source.tags) ? source.tags : []
    const tags = Array.from(
      new Set(
        rawTags
          .filter((tag): tag is string => typeof tag === "string")
          .map((tag) => tag.replace(/^#+/, "").trim().slice(0, 32))
          .filter(Boolean),
      ),
    ).slice(0, 12)

    return {
      id: typeof source.id === "string" && source.id.length <= 100 ? source.id : createTradeId(),
      date: normalizeDate(source.date),
      asset,
      side: side as TradeSide,
      entry: optionalNumber(source.entry),
      stopLoss: optionalNumber(source.stopLoss),
      takeProfit: optionalNumber(source.takeProfit),
      exitPrice: optionalNumber(source.exitPrice),
      result: normalizedResult,
      unit: unit as ResultUnit,
      status: normalizedStatus,
      image,
      setup: typeof source.setup === "string" ? source.setup.slice(0, 4_000) : "",
      emotion: typeof source.emotion === "string" ? source.emotion.slice(0, 40) : "serena",
      lessons: typeof source.lessons === "string" ? source.lessons.slice(0, 4_000) : "",
      tags,
      isSample: false,
    }
  })
}

export function getEmotionLabel(value: string): string {
  return EMOTIONS.find((emotion) => emotion.value === value)?.label ?? value
}

export function getEmotionEmoji(value: string): string {
  return EMOTIONS.find((emotion) => emotion.value === value)?.emoji ?? "✦"
}

export function getStatusLabel(status: TradeStatus): string {
  if (status === "win") return "Ganado"
  if (status === "loss") return "Perdido"
  return "Break-even"
}

export function getSideLabel(side: TradeSide): string {
  return side === "long" ? "Compra" : "Venta"
}

export async function compressTradeImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("El archivo elegido no parece ser una imagen.")
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error("La imagen supera el límite de 20 MB.")
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.crossOrigin = "anonymous"
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error("No pudimos abrir esa imagen. Prueba con JPG, PNG o WebP."))
      image.src = objectUrl
    })

    const scale = Math.min(1, 1_600 / Math.max(image.naturalWidth, image.naturalHeight))
    let width = Math.max(1, Math.round(image.naturalWidth * scale))
    let height = Math.max(1, Math.round(image.naturalHeight * scale))
    const canvas = document.createElement("canvas")
    const context = canvas.getContext("2d")
    if (!context) throw new Error("Este navegador no pudo preparar la imagen.")

    const qualities = [0.78, 0.68, 0.58, 0.5]
    for (const quality of qualities) {
      canvas.width = width
      canvas.height = height
      context.fillStyle = "#fff"
      context.fillRect(0, 0, width, height)
      context.drawImage(image, 0, 0, width, height)
      const compressed = canvas.toDataURL("image/jpeg", quality)
      if (compressed.length <= 1_800_000) return compressed
      width = Math.max(1, Math.round(width * 0.8))
      height = Math.max(1, Math.round(height * 0.8))
    }

    throw new Error("No pudimos reducir la imagen lo suficiente. Prueba con una captura más pequeña.")
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

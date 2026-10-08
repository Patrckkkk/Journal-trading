import { getSupabase } from "@/lib/supabase/client"
import {
  createTradeId,
  getLocalDateTimeValue,
  type ResultUnit,
  type Trade,
  type TradeSide,
  type TradeStatus,
} from "@/lib/trading-journal"

const BUCKET = "trade-images"
const SIGNED_URL_SECONDS = 60 * 60 * 6
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type TradeRow = {
  id: string
  fecha: string
  activo: string
  tipo: "compra" | "venta"
  precio_entrada: number | null
  stop_loss: number | null
  take_profit: number | null
  precio_salida: number | null
  resultado: number
  unidad: ResultUnit
  estado: "ganado" | "perdido" | "breakeven"
  motivo: string | null
  emocion: string | null
  lecciones: string | null
  etiquetas: string[] | null
  imagen_path: string | null
}

const sideToDb = (side: TradeSide) => (side === "long" ? "compra" : "venta")
const sideFromDb = (tipo: TradeRow["tipo"]): TradeSide => (tipo === "compra" ? "long" : "short")
const statusToDb = (status: TradeStatus) =>
  status === "win" ? "ganado" : status === "loss" ? "perdido" : "breakeven"
const statusFromDb = (estado: TradeRow["estado"]): TradeStatus =>
  estado === "ganado" ? "win" : estado === "perdido" ? "loss" : "break-even"

function rowToTrade(row: TradeRow, signedUrls: Map<string, string>): Trade {
  return {
    id: row.id,
    date: getLocalDateTimeValue(new Date(row.fecha)),
    asset: row.activo,
    side: sideFromDb(row.tipo),
    entry: row.precio_entrada === null ? null : Number(row.precio_entrada),
    stopLoss: row.stop_loss === null ? null : Number(row.stop_loss),
    takeProfit: row.take_profit === null ? null : Number(row.take_profit),
    exitPrice: row.precio_salida === null ? null : Number(row.precio_salida),
    result: Number(row.resultado),
    unit: row.unidad,
    status: statusFromDb(row.estado),
    image: row.imagen_path ? signedUrls.get(row.imagen_path) : undefined,
    imagePath: row.imagen_path ?? undefined,
    setup: row.motivo ?? "",
    emotion: row.emocion ?? "serena",
    lessons: row.lecciones ?? "",
    tags: row.etiquetas ?? [],
    isSample: false,
  }
}

export async function fetchTrades(): Promise<Trade[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("trades")
    .select("*")
    .order("fecha", { ascending: false })
    .limit(5000)
  if (error) throw new Error(`No pudimos cargar tus trades: ${error.message}`)

  const rows = (data ?? []) as TradeRow[]
  const paths = rows.map((row) => row.imagen_path).filter((path): path is string => Boolean(path))
  const signedUrls = new Map<string, string>()

  if (paths.length) {
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS)
    for (const item of signed ?? []) {
      if (item.path && item.signedUrl) signedUrls.set(item.path, item.signedUrl)
    }
  }

  return rows.map((row) => rowToTrade(row, signedUrls))
}

async function imageToBlob(image: string): Promise<Blob> {
  const response = await fetch(image)
  if (!response.ok) throw new Error("No pudimos leer la imagen del trade.")
  return response.blob()
}

async function uploadImage(userId: string, tradeId: string, image: string): Promise<{ path: string; blob: Blob }> {
  const blob = await imageToBlob(image)
  const extension = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg"
  const path = `${userId}/${tradeId}-${Date.now()}.${extension}`
  const { error } = await getSupabase().storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type || "image/jpeg",
    upsert: false,
  })
  if (error) throw new Error(`No pudimos subir la imagen: ${error.message}`)
  return { path, blob }
}

async function removeImages(paths: string[]) {
  if (!paths.length) return
  await getSupabase().storage.from(BUCKET).remove(paths)
}

/**
 * Crea o actualiza un trade. Si `trade.image` es una imagen nueva (data URL o
 * imagen de ejemplo local) se sube a Storage; si es undefined se elimina la
 * anterior; si es una URL firmada se conserva la ruta existente.
 */
export async function saveTradeRemote(userId: string, trade: Trade, previousPath?: string): Promise<Trade> {
  const supabase = getSupabase()
  const id = UUID_RE.test(trade.id) ? trade.id : createTradeId()

  let imagePath: string | null = previousPath ?? null
  let displayImage = trade.image
  const isNewImage = Boolean(trade.image && (trade.image.startsWith("data:") || trade.image.startsWith("/trades/")))

  if (isNewImage && trade.image) {
    const uploaded = await uploadImage(userId, id, trade.image)
    imagePath = uploaded.path
    displayImage = trade.image.startsWith("data:") ? trade.image : URL.createObjectURL(uploaded.blob)
  } else if (!trade.image) {
    imagePath = null
  }

  const payload = {
    id,
    user_id: userId,
    fecha: new Date(trade.date).toISOString(),
    activo: trade.asset,
    tipo: sideToDb(trade.side),
    precio_entrada: trade.entry,
    stop_loss: trade.stopLoss,
    take_profit: trade.takeProfit,
    precio_salida: trade.exitPrice,
    resultado: trade.result,
    unidad: trade.unit,
    estado: statusToDb(trade.status),
    motivo: trade.setup,
    emocion: trade.emotion,
    lecciones: trade.lessons,
    etiquetas: trade.tags,
    imagen_path: imagePath,
  }

  const { error } = await supabase.from("trades").upsert(payload)
  if (error) {
    if (isNewImage && imagePath && imagePath !== previousPath) await removeImages([imagePath])
    throw new Error(`No pudimos guardar el trade: ${error.message}`)
  }

  if (previousPath && previousPath !== imagePath) await removeImages([previousPath])

  return { ...trade, id, image: displayImage, imagePath: imagePath ?? undefined, isSample: false }
}

export async function deleteTradeRemote(trade: Trade): Promise<void> {
  const { error } = await getSupabase().from("trades").delete().eq("id", trade.id)
  if (error) throw new Error(`No pudimos eliminar el trade: ${error.message}`)
  if (trade.imagePath) await removeImages([trade.imagePath])
}

/** Sube varios trades (import o migración) con un poco de concurrencia. */
export async function saveManyTradesRemote(userId: string, trades: Trade[]): Promise<Trade[]> {
  const saved: Trade[] = []
  for (let index = 0; index < trades.length; index += 4) {
    const batch = trades.slice(index, index + 4)
    saved.push(...(await Promise.all(batch.map((trade) => saveTradeRemote(userId, { ...trade, id: createTradeId() })))))
  }
  return saved
}

export async function imageUrlToDataUrl(url: string): Promise<string | undefined> {
  try {
    const blob = await imageToBlob(url)
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
  } catch {
    return undefined
  }
}

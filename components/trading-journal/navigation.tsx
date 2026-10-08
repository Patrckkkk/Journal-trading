"use client"

import {
  BookOpen,
  ChartNoAxesCombined,
  Download,
  LayoutDashboard,
  LogOut,
  Plus,
  Trash2,
  Upload,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type JournalView = "dashboard" | "new" | "trades" | "stats" | "detail"
type PrimaryView = Exclude<JournalView, "detail">

type NavigationProps = {
  activeView: JournalView
  hasSamples: boolean
  userEmail?: string
  onSignOut?: () => void
  onNavigate: (view: PrimaryView) => void
  onExport: () => void
  onImport: () => void
  onClearSamples: () => void
}

const navigationItems = [
  { view: "dashboard", label: "Inicio", shortLabel: "Inicio", icon: LayoutDashboard },
  { view: "new", label: "Nuevo trade", shortLabel: "Nuevo", icon: Plus },
  { view: "trades", label: "Mis trades", shortLabel: "Trades", icon: BookOpen },
  { view: "stats", label: "Estadísticas", shortLabel: "Stats", icon: ChartNoAxesCombined },
] as const

export function JournalNavigation({
  activeView,
  hasSamples,
  userEmail,
  onSignOut,
  onNavigate,
  onExport,
  onImport,
  onClearSamples,
}: NavigationProps) {
  function isActive(view: PrimaryView) {
    return activeView === view || (activeView === "detail" && view === "trades")
  }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[236px] flex-col border-r border-sidebar-border bg-sidebar px-5 py-6 md:flex">
        <div className="flex items-center gap-3 px-2">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <BookOpen aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-xl leading-none text-foreground">bitácora</p>
            <p className="mt-1 text-xs tracking-wide text-muted-foreground">de trading</p>
          </div>
        </div>

        <nav aria-label="Navegación principal" className="mt-10 flex flex-col gap-2">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.view)

            return (
              <Button
                key={item.view}
                type="button"
                variant={active ? "secondary" : "ghost"}
                aria-current={active ? "page" : undefined}
                onClick={() => onNavigate(item.view)}
                className={cn(
                  "h-11 justify-start rounded-xl px-3 text-sm font-medium",
                  active && "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm",
                )}
              >
                <Icon data-icon="inline-start" aria-hidden="true" />
                <span>{item.label}</span>
              </Button>
            )
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-2 border-t border-sidebar-border pt-5">
          <p className="px-2 pb-1 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Respaldo
          </p>
          <Button type="button" variant="outline" onClick={onExport} className="justify-start rounded-xl">
            <Download data-icon="inline-start" aria-hidden="true" />
            Exportar JSON
          </Button>
          <Button type="button" variant="outline" onClick={onImport} className="justify-start rounded-xl">
            <Upload data-icon="inline-start" aria-hidden="true" />
            Importar JSON
          </Button>
          {hasSamples ? (
            <Button
              type="button"
              variant="ghost"
              onClick={onClearSamples}
              className="justify-start rounded-xl text-muted-foreground hover:text-destructive"
            >
              <Trash2 data-icon="inline-start" aria-hidden="true" />
              Quitar ejemplos
            </Button>
          ) : null}
          <div className="mt-2 rounded-2xl bg-muted/70 p-3.5">
            <p className="text-xs font-medium text-foreground">Tu cuenta</p>
            <p className="mt-1 truncate text-xs text-muted-foreground" title={userEmail}>{userEmail || "Sesión iniciada"}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Tus trades y capturas se guardan en la nube, solo para ti.
            </p>
            {onSignOut ? (
              <Button type="button" variant="outline" size="sm" onClick={onSignOut} className="mt-3 w-full justify-start rounded-xl">
                <LogOut data-icon="inline-start" aria-hidden="true" />
                Cerrar sesión
              </Button>
            ) : null}
          </div>
        </div>
      </aside>

      <nav
        aria-label="Navegación móvil"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 gap-1 border-t border-border bg-background/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(74,51,40,0.06)] backdrop-blur md:hidden"
      >
        {navigationItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.view)

          return (
            <Button
              key={item.view}
              type="button"
              variant="ghost"
              aria-current={active ? "page" : undefined}
              onClick={() => onNavigate(item.view)}
              className={cn(
                "h-auto min-h-14 flex-col gap-1 rounded-xl px-1 py-2 text-[10px] leading-tight text-muted-foreground",
                active && "bg-secondary text-secondary-foreground",
              )}
            >
              <Icon data-icon="inline-start" aria-hidden="true" />
              <span>{item.shortLabel}</span>
            </Button>
          )
        })}
      </nav>
    </>
  )
}

export function MobileBackupActions({ onExport, onImport }: Pick<NavigationProps, "onExport" | "onImport">) {
  return (
    <div className="flex gap-2 md:hidden">
      <Button type="button" variant="outline" size="sm" onClick={onExport} className="rounded-xl">
        <Download data-icon="inline-start" aria-hidden="true" />
        <span className="hidden min-[430px]:inline">Guardar</span>
        <span className="sr-only min-[430px]:hidden">Exportar respaldo</span>
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onImport} className="rounded-xl">
        <Upload data-icon="inline-start" aria-hidden="true" />
        <span className="hidden min-[430px]:inline">Importar</span>
        <span className="sr-only min-[430px]:hidden">Importar respaldo</span>
      </Button>
    </div>
  )
}

export function PrimaryViewIcon({ view }: { view: PrimaryView }) {
  const icon = navigationItems.find((item) => item.view === view)?.icon ?? LayoutDashboard
  const Icon = icon
  return <Icon aria-hidden="true" />
}

export type { PrimaryView }

export const JournalBookIcon = BookOpen
export const JournalChartIcon = ChartNoAxesCombined
export const JournalHomeIcon = LayoutDashboard
export const JournalPlusIcon = Plus
export const JournalDownloadIcon = Download
export const JournalUploadIcon = Upload
export const JournalTrashIcon = Trash2

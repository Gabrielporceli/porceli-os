"use client"

import * as React from "react"
import {
  add,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isEqual,
  isSameDay,
  isSameMonth,
  isToday,
  parse,
  startOfToday,
  startOfWeek,
} from "date-fns"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusCircleIcon,
  SearchIcon,
  Calendar as CalendarIcon,
  LockIcon,
  LockOpenIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button"
import { Separator } from "@/components/ui/separator"
import { useMediaQuery } from "@/hooks/use-media-query"
import { motion, AnimatePresence } from "framer-motion"

export interface CalendarEvent {
  id: string
  name: string
  time?: string
  datetime: string
  type: 'google' | 'notion' | 'crm'
  color?: string
  status?: string
  clients?: string[]
}

export interface CalendarData {
  day: Date
  events: CalendarEvent[]
}

interface FullScreenCalendarProps {
  data: CalendarData[]
  onAddEvent?: (day: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  onDaySelect?: (day: Date) => void
  onDateChange?: (date: Date) => void
  onToggleLock?: (day: Date) => void
  isDayLocked?: (day: Date) => boolean
  leftActions?: React.ReactNode
  rightActions?: React.ReactNode
}

const colStartClasses = [
  "",
  "col-start-2",
  "col-start-3",
  "col-start-4",
  "col-start-5",
  "col-start-6",
  "col-start-7",
]

export function FullScreenCalendar({ data, onAddEvent, onEventClick, onDaySelect, onDateChange, onToggleLock, isDayLocked, leftActions, rightActions }: FullScreenCalendarProps) {
  const today = startOfToday()
  const [selectedDay, setSelectedDay] = React.useState(today)
  const [currentMonth, setCurrentMonth] = React.useState(
    format(today, "MMM-yyyy"),
  )
  const firstDayCurrentMonth = parse(currentMonth, "MMM-yyyy", new Date())
  const isDesktop = useMediaQuery("(min-width: 768px)")

  const days = eachDayOfInterval({
    start: startOfWeek(firstDayCurrentMonth),
    end: endOfWeek(endOfMonth(firstDayCurrentMonth)),
  })

  function previousMonth() {
    const firstDayNextMonth = add(firstDayCurrentMonth, { months: -1 })
    setCurrentMonth(format(firstDayNextMonth, "MMM-yyyy"))
    onDateChange?.(firstDayNextMonth)
  }

  function nextMonth() {
    const firstDayNextMonth = add(firstDayCurrentMonth, { months: 1 })
    setCurrentMonth(format(firstDayNextMonth, "MMM-yyyy"))
    onDateChange?.(firstDayNextMonth)
  }

  function goToToday() {
    setCurrentMonth(format(today, "MMM-yyyy"))
    onDateChange?.(today)
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Calendar Header */}
      <div className="flex flex-col space-y-4 p-4 md:flex-row md:items-center md:justify-between md:space-y-0 lg:flex-none border-b border-white/5">
        <div className="flex items-center gap-4">
          {leftActions}
          {/* Cápsula de navegação do mês — mesma lente de vidro líquido
              (refração SVG + bevel) dos botões Google/Notion */}
          <div className="relative isolate inline-flex items-center rounded-full p-1">
            <span className="lqg-lens absolute inset-0 -z-10 rounded-[inherit] pointer-events-none" />
            <Button
              onClick={previousMonth}
              className="rounded-full shadow-none hover:bg-white/5 text-white/70 border-none h-10 w-10 flex items-center justify-center"
              variant="ghost"
              size="icon"
            >
              <ChevronLeftIcon size={18} strokeWidth={2.5} />
            </Button>
            <Button
              onClick={goToToday}
              className="px-6 rounded-full shadow-none hover:bg-white/5 text-white/70 border-none h-10 font-bold text-[10px] uppercase tracking-[0.2em]"
              variant="ghost"
            >
              Hoje
            </Button>
            <Button
              onClick={nextMonth}
              className="rounded-full shadow-none hover:bg-white/5 text-white/70 border-none h-10 w-10 flex items-center justify-center"
              variant="ghost"
              size="icon"
            >
              <ChevronRightIcon size={18} strokeWidth={2.5} />
            </Button>
          </div>

          <h2 className="text-lg font-black text-white tracking-tight leading-none ml-2 hidden sm:block">
            {format(firstDayCurrentMonth, "MMMM, yyyy")}
          </h2>
        </div>

        <div className="flex items-center gap-3">          {rightActions}
          <LiquidGlassButton
            tint="primary"
            onClick={() => onAddEvent?.(selectedDay)}
            className="h-11 px-6 text-xs font-bold uppercase tracking-widest"
          >
            <span>Novo Evento</span>
          </LiquidGlassButton>
        </div>
      </div>

      {/* Calendar Grid — SEM overflow-hidden aqui: um clip quadrado neste
          wrapper cortava a sombra externa do card de vidro em linha reta,
          deixando "pontas" escuras nos 4 cantos (o recorte entre a curva do
          card e o canto quadrado do clip). O card interno já se auto-clipa. */}
      <div className="lg:flex lg:flex-auto lg:flex-col min-h-0">
        <div className="liquid-glass no-elevation rounded-3xl overflow-hidden flex flex-col h-full isolate">
          {/* Week Days Header */}
          <div className="grid grid-cols-7 text-center text-[10px] font-black uppercase tracking-[0.2em] text-white/20 px-1.5 pt-3 pb-1">
            <div>Dom</div>
            <div>Seg</div>
            <div>Ter</div>
            <div>Qua</div>
            <div>Qui</div>
            <div>Sex</div>
            <div>Sáb</div>
          </div>

          {/* Calendar Days — cada dia é um card roxo flutuante, cor por quantidade */}
          <div className="flex text-xs leading-6 flex-auto min-h-0">
            <div className="grid w-full grid-cols-7 auto-rows-fr gap-1.5 p-1.5">
              {days.map((day) => {
                const dayEvents = data
                  .filter((item) => isSameDay(item.day, day))
                  .flatMap((item) => item.events);
                const count = dayEvents.length;
                const selected = isEqual(day, selectedDay);
                const today = isToday(day);
                const outside = !isSameMonth(day, firstDayCurrentMonth);

                // Intensidade do roxo conforme a quantidade de atividades.
                // Roxo escuro da marca (#6829c0) com rampa forte: níveis nítidos
                // e dias cheios em roxo sólido, destacando-se do fundo.
                const bg =
                  count === 0 ? "rgba(255,255,255,0.03)" :
                  count === 1 ? "rgba(104,41,192,0.45)" :
                  count <= 3  ? "rgba(104,41,192,0.68)" :
                  count <= 6  ? "rgba(104,41,192,0.90)" :
                                "#6829c0";

                return (
                  <div key={day.toISOString()} className={cn(outside && "opacity-30 pointer-events-none")}>
                    <div
                      onClick={() => { setSelectedDay(day); onDaySelect?.(day); }}
                      className={cn(
                        "relative h-full rounded-2xl border flex flex-col cursor-pointer transition-all overflow-hidden hover:brightness-125 group",
                        selected ? "border-white/60 ring-1 ring-white/25"
                          : today ? "border-primary/70"
                          : "border-white/[0.06]"
                      )}
                      style={{ background: bg }}
                    >
                      <header className="flex items-center justify-between px-2.5 pt-2 shrink-0">
                        <span className={cn(
                          "text-xs font-black tabular-nums",
                          selected ? "text-white" : today ? "text-white" : count > 0 ? "text-white" : "text-white/40"
                        )}>
                          {format(day, "d")}
                        </span>

                        {isDayLocked?.(day) && !selected && (
                          <div className="w-5 h-5 rounded-md flex items-center justify-center bg-red-500/25 border border-red-500/40 text-red-300">
                            <LockIcon size={9} />
                          </div>
                        )}
                        {selected && (
                          <div className="flex items-center gap-1">
                            <motion.button
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              title={isDayLocked?.(day) ? "Destrancar dia" : "Trancar dia"}
                              className={cn(
                                "w-5 h-5 rounded-md flex items-center justify-center transition-all border",
                                isDayLocked?.(day)
                                  ? "bg-red-500/25 border-red-500/40 text-red-300 hover:bg-red-500/35"
                                  : "bg-white/10 border-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                              )}
                              onClick={(e) => { e.stopPropagation(); onToggleLock?.(day); }}
                            >
                              {isDayLocked?.(day) ? <LockIcon size={9} /> : <LockOpenIcon size={9} />}
                            </motion.button>
                            {!isDayLocked?.(day) && (
                              <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="w-5 h-5 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all border border-white/10"
                                onClick={(e) => { e.stopPropagation(); onAddEvent?.(day); }}
                              >
                                <PlusCircleIcon size={11} />
                              </motion.button>
                            )}
                          </div>
                        )}
                      </header>

                      {/* Contador de atividades no rodapé */}
                      <div className="flex-1 flex items-end justify-end px-2.5 pb-1.5 min-h-0">
                        {count > 0 && (
                          <span className="text-[10px] font-black text-white/50 leading-none">
                            {count} {count === 1 ? 'ativ.' : 'ativs.'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

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
          <div className="inline-flex items-center rounded-2xl liquid-glass border border-white/5 p-1 bg-white/[0.02] !shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
            <Button
              onClick={previousMonth}
              className="rounded-xl shadow-none hover:bg-white/5 text-white/60 border-none h-10 w-10 flex items-center justify-center"
              variant="ghost"
              size="icon"
            >
              <ChevronLeftIcon size={18} strokeWidth={2.5} />
            </Button>
            <Button
              onClick={goToToday}
              className="px-6 rounded-xl shadow-none hover:bg-white/5 text-white/60 border-none h-10 font-bold text-[10px] uppercase tracking-[0.2em]"
              variant="ghost"
            >
              Hoje
            </Button>
            <Button
              onClick={nextMonth}
              className="rounded-xl shadow-none hover:bg-white/5 text-white/60 border-none h-10 w-10 flex items-center justify-center"
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
          <motion.div
            whileHover={{ scale: 1.05, translateY: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <button
              onClick={() => onAddEvent?.(selectedDay)}
              className="btn-glass-primary flex items-center justify-center gap-2 text-white h-11 px-6 rounded-xl transition-colors duration-300 text-xs font-bold uppercase tracking-widest"
            >
              <span>Novo Evento</span>
            </button>
          </motion.div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="lg:flex lg:flex-auto lg:flex-col overflow-hidden">
        <div className="liquid-glass border-white/5 rounded-3xl overflow-hidden flex flex-col h-full isolate !shadow-none">
          {/* Week Days Header */}
          <div className="grid grid-cols-7 border-b border-white/5 text-center text-[10px] font-black uppercase tracking-[0.2em] text-white/30 bg-white/[0.02]">
            <div className="py-2.5 border-r border-white/5">Dom</div>
            <div className="py-2.5 border-r border-white/5">Seg</div>
            <div className="py-2.5 border-r border-white/5">Ter</div>
            <div className="py-2.5 border-r border-white/5">Qua</div>
            <div className="py-2.5 border-r border-white/5">Qui</div>
            <div className="py-2.5 border-r border-white/5">Sex</div>
            <div className="py-2.5">Sáb</div>
          </div>

          {/* Calendar Days */}
          <div className="flex text-xs leading-6 flex-auto min-h-0">
            <div className="grid w-full grid-cols-7 auto-rows-fr bg-white/[0.01]">
              {days.map((day, dayIdx) => (
                <div
                  key={day.toISOString()}
                  onClick={() => { setSelectedDay(day); onDaySelect?.(day); }}
                  className={cn(
                    !isSameMonth(day, firstDayCurrentMonth) && "opacity-20 pointer-events-none",
                    "relative flex flex-col border-b border-r border-white/[0.03] hover:bg-white/[0.02] focus:z-10 transition-colors group",
                    isEqual(day, selectedDay) && "bg-white/[0.03]"
                  )}
                >
                  <header className="flex items-center justify-between px-1.5 pt-1.5 pb-0.5 shrink-0">
                    <button
                      type="button"
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-black transition-all",
                        isToday(day) && !isEqual(day, selectedDay) && "text-primary border border-primary/20 bg-primary/10",
                        isEqual(day, selectedDay) && isToday(day) && "bg-primary text-white",
                        isEqual(day, selectedDay) && !isToday(day) && "bg-white text-black",
                        !isEqual(day, selectedDay) && !isToday(day) && "text-white/40 group-hover:text-white"
                      )}
                    >
                      <time dateTime={format(day, "yyyy-MM-dd")}>
                        {format(day, "d")}
                      </time>
                    </button>
                    {/* Cadeado sempre visível quando trancado; controles só quando selecionado */}
                    {isDayLocked?.(day) && !isEqual(day, selectedDay) && (
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-red-500/20 border border-red-500/40 text-red-400">
                        <LockIcon size={10} />
                      </div>
                    )}
                    {isEqual(day, selectedDay) && (
                      <div className="flex items-center gap-1">
                        <motion.button
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          title={isDayLocked?.(day) ? "Destrancar dia" : "Trancar dia"}
                          className={cn(
                            "w-6 h-6 rounded-lg flex items-center justify-center transition-all border",
                            isDayLocked?.(day)
                              ? "bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30"
                              : "bg-white/5 border-white/5 text-white/30 hover:bg-white/10 hover:text-white"
                          )}
                          onClick={(e) => { e.stopPropagation(); onToggleLock?.(day); }}
                        >
                          {isDayLocked?.(day) ? <LockIcon size={10} /> : <LockOpenIcon size={10} />}
                        </motion.button>
                        {!isDayLocked?.(day) && (
                          <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/30 hover:text-white transition-all border border-white/5"
                            onClick={(e) => { e.stopPropagation(); onAddEvent?.(day); }}
                          >
                            <PlusCircleIcon size={12} />
                          </motion.button>
                        )}
                      </div>
                    )}
                  </header>
                  
                  {/* Bolinhas — uma por atividade, cor por status */}
                  <div className="flex-1 flex items-center justify-center px-2 pb-2 min-h-0">
                    {(() => {
                      const dayEvents = data
                        .filter((item) => isSameDay(item.day, day))
                        .flatMap((item) => item.events);
                      if (dayEvents.length === 0) return null;

                      const visible = dayEvents.slice(0, 8);
                      return (
                        <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-full">
                          {visible.map((event, i) => {
                            // Escala de roxo do claro ao escuro conforme a posição/quantidade
                            const t = visible.length > 1 ? i / (visible.length - 1) : 1;
                            const opacity = 0.3 + t * 0.7; // 0.30 (claro) → 1.0 (forte)
                            return (
                              <span
                                key={event.id}
                                title={event.name}
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ background: `rgba(104, 41, 192, ${opacity})` }}
                              />
                            );
                          })}
                          {dayEvents.length > 8 && (
                            <span className="text-[9px] font-black text-white/40 leading-none">+{dayEvents.length - 8}</span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

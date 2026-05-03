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
}

export interface CalendarData {
  day: Date
  events: CalendarEvent[]
}

interface FullScreenCalendarProps {
  data: CalendarData[]
  onAddEvent?: (day: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  onDateChange?: (date: Date) => void
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

export function FullScreenCalendar({ data, onAddEvent, onEventClick, onDateChange, leftActions, rightActions }: FullScreenCalendarProps) {
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
          <div className="inline-flex items-center rounded-2xl liquid-glass border border-white/5 p-1 bg-white/[0.02]">
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
          <motion.button
            whileHover={{ scale: 1.05, translateY: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onAddEvent?.(selectedDay)}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white h-11 px-6 rounded-2xl shadow-[0_0_20px_rgba(104,41,192,0.3)] transition-all text-xs font-bold uppercase tracking-widest"
          >
            <PlusCircleIcon size={18} />
            <span>Novo Evento</span>
          </motion.button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="lg:flex lg:flex-auto lg:flex-col overflow-hidden px-4 pb-4">
        <div className="liquid-glass border-white/5 rounded-3xl overflow-hidden flex flex-col h-full">
          {/* Week Days Header */}
          <div className="grid grid-cols-7 border-b border-white/5 text-center text-[10px] font-black uppercase tracking-[0.2em] text-white/30 bg-white/[0.02]">
            <div className="py-4 border-r border-white/5">Dom</div>
            <div className="py-4 border-r border-white/5">Seg</div>
            <div className="py-4 border-r border-white/5">Ter</div>
            <div className="py-4 border-r border-white/5">Qua</div>
            <div className="py-4 border-r border-white/5">Qui</div>
            <div className="py-4 border-r border-white/5">Sex</div>
            <div className="py-4">Sáb</div>
          </div>

          {/* Calendar Days */}
          <div className="flex text-xs leading-6 flex-auto">
            <div className="grid w-full grid-cols-7 auto-rows-[minmax(120px,1fr)] bg-white/[0.01]">
              {days.map((day, dayIdx) => (
                <div
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    !isSameMonth(day, firstDayCurrentMonth) && "opacity-20 pointer-events-none",
                    "relative flex flex-col border-b border-r border-white/[0.03] hover:bg-white/[0.02] focus:z-10 transition-colors group",
                    isEqual(day, selectedDay) && "bg-white/[0.03]"
                  )}
                >
                  <header className="flex items-center justify-between p-2 min-h-[35px] shrink-0">
                    <button
                      type="button"
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-black transition-all",
                        isToday(day) && !isEqual(day, selectedDay) && "text-primary border border-primary/20 bg-primary/10",
                        isEqual(day, selectedDay) && isToday(day) && "bg-primary text-white shadow-[0_0_15px_rgba(104,41,192,0.5)]",
                        isEqual(day, selectedDay) && !isToday(day) && "bg-white text-black",
                        !isEqual(day, selectedDay) && !isToday(day) && "text-white/40 group-hover:text-white"
                      )}
                    >
                      <time dateTime={format(day, "yyyy-MM-dd")}>
                        {format(day, "d")}
                      </time>
                    </button>
                    {isEqual(day, selectedDay) && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/30 hover:text-white transition-all border border-white/5"
                        onClick={(e) => { e.stopPropagation(); onAddEvent?.(day); }}
                      >
                        <PlusCircleIcon size={12} />
                      </motion.button>
                    )}
                  </header>
                  
                  <div className="flex-1 p-2 overflow-y-auto custom-scrollbar min-h-0">
                    <div className="space-y-1.5">
                      {data
                        .filter((item) => isSameDay(item.day, day))
                        .flatMap((item) => item.events)
                        .slice(0, 3)
                        .map((event) => (
                          <motion.div
                            key={event.id}
                            onClick={(e) => { e.stopPropagation(); onEventClick?.(event); }}
                            className={cn(
                              "flex flex-col items-start gap-1 rounded-xl border p-2.5 text-[11px] leading-tight cursor-pointer transition-all hover:brightness-125 hover:translate-y-[-2px] bg-black/40 backdrop-blur-md",
                              event.status === 'REALIZADO' ? "border-emerald-500/50 shadow-[0_4px_12px_rgba(16,185,129,0.1)]" :
                              event.status === 'EM ANDAMENTO' ? "border-blue-500/50 shadow-[0_4px_12px_rgba(59,130,246,0.1)]" :
                              event.type === 'google' ? "border-cyan-500/30 text-cyan-200 shadow-[0_4px_12px_rgba(34,211,238,0.1)]" :
                              "border-white/10 text-white/80 shadow-[0_4px_12px_rgba(255,255,255,0.05)]"
                            )}
                          >
                            <div className="flex items-center justify-between w-full gap-2">
                              <p className="font-bold truncate">{event.name}</p>
                              {event.time && <span className="text-[9px] font-black opacity-50 whitespace-nowrap">{event.time}</span>}
                            </div>
                          </motion.div>
                        ))}
                      
                      {(() => {
                        const dayEvents = data
                          .filter((item) => isSameDay(item.day, day))
                          .flatMap((item) => item.events);
                        
                        if (dayEvents.length > 3) {
                          return (
                            <div className="px-2 pb-2">
                              <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">
                                + {dayEvents.length - 3} mais atividades
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
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

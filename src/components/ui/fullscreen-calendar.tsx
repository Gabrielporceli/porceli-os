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
import { ptBR } from "date-fns/locale"
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
import { PillTabs } from "@/components/ui/pill-tabs"
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
  // Telas até 1023px (celular e tablet em pé) usam a visão compacta, no estilo
  // do app Calendário do iPhone: o mês vira uma grade enxuta (número e pontos)
  // e as atividades do dia escolhido aparecem logo abaixo, sem abrir modal.
  const compacto = !useMediaQuery("(min-width: 1024px)")
  // Só no compacto: mês inteiro ou só a semana do dia escolhido.
  const [visao, setVisao] = React.useState<"mes" | "semana">("mes")
  const semana = compacto && visao === "semana"

  const days = semana
    ? eachDayOfInterval({ start: startOfWeek(selectedDay), end: endOfWeek(selectedDay) })
    : eachDayOfInterval({
        start: startOfWeek(firstDayCurrentMonth),
        end: endOfWeek(endOfMonth(firstDayCurrentMonth)),
      })

  /** Escolhe um dia e avisa a página (ela mostra as atividades dele). */
  function escolherDia(dia: Date) {
    setSelectedDay(dia)
    onDaySelect?.(dia)
  }

  // Na visão por semana as setas andam de 7 em 7 dias; na do mês, de mês em mês.
  function previousMonth() {
    if (semana) {
      const d = add(selectedDay, { days: -7 })
      setCurrentMonth(format(d, "MMM-yyyy"))
      onDateChange?.(d)
      escolherDia(d)
      return
    }
    const firstDayNextMonth = add(firstDayCurrentMonth, { months: -1 })
    setCurrentMonth(format(firstDayNextMonth, "MMM-yyyy"))
    onDateChange?.(firstDayNextMonth)
  }

  function nextMonth() {
    if (semana) {
      const d = add(selectedDay, { days: 7 })
      setCurrentMonth(format(d, "MMM-yyyy"))
      onDateChange?.(d)
      escolherDia(d)
      return
    }
    const firstDayNextMonth = add(firstDayCurrentMonth, { months: 1 })
    setCurrentMonth(format(firstDayNextMonth, "MMM-yyyy"))
    onDateChange?.(firstDayNextMonth)
  }

  function goToToday() {
    setCurrentMonth(format(today, "MMM-yyyy"))
    onDateChange?.(today)
    // Compacto: "Hoje" também leva o dia escolhido (e a lista de baixo) pra hoje.
    if (compacto) escolherDia(today)
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Calendar Header */}
      <div className="flex flex-col space-y-4 p-4 md:flex-row md:items-center md:justify-between md:space-y-0 lg:flex-none border-b border-white/5">
        {/* Celular: a cápsula de navegação fica à esquerda e o mês à direita,
            na mesma linha (o mês nem aparecia: era `hidden sm:block`). */}
        <div className="flex items-center justify-between gap-3 md:justify-start md:gap-4">
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
              // pl compensa o espaço que o letter-spacing deixa DEPOIS da última letra
              // (sem isso o texto fica 1px deslocado pra esquerda).
              className="px-6 pl-[calc(1.5rem+0.2em)] rounded-full shadow-none hover:bg-white/5 text-white/85 border-none h-10 font-bold text-[11px] uppercase tracking-[0.2em]"
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

          <h2 className="text-base font-black text-white tracking-tight leading-none capitalize sm:ml-2 sm:text-lg">
            {format(firstDayCurrentMonth, "MMMM, yyyy", { locale: ptBR })}
          </h2>
        </div>

        {/* Celular: Google, Notion e Novo evento numa linha só, em 3 colunas
            iguais (antes eram 3 linhas de botões largos). */}
        <div className="grid grid-cols-3 gap-2 md:flex md:flex-wrap md:items-center md:gap-3">
          {rightActions}
          <LiquidGlassButton
            tint="primary"
            onClick={() => onAddEvent?.(selectedDay)}
            className="h-10 px-2 text-[11px] font-bold uppercase tracking-widest md:h-11 md:px-6 md:text-xs"
          >
            <span className="md:hidden">Novo</span>
            <span className="hidden md:inline">Novo Evento</span>
          </LiquidGlassButton>
        </div>
      </div>

      {/* Calendar Grid — SEM overflow-hidden aqui: um clip quadrado neste
          wrapper cortava a sombra externa do card de vidro em linha reta,
          deixando "pontas" escuras nos 4 cantos (o recorte entre a curva do
          card e o canto quadrado do clip). O card interno já se auto-clipa. */}
      <div className="lg:flex lg:flex-auto lg:flex-col min-h-0">
        <div className="surface-flat no-elevation rounded-3xl overflow-hidden flex flex-col h-full isolate">
          {/* Compacto: alterna entre o mês inteiro e só a semana do dia escolhido. */}
          {compacto && (
            <div className="flex justify-center px-3.5 pt-3.5">
              <PillTabs
                items={[
                  { value: "mes", label: "Mês" },
                  { value: "semana", label: "Semana" },
                ]}
                value={visao}
                onChange={(v) => setVisao(v as "mes" | "semana")}
              />
            </div>
          )}
          {/* Week Days Header */}
          <div className="grid grid-cols-7 text-center text-[11px] font-black uppercase tracking-[0.2em] text-white/60 px-1.5 pt-3 pb-1 max-lg:px-3.5">
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
            <div className="grid w-full grid-cols-7 auto-rows-fr gap-1.5 p-1.5 max-lg:gap-1 max-lg:p-3.5 max-lg:pt-1">
              {days.map((day) => {
                const dayEvents = data
                  .filter((item) => isSameDay(item.day, day))
                  .flatMap((item) => item.events);
                const count = dayEvents.length;
                const selected = isEqual(day, selectedDay);
                const today = isToday(day);
                // Na visão por semana nenhum dia é "de fora": a semana pode cruzar o mês.
                const outside = !semana && !isSameMonth(day, firstDayCurrentMonth);

                // Intensidade do roxo conforme a quantidade de atividades.
                // Roxo escuro da marca (#6829c0) com rampa forte: níveis nítidos
                // e dias cheios em roxo sólido, destacando-se do fundo.
                const bg =
                  count === 0 ? "rgba(255,255,255,0.05)" :
                  count === 1 ? "rgba(104,41,192,0.45)" :
                  count <= 3  ? "rgba(104,41,192,0.68)" :
                  count <= 6  ? "rgba(104,41,192,0.90)" :
                                "#6829c0";

                return (
                  <div key={day.toISOString()} className={cn(compacto ? (semana ? "min-h-[88px]" : "min-h-[54px]") : "", outside && "opacity-30 pointer-events-none")}>
                    <div
                      onClick={() => escolherDia(day)}
                      className={cn(
                        "relative h-full rounded-2xl border flex flex-col cursor-pointer transition-all overflow-hidden hover:brightness-125 group",
                        compacto && "items-center justify-center gap-1",
                        selected ? "border-white/60 ring-1 ring-white/25"
                          : today ? "border-white/35"
                          : "border-white/[0.06]"
                      )}
                      style={{ background: bg }}
                    >
                      {compacto ? (
                        <>
                          <span className={cn("text-base font-black tabular-nums leading-none", count > 0 || selected || today ? "text-white" : "text-white/65")}>
                            {format(day, "d")}
                          </span>
                          {isDayLocked?.(day) && (
                            <LockIcon size={8} className="absolute right-1 top-1 text-red-300" />
                          )}
                        </>
                      ) : (
                      <>
                      <header className="flex items-center justify-between px-2.5 pt-2 shrink-0">
                        <span className={cn(
                          "text-sm font-black tabular-nums",
                          selected ? "text-white" : today ? "text-white" : count > 0 ? "text-white" : "text-white/65"
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
                          <span className="text-[11px] font-black text-white/85 leading-none">
                            {count} {count === 1 ? 'ativ.' : 'ativs.'}
                          </span>
                        )}
                      </div>
                      </>
                      )}
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

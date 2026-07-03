"use client";

import { useState, useEffect } from "react";
import { format, subDays, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, startOfYear, endOfYear, differenceInWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ContributionDay {
  date: string | Date;
  count: number;
}

interface GitHubCalendarProps {
  data: ContributionDay[];
  colors?: string[];
  className?: string;
}

const GitHubCalendar = ({ 
  data, 
  colors = [
    "rgba(255, 255, 255, 0.07)", // Vazio — neutro, visível em qualquer fundo
    "rgba(139, 92, 246, 0.40)",  // Nível 1 — violet vivo (contrasta com o roxo do fundo)
    "rgba(139, 92, 246, 0.65)",  // Nível 2
    "rgba(139, 92, 246, 0.85)",  // Nível 3
    "#8b5cf6"                    // Nível 4 (Máximo)
  ],
  className
}: GitHubCalendarProps) => {
  const [contributions, setContributions] = useState<ContributionDay[]>([]);
  const today = new Date();
  const startDate = startOfYear(today); 
  const endDate = endOfYear(today);
  const weeks = differenceInWeeks(endDate, startOfWeek(startDate, { weekStartsOn: 0 })) + 1;

  useEffect(() => {
    setContributions(data.map((item) => {
      let date: Date;
      if (typeof item.date === 'string') {
        // Parseia como data local para evitar UTC midnight shift no Brasil (UTC-3)
        const [y, m, d] = item.date.split('-').map(Number);
        date = new Date(y, m - 1, d);
      } else {
        date = item.date;
      }
      return { ...item, date };
    }));
  }, [data]);

  const getColor = (count: number) => {
    if (count === 0) return colors[0];
    if (count === 1) return colors[1];
    if (count <= 3) return colors[2];
    if (count <= 6) return colors[3];
    return colors[4];
  };

  const renderWeeks = () => {
    const weeksArray = [];
    let currentWeekStart = startOfWeek(startDate, { weekStartsOn: 0 });

    for (let i = 0; i < weeks; i++) {
      const weekDays = eachDayOfInterval({
        start: currentWeekStart,
        end: endOfWeek(currentWeekStart, { weekStartsOn: 0 }),
      });

      weeksArray.push(
        <div key={i} className="flex flex-col gap-[3px]">
          {weekDays.map((day, index) => {
            const contribution = contributions.find((c) => isSameDay(c.date, day));
            const color = contribution ? getColor(contribution.count) : colors[0];

            return (
              <div
                key={index}
                className="w-[13px] h-[13px] rounded-[3px] transition-all duration-300 hover:scale-125 hover:brightness-125 cursor-pointer border border-white/10"
                style={{ backgroundColor: color }}
                title={`${format(day, "PPP", { locale: ptBR })}: ${contribution?.count || 0} atividades`}
              />
            );
          })}
        </div>
      );
      currentWeekStart = addDays(currentWeekStart, 7);
    }

    return weeksArray;
  };

  const renderMonthLabels = () => {
    const months = [];
    const year = startDate.getFullYear();
    for (let i = 0; i < 12; i++) {
      // Usa o 1º dia de cada mês real (jan..dez) em vez de somar 30 dias,
      // que causava meses duplicados (jan, jan / mai, mai) e dez faltando.
      const monthDate = new Date(year, i, 1);
      months.push(
        <span key={i} className="text-[10px] font-black text-white/45 uppercase tracking-tighter">
          {format(monthDate, "MMM", { locale: ptBR })}
        </span>
      );
    }
    return months;
  };

  const dayLabels = ["D", "S", "T", "Q", "Q", "S", "S"];

  return (
    <div className={cn("liquid-glass p-6 !rounded-3xl", className)}>
      {/* Canvas escuro interno: dá base estável p/ o heatmap (roxo sobre roxo) */}
      <div className="absolute inset-0 rounded-3xl bg-black/20 pointer-events-none" />
      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">Histórico de Produtividade</h3>
        </div>

        <div className="flex overflow-x-auto pb-2 custom-scrollbar scrollbar-hide w-full">
          <div className="flex flex-col gap-2 w-full">
            <div className="flex w-full justify-between pl-6 pr-4">{renderMonthLabels()}</div>
            <div className="flex w-full">
              <div className="flex flex-col gap-[3px] mr-3 shrink-0 pt-[1px]">
                {dayLabels.map((day, index) => (
                  <span key={index} className="text-[9px] font-black text-white/30 uppercase w-3 h-[13px] flex items-center">
                    {day}
                  </span>
                ))}
              </div>
              <div className="flex justify-between gap-[3px] w-full">{renderWeeks()}</div>
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <div className="flex gap-2 text-[9px] items-center font-black text-white/40 uppercase tracking-widest">
            <span>Menos</span>
            {colors.map((color, index) => (
              <div key={index} className="w-2.5 h-2.5 rounded-[2px] border border-white/10" style={{ backgroundColor: color }} />
            ))}
            <span>Mais</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export { GitHubCalendar };

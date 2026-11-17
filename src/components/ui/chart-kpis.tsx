import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Padrão dos gráficos do sistema (Projeção de Faturamento Anual, Crescimento
 * de Receita YoY, e os próximos): os mesmos tamanhos de texto, a mesma
 * proporção e o mesmo respiro. Antes cada gráfico tinha os seus números.
 *
 *   • CHART_ALTURA   — altura do desenho: 210px no celular, 400px a partir de sm.
 *   • <ChartKpis />  — os números acima do gráfico. No celular ficam em 3
 *                      colunas na MESMA linha (rótulo 11px, valor 14px); a
 *                      partir de sm voltam ao tamanho grande, lado a lado.
 */
export const CHART_ALTURA = "h-[210px] sm:h-[400px]";

export interface ChartKpi {
  label: string;
  value: string;
  /** Cor da barrinha à esquerda (a mesma da série no gráfico). */
  color: string;
  /** Detalhe depois do valor (ex.: a variação %). No celular desce pra baixo do valor. */
  extra?: ReactNode;
}

export function ChartKpis({ items, className }: { items: ChartKpi[]; className?: string }) {
  return (
    <div className={cn("mb-6 grid grid-cols-3 gap-3 sm:mb-10 sm:flex sm:flex-wrap sm:gap-10", className)}>
      {items.map((kpi) => (
        <div key={kpi.label} className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <div className="h-10 w-0.5 shrink-0 rounded-full sm:h-12" style={{ backgroundColor: kpi.color }} />
            <div className="flex min-w-0 flex-col gap-1.5 sm:gap-2">
              <div className="text-[11px] font-medium leading-tight text-white/40 sm:text-sm">{kpi.label}</div>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2.5">
                <span className="whitespace-nowrap text-sm font-semibold leading-none tracking-tight text-white sm:text-2xl sm:tracking-normal">
                  {kpi.value}
                </span>
                {kpi.extra}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

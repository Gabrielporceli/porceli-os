import { formatCurrency, formatNumber } from '../../../lib/format';
import type { Tone } from './nodeStyle';

interface NodeMetricsProps {
  tone: Tone;
  people?: number;
  cost?: number;
  revenue?: number;
  costPerPerson?: number;
  accumulatedCost?: number;
  accumulatedPerPerson?: number;
  profit?: number;
  maxCac?: number;
  /** Fonte de tráfego: mostra o custo por visita. */
  isTraffic?: boolean;
  /** Passo de lead: mostra o custo por lead. */
  isLead?: boolean;
  showPeople?: boolean;
  showCost?: boolean;
  showRevenue?: boolean;
}

/** Métricas no padrão do Dashboard: o número de pessoas em destaque (peso
 *  máximo), o resto em linhas pequenas com o valor em negrito. Verde para o
 *  que é ganho, vermelho para o que é perda. Cada métrica pode ser escondida
 *  por card. */
export function NodeMetrics({
  tone, people, cost, revenue, costPerPerson, accumulatedCost, accumulatedPerPerson, profit, maxCac, isTraffic, isLead,
  showPeople = true, showCost = true, showRevenue = true,
}: NodeMetricsProps) {
  const peopleVisible = showPeople && people !== undefined;
  const costVisible = showCost && (cost ?? 0) > 0;
  const revenueVisible = showRevenue && revenue !== undefined;

  // Só vale mostrar o acumulado quando há gasto antes deste card.
  const upstream = (accumulatedCost ?? 0) - (cost ?? 0) > 0;
  const isSale = maxCac !== undefined;
  // Custo por pessoa só onde alguém decide com ele: visita (tráfego), lead e
  // cliente (CAC). Nos passos do meio ele só cresceria a cada etapa, porque o
  // gasto é dividido por cada vez menos gente — e não diz nada útil.
  const showUpstream = upstream && showCost && (isLead || isSale) && accumulatedPerPerson !== undefined;
  const line = `text-[11px] leading-tight ${tone.muted}`;
  const strong = `font-bold ${tone.text}`;

  if (!peopleVisible && !costVisible && !revenueVisible) return null;

  return (
    <div className="mt-2.5 space-y-0.5">
      {peopleVisible && (
        <p className="flex items-baseline gap-1.5">
          <span className={`text-2xl font-black leading-none tabular-nums tracking-tight ${tone.text}`}>{formatNumber(people!)}</span>
          <span className={`text-[9px] font-black uppercase tracking-widest ${tone.caption}`}>pessoas</span>
        </p>
      )}
      {costVisible && (
        <p className={`${line} pt-1`}>
          <span className={strong}>{formatCurrency(cost ?? 0)}</span> gasto
          {isTraffic && costPerPerson !== undefined && <> · {formatCurrency(costPerPerson)}/visita</>}
        </p>
      )}
      {showUpstream && (
        <p className={line} title="Tudo o que foi gasto até chegar neste passo">
          <span className={strong}>{formatCurrency(accumulatedCost!)}</span> até aqui
        </p>
      )}
      {showUpstream && isLead && !isSale && (
        <p className={line} title="Gasto até aqui ÷ leads: o custo de cada lead, medido uma vez, neste passo">
          CPL <span className={`font-black ${tone.text}`}>{formatCurrency(accumulatedPerPerson!)}</span>
        </p>
      )}
      {isSale && accumulatedPerPerson !== undefined && (
        <p className={line} title="Custo para conquistar cada cliente, comparado ao máximo que o ticket e a margem permitem">
          CAC{' '}
          <span className={`font-black ${accumulatedPerPerson > maxCac! ? tone.down : tone.up}`}>
            {formatCurrency(accumulatedPerPerson)}
          </span>{' '}
          · máx {formatCurrency(maxCac!)}
        </p>
      )}
      {revenueVisible && (
        <p className={line}>
          <span className={`font-black ${tone.up}`}>{formatCurrency(revenue!)}</span> receita
          {(accumulatedCost ?? cost ?? 0) > 0 && <> · {(revenue! / (accumulatedCost ?? cost!)).toFixed(2)}x</>}
        </p>
      )}
      {revenueVisible && profit !== undefined && (
        <p className={line}>
          <span className={`font-black ${profit >= 0 ? tone.up : tone.down}`}>{formatCurrency(profit)}</span> lucro
        </p>
      )}
    </div>
  );
}

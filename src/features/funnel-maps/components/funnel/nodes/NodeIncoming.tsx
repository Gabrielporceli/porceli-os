import type { FunnelIncoming } from '../../../types/funnel';
import { formatNumber } from '../../../lib/format';
import { useFunnelActions } from '../funnelContext';
import type { Scenario } from '../../../lib/scenarios';
import type { Tone } from './nodeStyle';

/** Faixa anexada ao topo do card com as conexões que chegam nele: de onde
 *  vem, a taxa (editável aqui mesmo) e quantas pessoas chegam por cada uma.
 *  Só aparece quando o card recebe alguma conexão. */
export function NodeIncoming({
  incoming, tone, scenario = 'mid', className = '',
}: { incoming?: FunnelIncoming[]; tone: Tone; scenario?: Scenario; className?: string }) {
  const { setEdgeRate } = useFunnelActions();
  if (!incoming || incoming.length === 0) return null;

  return (
    <div className={`space-y-1 border-b ${tone.strip} ${className}`}>
      {incoming.map((i) => (
        <div key={i.edgeId} className="flex items-center gap-1.5 text-[10px]">
          <span className={`min-w-0 flex-1 truncate ${tone.caption}`} title={i.sourceLabel}>
            {i.sourceLabel || 'Origem'}
          </span>
          <span className={`nodrag nopan flex shrink-0 items-center rounded-md px-1.5 ${tone.pill}`}>
            <input
              type="text"
              inputMode="numeric"
              maxLength={3}
              value={Math.round(i.rate * 10) / 10}
              title={
                scenario === 'mid'
                  ? 'Cenário médio: editar aqui move o pessimista e o otimista juntos'
                  : scenario === 'real'
                    ? 'Taxa real. Enquanto não for preenchida, vale o médio'
                    : undefined
              }
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '');
                setEdgeRate(i.edgeId, scenario, digits === '' ? 0 : Math.min(100, Number(digits)));
              }}
              className="w-8 bg-transparent py-0.5 text-right font-black tabular-nums outline-none"
            />
            <span className="font-black">%</span>
          </span>
          <span className={`w-9 text-right font-black tabular-nums ${tone.text}`}>{formatNumber(i.people)}</span>
        </div>
      ))}
    </div>
  );
}

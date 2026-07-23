import { formatCurrency, formatNumber } from '../../../lib/format';

interface NodeMetricsProps {
  people?: number;
  cost?: number;
  revenue?: number;
  costPerPerson?: number;
  showPeople?: boolean;
  showCost?: boolean;
  showRevenue?: boolean;
}

/** Shared metrics footer for the white node cards: "Pessoas" caption + big
 *  number, plus optional spend/revenue pills — the clean hierarchy the
 *  reference uses inside each card. Each metric can be toggled off per node. */
export function NodeMetrics({ people, cost, revenue, costPerPerson, showPeople = true, showCost = true, showRevenue = true }: NodeMetricsProps) {
  const peopleVisible = showPeople && people !== undefined;
  const costVisible = showCost && (cost ?? 0) > 0;
  const revenueVisible = showRevenue && revenue !== undefined;

  if (!peopleVisible && !costVisible && !revenueVisible) return null;

  return (
    <div className="flex flex-col items-center px-2 pb-2 pt-1">
      {peopleVisible && (
        <>
          <span className="text-[8px] font-semibold uppercase tracking-wide text-porceli-gray-400">Pessoas</span>
          <span className="text-lg font-bold leading-none tabular-nums text-porceli-gray-900">{formatNumber(people!)}</span>
        </>
      )}
      {costVisible && (
        <div className="mt-1.5 w-full rounded-md bg-porceli-gray-100 px-2 py-1 text-center">
          <span className="block text-[8px] font-semibold uppercase tracking-wide text-porceli-gray-400">Gasto</span>
          <span className="text-xs font-bold text-orange-500">{formatCurrency(cost ?? 0)}</span>
          {costPerPerson !== undefined && (
            <span className="block text-[8px] font-medium text-porceli-gray-400">
              {formatCurrency(costPerPerson)} / pessoa
            </span>
          )}
        </div>
      )}
      {revenueVisible && (
        <span className="mt-1.5 w-full rounded-md bg-emerald-500 px-2 py-1 text-center text-xs font-bold text-white">
          {formatCurrency(revenue!)}
        </span>
      )}
    </div>
  );
}

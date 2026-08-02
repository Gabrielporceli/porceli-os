import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { CATEGORY_DEFS, findVariant, type FunnelNodeData, type FunnelNodeComputed } from '../../../types/funnel';
import { useFunnelActions } from '../funnelContext';
import { NodeMetrics } from './NodeMetrics';
import { SideHandles } from './SideHandles';

type FunnelNodeProps = NodeProps & {
  data: FunnelNodeData & { computed?: FunnelNodeComputed };
};

function FunnelNodeImpl({ id, data, selected }: FunnelNodeProps) {
  const { updateNodeData } = useFunnelActions();
  const def = CATEGORY_DEFS[data.category];
  const variant = findVariant(data.category, data.variant);
  const Icon = variant.icon;
  const computed = data.computed;
  const isDiamond = data.category === 'action';

  return (
    <div className="group flex w-32 flex-col items-center">
      <input
        value={data.label}
        placeholder={variant.label}
        onChange={(e) => updateNodeData(id, { label: e.target.value })}
        className="nodrag mb-1 w-full truncate bg-transparent text-center text-[11px] font-semibold text-porceli-gray-300 outline-none placeholder:text-porceli-gray-500"
      />

      {/* Card — handles sit on the rectangle edge, so the diamond/circle shape
          inside never distorts the connection point. */}
      <div
        className={`relative w-full rounded-xl border bg-white shadow-lg transition-shadow ${
          selected ? 'border-porceli-purpleLight ring-2 ring-porceli-purpleLight/40' : 'border-black/5'
        }`}
      >
        <SideHandles color={def.color} selected={selected} />

        <div className="flex justify-center pt-3">
          <div className="relative">
            <div
              className={`flex h-12 w-12 items-center justify-center shadow-md ${isDiamond ? 'rotate-45 rounded-lg' : 'rounded-full'}`}
              style={{ background: variant.color ?? def.color }}
            >
              <Icon size={20} color="white" strokeWidth={2} className={isDiamond ? '-rotate-45' : ''} />
            </div>
            {variant.paid && (
              <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-[9px] font-bold text-white">
                $
              </span>
            )}
          </div>
        </div>

        <NodeMetrics
          people={computed?.people}
          cost={data.cost}
          revenue={computed?.revenue}
          costPerPerson={computed?.costPerPerson}
          showPeople={data.showPeople}
          showCost={data.showCost}
          showRevenue={data.showRevenue}
        />
      </div>
    </div>
  );
}

export const FunnelNode = memo(FunnelNodeImpl);

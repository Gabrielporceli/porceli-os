import { memo } from 'react';
import { NodeToolbar, Position, type NodeProps } from '@xyflow/react';
import { CATEGORY_DEFS, findVariant, type FunnelNodeData, type FunnelNodeComputed } from '../../../types/funnel';
import { useFunnelActions } from '../funnelContext';
import { NodeMetrics } from './NodeMetrics';
import { SideHandles } from './SideHandles';
import { NodeFields } from './NodeFields';
import { NodeIncoming } from './NodeIncoming';
import { EditableText } from './EditableText';
import { cardSurface, POPOVER_SURFACE, SELECTED_OUTLINE, toneFor } from './nodeStyle';
import type { Scenario } from '../../../lib/scenarios';

type FunnelNodeProps = NodeProps & {
  data: FunnelNodeData & { computed?: FunnelNodeComputed; warning?: string; showFields?: boolean; scenario?: Scenario; showCpl?: boolean };
};

function FunnelNodeImpl({ id, data, selected }: FunnelNodeProps) {
  const { updateNodeData } = useFunnelActions();
  const def = CATEGORY_DEFS[data.category];
  const variant = findVariant(data.category, data.variant);
  const Icon = variant.icon;
  const computed = data.computed;
  const tone = toneFor(data);

  return (
    <div className="group relative w-40">
      {data.warning && (
        <span
          title={data.warning}
          className="absolute -right-1.5 -top-1.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-white shadow"
        >
          !
        </span>
      )}
      <SideHandles color={def.color} selected={selected} />

      <div className={`relative overflow-hidden px-3.5 py-3 ${cardSurface(tone)} ${selected ? SELECTED_OUTLINE : ''}`}>
        <NodeIncoming incoming={computed?.incoming} tone={tone} scenario={data.scenario} className="-mx-3.5 -mt-3 mb-2.5 px-3.5 py-1.5" />

        <div className="flex items-center gap-2">
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
            style={{ background: variant.color ?? def.color }}
          >
            <Icon size={12} color="white" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <EditableText
              value={data.label}
              placeholder={variant.label}
              onChange={(v) => updateNodeData(id, { label: v })}
              className={`text-[12px] font-bold ${tone.text}`}
              emptyClassName={tone.caption}
            />
          </div>
        </div>

        <NodeMetrics
          tone={tone}
          people={computed?.people}
          cost={data.cost}
          revenue={computed?.revenue}
          costPerPerson={computed?.costPerPerson}
          accumulatedCost={computed?.accumulatedCost}
          accumulatedPerPerson={computed?.accumulatedPerPerson}
          profit={computed?.profit}
          maxCac={computed?.maxCac}
          isTraffic={data.category === 'traffic'}
          isLead={Boolean(data.showCpl)}
          showPeople={data.showPeople}
          showCost={data.showCost}
          showRevenue={data.showRevenue}
        />
      </div>

      <NodeToolbar isVisible={Boolean(data.showFields)} position={Position.Right} align="start" offset={14} className="nodrag nopan">
        <div className={`${POPOVER_SURFACE} w-60 p-3.5`}>
          <NodeFields id={id} data={data} scenario={data.scenario ?? 'mid'} isPage={false} hasRevenue={computed?.revenue !== undefined} />
        </div>
      </NodeToolbar>
    </div>
  );
}

export const FunnelNode = memo(FunnelNodeImpl);

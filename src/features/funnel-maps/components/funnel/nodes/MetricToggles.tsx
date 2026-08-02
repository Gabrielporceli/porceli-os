interface MetricTogglesProps {
  showPeople: boolean;
  showCost: boolean;
  showRevenue: boolean;
  hasRevenue: boolean;
  onToggle: (patch: Record<string, unknown>) => void;
}

/** Lets the user pick which metrics show on the card face — everything is
 *  still tracked and computed, this only controls what's visible. */
export function MetricToggles({ showPeople, showCost, showRevenue, hasRevenue, onToggle }: MetricTogglesProps) {
  return (
    <div className="flex flex-col gap-1 border-t border-white/5 pt-1.5">
      <span className="text-[10px] text-white/40">Mostrar no card</span>
      <div className="flex gap-1">
        <Chip label="Pessoas" active={showPeople} onClick={() => onToggle({ showPeople: !showPeople })} />
        <Chip label="Gasto" active={showCost} onClick={() => onToggle({ showCost: !showCost })} />
        {hasRevenue && <Chip label="Receita" active={showRevenue} onClick={() => onToggle({ showRevenue: !showRevenue })} />}
      </div>
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
        active ? 'bg-primary text-white' : 'bg-white/[0.05] text-white/40 hover:text-white/70'
      }`}
    >
      {label}
    </button>
  );
}

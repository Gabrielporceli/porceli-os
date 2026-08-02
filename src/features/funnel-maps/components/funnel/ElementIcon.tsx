import { CATEGORY_DEFS, type ElementVariant, type FunnelNodeCategory } from '../../types/funnel';

interface ElementIconProps {
  category: FunnelNodeCategory;
  variant: ElementVariant;
  size?: number;
}

/** Renders one library element the same way it appears on the canvas: a circle
 *  for traffic/offline, a diamond for actions, a browser-mockup card for pages. */
export function ElementIcon({ category, variant, size = 44 }: ElementIconProps) {
  const def = CATEGORY_DEFS[category];
  const Icon = variant.icon;
  const color = variant.color ?? def.color;

  if (category === 'page') {
    return (
      <div
        className="overflow-hidden rounded border bg-white/95 shadow-sm"
        style={{ width: size, height: size * 1.15, borderColor: `${def.color}55` }}
      >
        <div className="flex items-center gap-[3px] px-1 py-[3px]" style={{ background: `${def.color}22` }}>
          <span className="h-1 w-1 rounded-full bg-porceli-gray-400" />
          <span className="h-1 w-1 rounded-full bg-porceli-gray-400" />
          <span className="h-1 w-1 rounded-full bg-porceli-gray-400" />
        </div>
        <div className="flex flex-col gap-[3px] px-1.5 py-1.5">
          <div className="flex items-center gap-1">
            <Icon size={9} color={def.color} strokeWidth={2} className="shrink-0" />
            <span className="h-[3px] flex-1 rounded-full bg-porceli-gray-300" />
          </div>
          <span className="h-[3px] w-4/5 rounded-full bg-porceli-gray-200" />
          <span className="mt-0.5 h-2 w-full rounded-[2px]" style={{ background: def.color }} />
        </div>
      </div>
    );
  }

  const isDiamond = category === 'action';
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <div
        className={`flex items-center justify-center border border-white/10 shadow-md ${isDiamond ? 'rotate-45 rounded-md' : 'rounded-full'}`}
        style={{ width: size * 0.82, height: size * 0.82, background: color }}
      >
        <Icon size={size * 0.4} color="white" strokeWidth={2} className={isDiamond ? '-rotate-45' : ''} />
      </div>
      {variant.paid && (
        <span
          className="absolute bottom-0 right-0 flex items-center justify-center rounded-full border-2 border-white bg-emerald-500 font-bold text-white"
          style={{ width: size * 0.32, height: size * 0.32, fontSize: size * 0.2 }}
        >
          $
        </span>
      )}
    </div>
  );
}

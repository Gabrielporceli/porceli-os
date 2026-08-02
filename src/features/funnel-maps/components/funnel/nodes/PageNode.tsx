import { memo, useCallback, useEffect, useState } from 'react';
import type { NodeProps } from '@xyflow/react';
import { RefreshCw } from 'lucide-react';
import { CATEGORY_DEFS, findVariant, type FunnelNodeData, type FunnelNodeComputed } from '../../../types/funnel';
import { useFunnelActions } from '../funnelContext';
import { NodeMetrics } from './NodeMetrics';
import { SideHandles } from './SideHandles';

type PageNodeProps = NodeProps & {
  data: FunnelNodeData & { computed?: FunnelNodeComputed };
};

function normalizeUrl(url: string): string {
  return /^https?:\/\//.test(url) ? url : `https://${url}`;
}

/** Live screenshot of the page via WordPress mShots (free, no key).
 *  Sends the URL to a third-party screenshot service; the first load may
 *  return a blank placeholder while the shot is generated. */
function screenshotSrc(url: string): string {
  return `https://s.wordpress.com/mshots/v1/${encodeURIComponent(normalizeUrl(url))}?w=600&h=400`;
}

type SiteStatus = 'idle' | 'checking' | 'up' | 'down';

/** Best-effort "is it online" check. A no-cors fetch can't read the HTTP
 *  status — a resolved promise just means *some* response came back, and a
 *  rejection can also mean a strict CORS/CSP policy blocked us, not that the
 *  site is down. It's a heuristic, not a real uptime monitor. */
function useSiteStatus(url: string | undefined) {
  const [status, setStatus] = useState<SiteStatus>('idle');

  const check = useCallback(() => {
    if (!url) {
      setStatus('idle');
      return;
    }
    setStatus('checking');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    fetch(normalizeUrl(url), { mode: 'no-cors', cache: 'no-store', signal: controller.signal })
      .then(() => setStatus('up'))
      .catch(() => setStatus('down'))
      .finally(() => clearTimeout(timer));
  }, [url]);

  useEffect(() => {
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return { status, check };
}

function PageNodeImpl({ id, data, selected }: PageNodeProps) {
  const { updateNodeData } = useFunnelActions();
  const def = CATEGORY_DEFS.page;
  const variant = findVariant('page', data.variant);
  const Icon = variant.icon;
  const computed = data.computed;

  const [imgError, setImgError] = useState(false);
  useEffect(() => setImgError(false), [data.url]);
  const showScreenshot = !!data.url && !imgError;

  const { status: siteStatus, check: recheckSite } = useSiteStatus(data.url);

  return (
    <div className="group flex w-40 flex-col items-center">
      <input
        value={data.label}
        placeholder={variant.label}
        onChange={(e) => updateNodeData(id, { label: e.target.value })}
        className="nodrag mb-1 w-full truncate bg-transparent text-center text-[11px] font-semibold text-porceli-gray-300 outline-none placeholder:text-porceli-gray-500"
      />

      <div
        className={`relative w-full overflow-hidden rounded-xl border bg-white shadow-lg transition-shadow ${
          selected ? 'border-porceli-purpleLight ring-2 ring-porceli-purpleLight/40' : 'border-black/5'
        }`}
      >
        <SideHandles color={def.color} selected={selected} />

        {/* Browser chrome */}
        <div className="flex items-center gap-1 border-b border-porceli-gray-100 bg-porceli-gray-50 px-2 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-porceli-gray-300" />
          <span className="h-1.5 w-1.5 rounded-full bg-porceli-gray-300" />
          <span className="h-1.5 w-1.5 rounded-full bg-porceli-gray-300" />
          <span className="ml-1 min-w-0 flex-1 truncate rounded bg-white px-1.5 py-0.5 text-[8px] text-porceli-gray-500">
            {data.url ? normalizeUrl(data.url).replace(/^https?:\/\//, '') : variant.label}
          </span>
          {data.url && (
            <>
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  siteStatus === 'up'
                    ? 'bg-emerald-500'
                    : siteStatus === 'down'
                      ? 'bg-red-500'
                      : 'animate-pulse bg-porceli-gray-300'
                }`}
                title={
                  siteStatus === 'up'
                    ? 'Site respondeu (verificação simples, não é monitoramento real)'
                    : siteStatus === 'down'
                      ? 'Não respondeu — pode estar fora do ar ou apenas bloqueando a verificação'
                      : 'Verificando…'
                }
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  recheckSite();
                }}
                className="nodrag shrink-0 text-porceli-gray-400 hover:text-porceli-gray-700"
                title="Verificar novamente"
              >
                <RefreshCw size={9} className={siteStatus === 'checking' ? 'animate-spin' : ''} />
              </button>
            </>
          )}
        </div>

        {/* Screenshot or wireframe placeholder */}
        {showScreenshot ? (
          <img
            src={screenshotSrc(data.url!)}
            alt=""
            className="h-24 w-full bg-porceli-gray-100 object-cover object-top"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-24 flex-col justify-center gap-1.5 px-3" style={{ background: `${def.color}0d` }}>
            <div className="flex items-center gap-1.5">
              <Icon size={13} color={def.color} strokeWidth={2} className="shrink-0" />
              <span className="h-1.5 flex-1 rounded-full bg-porceli-gray-200" />
            </div>
            <span className="h-1.5 w-4/5 rounded-full bg-porceli-gray-200" />
            <span className="h-1.5 w-3/5 rounded-full bg-porceli-gray-200" />
            <span
              className="mt-1 flex h-4 items-center justify-center rounded text-[7px] font-bold uppercase tracking-wide text-white"
              style={{ background: def.color }}
            >
              Saiba mais
            </span>
          </div>
        )}

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

export const PageNode = memo(PageNodeImpl);

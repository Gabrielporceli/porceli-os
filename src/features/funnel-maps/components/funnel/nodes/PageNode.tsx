import { memo, useCallback, useEffect, useState } from 'react';
import { NodeToolbar, Position, type NodeProps } from '@xyflow/react';
import { Refresh } from 'iconsax-react';
import { CATEGORY_DEFS, findVariant, type FunnelNodeData, type FunnelNodeComputed } from '../../../types/funnel';
import { useFunnelActions } from '../funnelContext';
import { NodeMetrics } from './NodeMetrics';
import { SideHandles } from './SideHandles';
import { NodeFields } from './NodeFields';
import { NodeIncoming } from './NodeIncoming';
import { cardSurface, POPOVER_SURFACE, SELECTED_OUTLINE, toneFor } from './nodeStyle';
import type { Scenario } from '../../../lib/scenarios';
import { EditableText } from './EditableText';
import { isPreviewDisabled } from '../../../lib/pagePreview';

type PageNodeProps = NodeProps & {
  data: FunnelNodeData & { computed?: FunnelNodeComputed; warning?: string; showFields?: boolean; scenario?: Scenario; showCpl?: boolean };
};

function normalizeUrl(url: string): string {
  return /^https?:\/\//.test(url) ? url : `https://${url}`;
}

/** Live screenshot of the page via WordPress mShots (free, no key).
 *  Sends the URL to a third-party screenshot service; the first load may
 *  return a blank placeholder while the shot is generated. */
function screenshotSrc(url: string, attempt = 0): string {
  // `_r` só muda o endereço pra o navegador pedir de novo: a primeira resposta
  // do serviço é uma imagem de espera, e a captura real chega depois.
  return `https://s.wordpress.com/mshots/v1/${encodeURIComponent(normalizeUrl(url))}?w=600&h=400${attempt ? `&_r=${attempt}` : ''}`;
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
  const tone = toneFor(data);

  const [imgError, setImgError] = useState(false);
  useEffect(() => setImgError(false), [data.url]);
  const previewOff = isPreviewDisabled(data);
  const showScreenshot = !!data.url && !imgError && !previewOff;

  // Pede a imagem de novo algumas vezes: o serviço leva de segundos a minutos
  // pra gerar a captura e devolve uma imagem de espera enquanto isso.
  const [attempt, setAttempt] = useState(0);
  useEffect(() => setAttempt(0), [data.url]);
  useEffect(() => {
    const delays = [6000, 12000, 24000, 48000];
    if (!showScreenshot || attempt >= delays.length) return;
    const t = setTimeout(() => setAttempt((a) => a + 1), delays[attempt]);
    return () => clearTimeout(t);
  }, [attempt, showScreenshot, data.url]);

  const { status: siteStatus, check: recheckSite } = useSiteStatus(data.url);

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
      <div className={`relative w-full overflow-hidden ${cardSurface(tone)} ${selected ? SELECTED_OUTLINE : ''}`}>
        <NodeIncoming incoming={computed?.incoming} tone={tone} scenario={data.scenario} className="px-3.5 py-1.5" />

        {/* Browser chrome */}
        <div className={`flex items-center gap-1.5 border-b px-3.5 py-1 ${tone.chrome}`}>
          <span className={`min-w-0 flex-1 truncate text-[9px] ${tone.muted}`}>
            {data.url ? normalizeUrl(data.url).replace(/^https?:\/\//, '') : variant.label}
          </span>
          {data.url && (
            <>
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  siteStatus === 'up'
                    ? 'bg-green-500'
                    : siteStatus === 'down'
                      ? 'bg-red-500'
                      : 'animate-pulse bg-black/25'
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
                className={`nodrag shrink-0 ${tone.caption}`}
                title="Verificar novamente"
              >
                <Refresh size={9} className={siteStatus === 'checking' ? 'animate-spin' : ''} />
              </button>
            </>
          )}
        </div>

        {/* Screenshot or wireframe placeholder */}
        {showScreenshot ? (
          <img
            src={screenshotSrc(data.url!, attempt)}
            alt=""
            className="h-20 w-full bg-black/5 object-cover object-top"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-20 flex-col justify-center gap-1.5 px-3.5">
            <div className="flex items-center gap-1.5">
              <Icon size={13} color={def.color} strokeWidth={2} className="shrink-0" />
              <span className={`h-1.5 flex-1 rounded-full ${tone.sketch}`} />
            </div>
            <span className={`h-1.5 w-4/5 rounded-full ${tone.sketch}`} />
            <span className={`h-1.5 w-3/5 rounded-full ${tone.sketch}`} />
            <span
              className="mt-1 flex h-4 items-center justify-center rounded text-[7px] font-bold uppercase tracking-wide text-white"
              style={{ background: def.color }}
            >
              Saiba mais
            </span>
          </div>
        )}

        <div className="px-3.5 py-3">
          <EditableText
            value={data.label}
            placeholder={variant.label}
            onChange={(v) => updateNodeData(id, { label: v })}
            className={`text-[12px] font-bold ${tone.text}`}
            emptyClassName={tone.caption}
          />
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
      </div>
      <NodeToolbar isVisible={Boolean(data.showFields)} position={Position.Right} align="start" offset={14} className="nodrag nopan">
        <div className={`${POPOVER_SURFACE} w-60 p-3.5`}>
          <NodeFields id={id} data={data} scenario={data.scenario ?? 'mid'} isPage={true} hasRevenue={computed?.revenue !== undefined} />
        </div>
      </NodeToolbar>
    </div>
  );
}

export const PageNode = memo(PageNodeImpl);

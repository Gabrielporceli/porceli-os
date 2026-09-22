import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, Category, Clock, DocumentText, DollarCircle, Filter, Flash, Global as Globe, Logout, Profile2User } from 'iconsax-react';
import { cn } from "@/lib/utils";
import { appBackgroundStyle } from "@/lib/appBackground";
import {
  MOBILE_GAP,
  MOBILE_SLOT,
  MOBILE_WINDOW,
  PILL_DEFAULTS,
  idlePillGeom,
  transferPillGeom,
  type PillTuning,
} from "@/components/Layout/mobilePillGeometry";
import { MobilePillBlob } from "@/components/Layout/MobilePillBlob";
import { Header } from "@/components/Layout/Header";

/**
 * /dev/pill — laboratório da pílula do menu mobile.
 *
 * Reproduz a barra (mesmo material, mesmas medidas: janela de 216px,
 * slots de 40px, vãos de 4px) e deixa você andar o progresso p da
 * transferência frame a frame, tocar em câmera lenta, dar zoom e mexer
 * em cada constante da geometria. Usa EXATAMENTE a mesma função
 * (transferPillGeom) e o mesmo componente de desenho (MobilePillBlob)
 * do Header — o que você calibrar aqui é o que roda no menu; é só copiar
 * os valores pra PILL_DEFAULTS em mobilePillGeometry.ts.
 *
 * Página pública (sem login) e fora do CRMLayout: ferramenta de design,
 * não parte do produto.
 */

// Mesmas medidas do Header (mobilePillGeometry.ts) — o lab tem que
// reproduzir a faixa real, não uma parecida.
const SLOT = MOBILE_SLOT;
const GAP = MOBILE_GAP;
const PITCH = SLOT + GAP;
const WINDOW_W = MOBILE_WINDOW;

const ICONS = [Category, Calendar, Filter, Profile2User, DocumentText, DollarCircle, Flash, Clock];

type TuneKey = keyof PillTuning;
const TUNE_META: { key: TuneKey; label: string; hint: string; min: number; max: number; step: number }[] = [
  { key: "NECK_RISE_AT", label: "Pescoço nasce até", hint: "p em que o pescoço atinge a altura cheia", min: 0.02, max: 0.6, step: 0.01 },
  { key: "BACK_START_AT", label: "Trás começa a encolher em", hint: "bolha antiga fica cheia até aqui", min: 0, max: 0.9, step: 0.01 },
  { key: "FRONT_DONE_AT", label: "Frente cheia em", hint: "bolha nova termina de crescer (pescoço começa a pinçar)", min: 0.05, max: 0.95, step: 0.01 },
  { key: "SWITCH_AT", label: "Troca de âncora em", hint: "bolha antiga some; a partir daqui só a nova", min: 0.5, max: 1, step: 0.01 },
  { key: "NECK_H", label: "Grossura do pescoço", hint: "fração da altura da bolha (o gooey engorda/afina por cima disso)", min: 0.05, max: 1, step: 0.01 },
  { key: "GOO_BLUR", label: "Gooey: blur", hint: "stdDeviation do feGaussianBlur (px) — mais = mais grudento/redondo", min: 0, max: 14, step: 0.25 },
  { key: "GOO_K", label: "Gooey: ganho do alfa", hint: "feColorMatrix (linha do alfa) — mais = borda mais dura", min: 4, max: 40, step: 0.5 },
  { key: "GOO_O", label: "Gooey: corte do alfa", hint: "quanto maior, mais cedo o fio estala (passo fino: define o raio efetivo da silhueta)", min: 1, max: 20, step: 0.02 },
];

export default function PillLab() {
  const [p, setP] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [tune, setTune] = useState<PillTuning>({ ...PILL_DEFAULTS });
  const [zoom, setZoom] = useState(2);
  const [playing, setPlaying] = useState(false);
  const [seconds, setSeconds] = useState(4);
  const [pingPong, setPingPong] = useState(true);
  const [smooth, setSmooth] = useState(true);
  // Card de comparação: sobrepõe o botão CSS real e o SVG.
  // "difference" = se os dois forem idênticos, o resultado é preto puro.
  const [overlay, setOverlay] = useState(false);
  const [diff, setDiff] = useState(false);
  const [svgOpacity, setSvgOpacity] = useState(1);
  // Modo desktop: lá os ícones não rolam — a pílula salta de um item pro
  // outro, e o salto pode ser de vários slots (ex.: Dashboard →
  // Agendamentos). `dist` simula isso: 1 = vizinhos (como no mobile).
  const [desktop, setDesktop] = useState(false);
  // Monta o Header DE VERDADE (mesmo componente do app) pra testar o
  // comportamento real — scroll, loop infinito, troca de página — sem
  // precisar de login. Só aparece sob demanda pra não confundir o palco.
  const [realHeader, setRealHeader] = useState(false);
  const [dist, setDist] = useState(3);
  const rafRef = useRef<number | null>(null);
  const dirRef = useRef(1);

  // Play: varre p de 0 → 1 em `seconds` (ping-pong opcional).
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setP((prev) => {
        let next = prev + (dirRef.current * dt) / seconds;
        if (next >= 1) {
          if (pingPong) { dirRef.current = -1; next = 1; } else next = 0;
        } else if (next <= 0) {
          dirRef.current = 1; next = 0;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing, seconds, pingPong]);

  // Posições dos ícones, como na roleta real no meio do gesto:
  // p = 0 → âncora e candidato equidistantes do centro; p = 1 → candidato
  // no centro exato. dir = 1: candidato vem da direita.
  // Mobile: a faixa rola sob a janela — âncora e candidato se movem
  // (p = 0 equidistantes do centro, p = 1 candidato no centro).
  // Desktop: os ícones ficam PARADOS; só a pílula viaja entre eles.
  const center = WINDOW_W / 2;
  const stageW = desktop ? WINDOW_W + dist * PITCH : WINDOW_W;
  const anchorC = desktop ? SLOT / 2 + 8 : center - dir * (PITCH / 2 + p * PITCH / 2);
  const candC = desktop ? anchorC + dist * PITCH : center + dir * (PITCH / 2 - p * PITCH / 2);
  const ax = anchorC - SLOT / 2;
  const nx = candC - SLOT / 2;

  // Desktop anima p no tempo com easing (ver Header); aqui o slider é o
  // p já "eased", então basta escalar por SWITCH_AT como o Header faz.
  const pEff = desktop ? p * tune.SWITCH_AT : p;
  const geom = useMemo(
    () => (pEff >= tune.SWITCH_AT ? idlePillGeom(nx, SLOT) : transferPillGeom(ax, nx, SLOT, pEff, tune)),
    [ax, nx, pEff, tune]
  );

  // Ícones ao redor (índice 0 = âncora, 1 = candidato).
  const icons = useMemo(() => {
    const list: { k: number; Icon: typeof Category; x: number }[] = [];
    const range = desktop ? [0, dist + 1] : [-3, 4];
    for (let k = range[0]; k <= range[1]; k++) {
      const c = anchorC + (desktop ? 1 : dir) * k * PITCH;
      list.push({ k, Icon: ICONS[((k % ICONS.length) + ICONS.length) % ICONS.length], x: c - SLOT / 2 });
    }
    return list;
  }, [anchorC, dir, desktop, dist]);

  const switched = pEff >= tune.SWITCH_AT;
  const highlightedK = switched ? (desktop ? dist : 1) : 0;

  const step = (d: number) => setP((v) => Math.min(1, Math.max(0, +(v + d).toFixed(3))));

  const numbers = {
    "frente s": geom.front.s.toFixed(3),
    "trás s": geom.back.s.toFixed(3),
    "pescoço w": geom.neck.w.toFixed(1),
    "pescoço h": geom.neck.h.toFixed(1),
  };

  return (
    <div className="min-h-screen text-white relative">
      <div className="fixed inset-0" style={appBackgroundStyle} />
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-lg font-black tracking-tight">Laboratório — pílula do menu mobile</h1>
          <p className="text-white/40 text-sm mt-1">
            Mesma função e mesmo desenho do Header. Ajustou aqui, copia os valores pra{" "}
            <code className="text-white/60">PILL_DEFAULTS</code> em <code className="text-white/60">mobilePillGeometry.ts</code>.
          </p>
        </div>

        <div className="liquid-glass rounded-3xl p-5 space-y-3">
          <label className="flex items-center gap-2 text-white/70 cursor-pointer text-xs">
            <input type="checkbox" checked={realHeader} onChange={(e) => setRealHeader(e.target.checked)} className="accent-[#6829c0]" />
            Montar o Header real (mesmo componente do app — testa scroll e troca de página de verdade)
          </label>
          {realHeader && (
            <p className="text-white/35 text-[11px]">
              Ele se posiciona sozinho (topo no desktop, rodapé abaixo de 768px). A rota muda de verdade ao arrastar.
            </p>
          )}
        </div>
        {realHeader && <Header />}

        {/* ===== Palco ===== */}
        <div className="liquid-glass rounded-3xl p-6 overflow-x-auto">
          <div
            className="mx-auto"
            style={{ width: (desktop ? stageW + 176 : 392) * zoom, height: 64 * zoom + 24, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {/* Réplica do header mobile: logo | janela de 216px | sair */}
            <div
              className="liquid-glass h-16 flex items-center px-3 gap-1.5"
              style={{ width: desktop ? stageW + 176 : 392, transform: `scale(${zoom})`, transformOrigin: "center center", flexShrink: 0 }}
            >
              <div className="flex items-center shrink-0 pr-1.5 border-r border-white/5">
                <Globe className="w-7 h-7 text-white/80" />
              </div>

              <div className="relative shrink-0 mx-auto h-full" style={{ width: stageW }}>
                <MobilePillBlob geom={geom} windowW={stageW} slot={SLOT} tuning={tune} />
                {/* Ícones (só os que caem na janela) */}
                <div className="absolute inset-0 overflow-hidden z-20">
                  {icons.map(({ k, Icon, x }) => (
                    <div
                      key={k}
                      className="absolute top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center"
                      style={{ transform: `translate(${x}px, -50%)` }}
                    >
                      <Icon
                        className={cn(
                          "w-5 h-5",
                          smooth && "transition-colors duration-500",
                          k === highlightedK ? "lqg-text text-white" : "text-white/40"
                        )}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center shrink-0 pl-1.5 border-l border-white/5">
                <Logout className="w-5 h-5 text-white/40" />
              </div>
            </div>
          </div>
        </div>

        {/* ===== Referência de material ===== */}
        <div className="liquid-glass rounded-3xl p-5 space-y-4 overflow-x-auto">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="text-xs font-black uppercase tracking-widest text-white/50">
              CSS real (.lqg-lens--nav) × SVG gerado
            </div>
            <div className="flex items-center gap-4 flex-wrap text-xs">
              <label className="flex items-center gap-2 text-white/70 cursor-pointer">
                <input type="checkbox" checked={overlay} onChange={(e) => setOverlay(e.target.checked)} className="accent-[#6829c0]" />
                Sobrepor
              </label>
              <label className={cn("flex items-center gap-2 cursor-pointer", overlay ? "text-white/70" : "text-white/25")}>
                <input type="checkbox" checked={diff} disabled={!overlay} onChange={(e) => setDiff(e.target.checked)} className="accent-[#6829c0]" />
                Difference (preto = idêntico)
              </label>
              <label className={cn("space-y-1", overlay ? "text-white/70" : "text-white/25")}>
                <span>Opacidade do SVG: {svgOpacity.toFixed(2)}</span>
                <input
                  type="range" min={0} max={1} step={0.05} value={svgOpacity} disabled={!overlay}
                  onChange={(e) => setSvgOpacity(parseFloat(e.target.value))}
                  className="w-40 accent-[#6829c0] block"
                />
              </label>
            </div>
          </div>

          <div className="flex items-center justify-center gap-8" style={{ height: 64 * zoom + 8 }}>
            {overlay ? (
              <div style={{ width: 64 * zoom, height: 64 * zoom, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div
                  className="liquid-glass h-16 w-16 flex items-center justify-center relative"
                  style={{ transform: `scale(${zoom})`, transformOrigin: "center center", flexShrink: 0, isolation: "isolate" }}
                >
                  <span className="lqg-lens lqg-lens--nav absolute w-10 h-10 rounded-full" />
                  <div
                    className="absolute left-3 top-0 h-full w-10"
                    style={{ opacity: svgOpacity, mixBlendMode: diff ? "difference" : "normal" }}
                  >
                    <MobilePillBlob geom={idlePillGeom(0, SLOT)} windowW={SLOT} slot={SLOT} tuning={tune} />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center space-y-2">
                  <div style={{ width: 64 * zoom, height: 64 * zoom, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div className="liquid-glass h-16 w-16 flex items-center justify-center relative" style={{ transform: `scale(${zoom})`, transformOrigin: "center center", flexShrink: 0 }}>
                      <span className="lqg-lens lqg-lens--nav absolute w-10 h-10 rounded-full" />
                      <Calendar className="relative z-10 w-5 h-5 lqg-text text-white" />
                    </div>
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-white/40">CSS</div>
                </div>
                <div className="text-center space-y-2">
                  <div style={{ width: 64 * zoom, height: 64 * zoom, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div className="liquid-glass h-16 w-16 flex items-center justify-center relative" style={{ transform: `scale(${zoom})`, transformOrigin: "center center", flexShrink: 0 }}>
                      <div className="absolute left-3 top-0 h-full w-10">
                        <MobilePillBlob geom={idlePillGeom(0, SLOT)} windowW={SLOT} slot={SLOT} tuning={tune} />
                      </div>
                      <Calendar className="relative z-10 w-5 h-5 lqg-text text-white" />
                    </div>
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-white/40">SVG</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ===== Progresso ===== */}
        <div className="liquid-glass rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="text-xs font-black uppercase tracking-widest text-white/50">
              Progresso p = <span className="text-white tabular-nums">{p.toFixed(3)}</span>
              {switched && <span className="ml-2 text-primary">âncora trocou</span>}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {[-0.05, -0.01, 0.01, 0.05].map((d) => (
                <button key={d} onClick={() => step(d)} className="liquid-glass px-3 h-9 text-xs font-bold rounded-full hover:brightness-110">
                  {d > 0 ? `+${d}` : d}
                </button>
              ))}
              <button
                onClick={() => setPlaying((v) => !v)}
                className={cn("px-4 h-9 text-xs font-bold uppercase tracking-widest rounded-full", playing ? "btn-danger-glass liquid-glass" : "liquid-glass")}
              >
                {playing ? "Pausar" : "Play"}
              </button>
              <button onClick={() => { setPlaying(false); setP(0); dirRef.current = 1; }} className="liquid-glass px-3 h-9 text-xs font-bold rounded-full">
                Zerar
              </button>
            </div>
          </div>
          <input type="range" min={0} max={1} step={0.001} value={p} onChange={(e) => setP(parseFloat(e.target.value))} className="w-full accent-[#6829c0]" />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <label className="space-y-1">
              <span className="text-white/50">Duração do play: {seconds}s</span>
              <input type="range" min={0.5} max={15} step={0.5} value={seconds} onChange={(e) => setSeconds(parseFloat(e.target.value))} className="w-full accent-[#6829c0]" />
            </label>
            <label className="space-y-1">
              <span className="text-white/50">Zoom: {zoom.toFixed(1)}×</span>
              <input type="range" min={1} max={4} step={0.1} value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="w-full accent-[#6829c0]" />
            </label>
            <label className="flex items-center gap-2 text-white/70 cursor-pointer">
              <input type="checkbox" checked={pingPong} onChange={(e) => setPingPong(e.target.checked)} className="accent-[#6829c0]" />
              Vai e volta
            </label>
            <label className="flex items-center gap-2 text-white/70 cursor-pointer">
              <input type="checkbox" checked={smooth} onChange={(e) => setSmooth(e.target.checked)} className="accent-[#6829c0]" />
              Transição de cor dos ícones (500ms)
            </label>
          </div>

          <div className="flex items-center gap-3 text-xs flex-wrap">
            <label className="flex items-center gap-2 text-white/70 cursor-pointer mr-2">
              <input type="checkbox" checked={desktop} onChange={(e) => setDesktop(e.target.checked)} className="accent-[#6829c0]" />
              Modo desktop (ícones parados)
            </label>
            {desktop && (
              <label className="flex items-center gap-2 text-white/70">
                salto de
                <input
                  type="range" min={1} max={6} step={1} value={dist}
                  onChange={(e) => setDist(parseInt(e.target.value))}
                  className="w-28 accent-[#6829c0]"
                />
                <span className="tabular-nums text-white">{dist}</span> ícone(s)
              </label>
            )}
            <span className={cn("text-white/50", desktop && "opacity-30")}>Candidato vem da:</span>
            {([1, -1] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDir(d)}
                className={cn("px-3 h-8 rounded-full text-xs font-bold", dir === d ? "btn-primary-glass liquid-glass text-white" : "liquid-glass text-white/60")}
              >
                {d === 1 ? "direita →" : "← esquerda"}
              </button>
            ))}
            <span className="ml-auto flex gap-4 text-white/40 tabular-nums">
              {Object.entries(numbers).map(([k, v]) => (
                <span key={k}>{k}: <span className="text-white/70">{v}</span></span>
              ))}
            </span>
          </div>
        </div>

        {/* ===== Constantes ===== */}
        <div className="liquid-glass rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-widest text-white/50">Constantes da geometria</h2>
            <button onClick={() => setTune({ ...PILL_DEFAULTS })} className="liquid-glass px-3 h-8 text-xs font-bold rounded-full">
              Voltar ao padrão
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
            {TUNE_META.map(({ key, label, hint, min, max, step: st }) => (
              <label key={key} className="space-y-1 block">
                <div className="flex justify-between text-xs">
                  <span className="text-white/80">{label}</span>
                  <span className="text-white tabular-nums">{tune[key].toFixed(2)}</span>
                </div>
                <input
                  type="range" min={min} max={max} step={st} value={tune[key]}
                  onChange={(e) => setTune((t) => ({ ...t, [key]: parseFloat(e.target.value) }))}
                  className="w-full accent-[#6829c0]"
                />
                <div className="text-[11px] text-white/35">{hint} · <code>{key}</code></div>
              </label>
            ))}
          </div>
          <pre className="text-[11px] text-white/60 bg-black/30 rounded-xl p-3 overflow-x-auto">
{`export const PILL_DEFAULTS: PillTuning = {
  FRONT_DONE_AT: ${tune.FRONT_DONE_AT.toFixed(2)},
  BACK_START_AT: ${tune.BACK_START_AT.toFixed(2)},
  SWITCH_AT: ${tune.SWITCH_AT.toFixed(2)},
  NECK_H: ${tune.NECK_H.toFixed(2)},
  NECK_RISE_AT: ${tune.NECK_RISE_AT.toFixed(2)},
  GOO_BLUR: ${tune.GOO_BLUR},
  GOO_K: ${tune.GOO_K},
  GOO_O: ${tune.GOO_O},
};`}
          </pre>
        </div>
      </div>
    </div>
  );
}

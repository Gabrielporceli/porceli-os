import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Calendar, DollarCircle, Edit2, Flash, Profile2User, Refresh, TickCircle, Trash, Warning2 } from "iconsax-react";
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button";
import { Card } from "@/components/ui/card";
import { DeconstructedCard } from "@/components/ui/deconstructed-card";
import { StatsCard } from "@/components/Dashboard/StatsCard";
import { Switch } from "@/components/ui/switch";
import { PillTabs } from "@/components/ui/pill-tabs";
import { appBackgroundStyle } from "@/lib/appBackground";
import { cn } from "@/lib/utils";

/**
 * /dev/padroes — ANTES × DEPOIS das regras de PADROES-UI-PORCELI.md.
 *
 * A coluna "Antes" usa os componentes e classes que o sistema tem HOJE. A
 * coluna "Depois" aplica as regras novas, mas ESCOPADAS em `.pad-depois`
 * (CSS desta página): nada aqui muda o resto do sistema.
 */

const CSS = `
/* ── Depois: a regra única de animação dos botões ── */
.pad-depois .lqg-btn { transition: transform 150ms ease; }
.pad-depois .lqg-btn:not(:disabled):hover { transform: none; }              /* nada cresce nem sobe */
.pad-depois .lqg-btn:not(:disabled):active { transform: scale(.97); }       /* clique afunda */
.pad-depois .lqg-btn:hover:not(:disabled) .lqg-lens:not(.lqg-lens--primary):not(.lqg-lens--success):not(.lqg-lens--danger) {
  background-color: rgba(255,255,255,.11);                                   /* hover só clareia */
}

/* ── Ação secundária (pílula pequena) e só-ícone ── */
.pad-depois .acao-vidro {
  position: relative; display: inline-flex; align-items: center; gap: .375rem;
  height: 2rem; padding: 0 .875rem; border-radius: 9999px;
  font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
  color: rgba(255,255,255,.85); background: rgba(255,255,255,.06); white-space: nowrap;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.08), inset 1.8px 3px 0 -2px rgba(255,255,255,.45),
    inset -2px -2px 0 -2px rgba(255,255,255,.35), inset 0 3px 4px -2px rgba(0,0,0,.18), 0 2px 6px rgba(0,0,0,.18);
  transition: background-color 200ms ease, color 200ms ease, transform 150ms ease;
}
.pad-depois .acao-vidro.so-icone { width: 2rem; padding: 0; justify-content: center; color: rgba(255,255,255,.65); }
.pad-depois .acao-vidro:hover:not(:disabled) { background: rgba(255,255,255,.11); color: #fff; }
.pad-depois .acao-vidro.perigo:hover:not(:disabled) { color: rgb(253,164,175); background: rgba(244,63,94,.14); }
.pad-depois .acao-vidro:active:not(:disabled) { transform: scale(.97); }

/* ── Ação terciária: só texto ── */
.pad-depois .acao-texto {
  display: inline-flex; align-items: center; gap: .375rem; font-size: 11px; font-weight: 700;
  letter-spacing: .08em; text-transform: uppercase; color: rgba(255,255,255,.5); white-space: nowrap;
  transition: color 200ms ease, transform 150ms ease;
}
.pad-depois .acao-texto:hover:not(:disabled) { color: #fff; }
.pad-depois .acao-texto:active:not(:disabled) { transform: scale(.97); }

/* ── Vidro roxo (escolha marcada / interruptor ligado) ── */
.pad-depois .vidro-roxo {
  --vidro-cor: 104, 41, 192; position: relative;
  background-color: rgba(var(--vidro-cor), .55);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.10), inset 0 10px 14px -8px rgba(255,255,255,.22),
    inset 1.8px 3px 0 -2px rgba(255,255,255,.55), inset -2px -2px 0 -2px rgba(255,255,255,.45),
    inset -3px -8px 1px -6px rgba(255,255,255,.30), inset -0.3px -1px 4px 0 rgba(0,0,0,.14),
    inset 0 3px 4px -2px rgba(0,0,0,.20), 0 2px 8px rgba(var(--vidro-cor), .35), 0 6px 16px rgba(0,0,0,.25);
  transition: background-color 350ms ease, box-shadow 350ms ease;
}

/* ── Foco branco e barra de rolagem neutra (roxo nunca em foco/rolagem) ── */
.pad-depois :focus-visible { --tw-ring-color: rgba(255,255,255,.4); --tw-ring-offset-width: 0px; }
.pad-depois .pad-scroll { scrollbar-color: rgba(255,255,255,.14) transparent; }
.pad-depois .pad-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.14); }
.pad-depois .pad-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,.22); }

/* ── Logo respirando ── */
.pad-depois .logo-respirando { animation: respirar-logo 1.8s ease-in-out .8s infinite; }
@keyframes respirar-logo { 0%,100% { filter: brightness(1); scale: 1; } 50% { filter: brightness(1.25); scale: .96; } }
@media (prefers-reduced-motion: reduce) { .pad-depois .logo-respirando { animation: none; } }
`;

function Par({
  n, titulo, regra, onde, antes, depois,
  rotuloAntes = "Antes · hoje", rotuloDepois = "Depois · padrão", antesOk = false,
}: {
  n: number; titulo: string; regra: ReactNode; onde: string; antes: ReactNode; depois: ReactNode;
  /** Regras que o sistema já segue mostram "usar × não usar" em vez de "antes × depois". */
  rotuloAntes?: string; rotuloDepois?: string; antesOk?: boolean;
}) {
  return (
    <section className="surface-flat no-elevation space-y-4 p-6">
      <div className="space-y-1">
        <h2 className="text-lg font-black tracking-tight">
          <span className="mr-2 text-white/30">{n}.</span>
          {titulo}
        </h2>
        <div className="text-sm text-white/60">{regra}</div>
        <p className="text-xs text-amber-300/80">No sistema hoje: {onde}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 rounded-2xl bg-white/[0.03] p-5">
          <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white/90", antesOk ? "bg-emerald-500/20" : "bg-red-500/20")}>{rotuloAntes}</span>
          <div className="space-y-3">{antes}</div>
        </div>
        <div className="pad-depois space-y-3 rounded-2xl bg-white/[0.03] p-5">
          <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white/90", antesOk ? "bg-red-500/20" : "bg-emerald-500/20")}>{rotuloDepois}</span>
          <div className="space-y-3">{depois}</div>
        </div>
      </div>
    </section>
  );
}

const hoverMotion = {
  whileHover: { scale: 1.05, translateY: -2 },
  whileTap: { scale: 0.95 },
  transition: { type: "spring" as const, stiffness: 400, damping: 17 },
};

function InterruptorVisual({ ligado }: { ligado: boolean }) {
  return (
    <span className={cn("relative block h-6 w-11 shrink-0 rounded-full transition-all duration-300 ease-out", ligado ? "vidro-roxo" : "bg-white/[0.12]")}>
      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-300 ease-out", ligado ? "left-[22px]" : "left-0.5")} />
    </span>
  );
}

const ANTES_ABAS = ["Todas", "Agendadas", "Enviadas", "Falhou"];

/** Card de lista em miniatura, nas cores do Dashboard (escuro ou claro). */
function MiniLista({ titulo, linhas, claro = false, nota }: { titulo: string; linhas: [string, string][]; claro?: boolean; nota?: string }) {
  return (
    <Card className={cn(claro ? "surface-light" : "surface-flat", "flex flex-col p-4")}>
      <p className={cn("mb-2 text-[10px] font-black uppercase tracking-widest", claro ? "text-[#2F2D2E]/50" : "text-white/40")}>{titulo}</p>
      <div className={cn("divide-y", claro ? "divide-black/[0.08]" : "divide-white/[0.06]")}>
        {linhas.map(([l, v]) => (
          <div key={l} className="flex items-center justify-between py-1.5 text-xs">
            <span className={claro ? "text-[#2F2D2E]/60" : "text-white/55"}>{l}</span>
            <b className={claro ? "text-[#2F2D2E]" : "text-white"}>{v}</b>
          </div>
        ))}
      </div>
      {nota && <p className={cn("mt-2 text-[10px]", claro ? "text-[#2F2D2E]/50" : "text-white/40")}>{nota}</p>}
    </Card>
  );
}

/** Legenda de qual pergunta da regra decidiu a cor de um card. */
function Porque({ children }: { children: ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">{children}</p>;
}

export default function PadroesLab() {
  const [abaAntes, setAbaAntes] = useState("Todas");
  const [abaDepois, setAbaDepois] = useState("Todas");
  const [swAntes, setSwAntes] = useState(true);
  const [swDepois, setSwDepois] = useState(true);
  const [pill16, setPill16] = useState("a");

  return (
    <div className="min-h-screen p-6 text-white md:p-10" style={appBackgroundStyle}>
      <style>{CSS}</style>
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight">Padrões de UI — antes e depois</h1>
          <p className="max-w-3xl text-sm text-white/60">
            Cada bloco mostra <b className="text-white">como o sistema está hoje</b> (esquerda) e{" "}
            <b className="text-white">como ficaria com as regras do PADROES-UI-PORCELI.md</b> (direita). A coluna da direita usa CSS só desta
            página: nada do sistema foi alterado. Passe o mouse, clique e use Tab para sentir a diferença.
          </p>
        </header>

        {/* Resumo do que mudaria */}
        <section className="surface-flat no-elevation space-y-3 p-6">
          <h2 className="text-lg font-black tracking-tight">O que mudaria no sistema (levantamento no código)</h2>
          <ul className="grid gap-2 text-sm text-white/70 md:grid-cols-2">
            <li><b className="text-white">91 usos de <code>whileHover</code> em 32 arquivos</b> (botão cresce e sobe) → só clareia; clique afunda.</li>
            <li><b className="text-white">90 botões de vidro</b> sem hierarquia (Cancelar e Salvar do mesmo peso) → 4 níveis: principal, secundária, só-ícone, texto.</li>
            <li><b className="text-white">Ações de linha com texto</b> (Contratos, Clientes, Financeiro) → ícones <code>so-icone</code>.</li>
            <li><b className="text-white">81 usos de borda/foco roxo e 34 de <code>text-primary</code></b>; anel de foco roxo global e barra de rolagem roxa → foco branco, rolagem neutra, roxo só em preenchimento e ícone.</li>
            <li><b className="text-white">Seletores feitos à mão</b> (abas de Agendamentos, Notas, paleta e cenários do Funil) → <code>PillTabs</code>.</li>
            <li><b className="text-white">Interruptor</b>: hoje 52×32 com mola, esticada e som → um só desenho 44×24, 300ms, vidro roxo (8 telas usam).</li>
            <li><b className="text-white">Selos de status</b> com borda e texto coloridos (12+) → pílula plana: fundo tingido, texto branco, ícone mais forte.</li>
            <li><b className="text-white">22 spinners/“Carregando…”</b> soltos (Financeiro, Automações) → logo respirando sobre fundo desfocado; spinner só dentro de botão.</li>
            <li><b className="text-white">Dois conjuntos de ícones</b> (61 arquivos Iconsax, 45 Lucide) → uma família só.</li>
            <li><b className="text-white">Automações e Agendamentos</b> ainda em vidro translúcido → <code>surface-flat</code>.</li>
          </ul>
        </section>

        {/* 1 */}
        <Par
          n={1}
          titulo="Animação dos botões"
          regra="Hover só clareia (nada cresce, nada sobe). Clique afunda levemente (scale .97). Uma regra única, em todo botão."
          onde="quase todo botão está dentro de um motion.div com whileHover scale 1.05 e y −2 (spring), e o CSS ainda faz .lqg-btn:hover scale 1.03."
          antes={
            <div className="flex flex-wrap items-center gap-3">
              <motion.div {...hoverMotion}><LiquidGlassButton tint="primary" className="h-11 px-6 text-xs font-bold uppercase tracking-widest">Novo Lead</LiquidGlassButton></motion.div>
              <motion.div {...hoverMotion}><LiquidGlassButton className="h-11 px-6 text-xs font-bold uppercase tracking-widest">Nova Etapa</LiquidGlassButton></motion.div>
            </div>
          }
          depois={
            <div className="flex flex-wrap items-center gap-3">
              <LiquidGlassButton tint="primary" className="h-11 px-6 text-xs font-bold uppercase tracking-widest">Novo Lead</LiquidGlassButton>
              <LiquidGlassButton className="h-11 px-6 text-xs font-bold uppercase tracking-widest">Nova Etapa</LiquidGlassButton>
            </div>
          }
        />

        {/* 2 */}
        <Par
          n={2}
          titulo="Rodapé de modal: hierarquia de ações"
          regra="Uma principal por área. “Cancelar” é texto, “Salvar e sair” é secundária, “Próximo/Salvar” é a principal. Nunca três vidros iguais."
          onde="os modais de cliente, contrato, lead, despesa e automação têm Cancelar (vidro vermelho) + Salvar (vidro roxo), ambos de peso igual."
          antes={
            <div className="flex gap-3 rounded-2xl border-t border-white/[0.05] pt-4">
              <LiquidGlassButton tint="danger" className="h-12 flex-1 text-xs font-bold uppercase tracking-widest">Cancelar</LiquidGlassButton>
              <LiquidGlassButton tint="primary" className="h-12 flex-1 text-xs font-bold uppercase tracking-widest">Salvar</LiquidGlassButton>
            </div>
          }
          depois={
            <div className="flex items-center justify-end gap-5 rounded-2xl border-t border-white/[0.05] pt-4">
              <button type="button" className="acao-texto">Cancelar</button>
              <LiquidGlassButton tint="primary" className="h-11 px-8 text-xs font-bold uppercase tracking-widest">Salvar</LiquidGlassButton>
            </div>
          }
        />

        {/* 3 */}
        <Par
          n={3}
          titulo="Ações por linha de lista"
          regra="Em listas, ação por linha é ícone (círculo de vidro de 32px). Excluir só fica vermelho no hover."
          onde="Contratos (Editar / Renovar / Excluir), Clientes (Editar / Excluir) e Financeiro usam botões de texto de 32–36px em cada linha."
          antes={
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.04] px-4 py-3">
              <div>
                <p className="text-sm font-bold">Meta · R$ 700,00</p>
                <p className="text-xs text-white/40">27/08/2026 → 26/02/2027</p>
              </div>
              <div className="flex gap-2">
                <LiquidGlassButton className="h-8 px-4 text-[10px] font-bold uppercase tracking-widest">Editar</LiquidGlassButton>
                <LiquidGlassButton className="h-8 px-4 text-[10px] font-bold uppercase tracking-widest">Renovar</LiquidGlassButton>
                <LiquidGlassButton tint="danger" className="h-8 px-4 text-[10px] font-bold uppercase tracking-widest">Cancelar</LiquidGlassButton>
              </div>
            </div>
          }
          depois={
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.04] px-4 py-3">
              <div>
                <p className="text-sm font-bold">Meta · R$ 700,00</p>
                <p className="text-xs text-white/40">27/08/2026 → 26/02/2027</p>
              </div>
              <div className="flex gap-2">
                <button type="button" title="Editar" className="acao-vidro so-icone"><Edit2 size={14} /></button>
                <button type="button" title="Renovar" className="acao-vidro so-icone"><Refresh size={14} /></button>
                <button type="button" title="Cancelar contrato" className="acao-vidro so-icone perigo"><Trash size={14} /></button>
              </div>
            </div>
          }
        />

        {/* 4 */}
        <Par
          n={4}
          titulo="Seleção entre poucas opções (abas em pílula)"
          regra="Escolher uma entre 2–5 opções = PillTabs: uma pílula de vidro neutra marca a ativa e “some de um, aparece no outro”. Nunca roxo em texto ou borda."
          onde="Agendamentos (ativa em bg-primary/20 + borda e texto roxos), Notas (pílula branca), Paleta e cenários do Funil: seletores feitos à mão."
          antes={
            <div className="flex flex-wrap gap-2">
              {ANTES_ABAS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setAbaAntes(t)}
                  className={cn(
                    "h-9 rounded-xl border px-4 text-xs font-medium transition-all",
                    abaAntes === t
                      ? "border-primary/40 bg-primary/20 text-primary"
                      : "border-white/[0.06] bg-white/[0.03] text-white/40 hover:bg-white/[0.06] hover:text-white/70"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          }
          depois={<PillTabs items={ANTES_ABAS.map((t) => ({ value: t, label: t }))} value={abaDepois} onChange={setAbaDepois} />}
        />

        {/* 5 */}
        <Par
          n={5}
          titulo="Interruptor (toggle)"
          regra="Um desenho só: trilho 44×24, bolinha 20, 300ms ease-out, ligado = vidro roxo. Sem mola, sem esticar, sem som."
          onde="Switch 52×32 (bolinha 24 que estica 6px, mola, háptico). Calendário o reduz com scale-75; 8 telas usam."
          antes={
            <label className="flex items-center justify-between gap-4 rounded-xl bg-white/[0.04] p-3">
              <span className="text-sm">Google Meet</span>
              <Switch checked={swAntes} onCheckedChange={setSwAntes} />
            </label>
          }
          depois={
            <button type="button" role="switch" aria-checked={swDepois} onClick={() => setSwDepois((v) => !v)} className="flex w-full items-center justify-between gap-4 rounded-xl bg-white/[0.04] p-3 text-left">
              <span className="text-sm">Google Meet</span>
              <InterruptorVisual ligado={swDepois} />
            </button>
          }
        />

        {/* 6 */}
        <Par
          n={6}
          titulo="Pílula plana: o que só informa"
          regra="Fundo tingido transparente (bg-*-500/20), texto branco, ícone na mesma cor mais forte (-300). Sem borda, sem bisel."
          onde="selos de status em Agendamentos, Automações, Calendário e Clientes usam texto colorido (text-green-400…) com borda colorida (border-green-500/20)."
          antes={
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/15 px-2.5 py-1 text-[11px] font-medium text-green-400"><TickCircle size={13} />Enviada</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/15 px-2.5 py-1 text-[11px] font-medium text-amber-400"><Calendar size={13} />Agendada</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/15 px-2.5 py-1 text-[11px] font-medium text-red-400"><Warning2 size={13} />Falhou</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/15 px-2.5 py-1 text-[11px] font-medium text-primary"><Flash size={13} />Meta Ads</span>
            </div>
          }
          depois={
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-medium text-white/90"><TickCircle size={13} className="text-emerald-300" />Enviada</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-2.5 py-1 text-[11px] font-medium text-white/90"><Calendar size={13} className="text-amber-300" />Agendada</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-2.5 py-1 text-[11px] font-medium text-white/90"><Warning2 size={13} className="text-red-300" />Falhou</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-2.5 py-1 text-[11px] font-medium text-white/90"><Flash size={13} className="text-violet-300" />Meta Ads</span>
            </div>
          }
        />

        {/* 7 */}
        <Par
          n={7}
          titulo="Roxo: só preenchimento e ícone"
          regra="Nunca em texto, borda, foco ou barra de rolagem. Foco = anel branco a 40%; rolagem = branco a 14%. “Limpar filtro” roxo vira ação de texto."
          onde="foco com anel roxo global (ring-primary), inputs com focus:border-primary/50 (81 usos), text-primary solto (34) e barra de rolagem #6829c0."
          antes={
            <div className="space-y-3">
              <input placeholder="Clique aqui (foco com borda roxa)" className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-primary/50" />
              <button type="button" className="text-sm text-primary hover:text-primary/80">Limpar filtro</button>
              <div className="h-20 overflow-y-auto rounded-xl bg-white/[0.03] p-3 text-xs text-white/50">
                {Array.from({ length: 9 }, (_, i) => <p key={i}>Linha de exemplo {i + 1} — role para ver a barra.</p>)}
              </div>
              <p className="text-[11px] text-white/35">Dica: aperte Tab até um botão para ver o anel de foco.</p>
              <LiquidGlassButton className="h-9 px-4 text-xs font-bold uppercase tracking-widest">Botão (use Tab)</LiquidGlassButton>
            </div>
          }
          depois={
            <div className="space-y-3">
              <input placeholder="Clique aqui (foco branco)" className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/40" />
              <button type="button" className="acao-texto">Limpar filtro</button>
              <div className="pad-scroll h-20 overflow-y-auto rounded-xl bg-white/[0.03] p-3 text-xs text-white/50">
                {Array.from({ length: 9 }, (_, i) => <p key={i}>Linha de exemplo {i + 1} — role para ver a barra.</p>)}
              </div>
              <p className="text-[11px] text-white/35">Dica: aperte Tab até um botão para ver o anel de foco.</p>
              <LiquidGlassButton className="h-9 px-4 text-xs font-bold uppercase tracking-widest">Botão (use Tab)</LiquidGlassButton>
            </div>
          }
        />

        {/* 8 */}
        <Par
          n={8}
          titulo="Carregamento de tela"
          regra="Tela inteira carregando = logo sobre fundo desfocado, que “respira” (brilho 1→1,25, escala 1→.96, 1,8s). Spinner só dentro de botão."
          onde="Financeiro, Automações e outras mostram spinner roxo e “Carregando…” soltos; a transição de página já usa logo com desfoque (falta o respirar)."
          antes={
            <div className="flex h-44 flex-col items-center justify-center rounded-2xl bg-white/[0.03]">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-Porceli-purple border-t-transparent" />
              <p className="text-white/50">Carregando lançamentos...</p>
            </div>
          }
          depois={
            <div className="relative h-44 overflow-hidden rounded-2xl" style={appBackgroundStyle}>
              <div className="absolute inset-0 backdrop-blur-[18px]" />
              <img src="/logo.png" alt="" className="logo-respirando absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 object-contain" />
            </div>
          }
        />

        {/* 9 */}
        <Par
          n={9}
          titulo="Cor do card: roxo, vidro, cinza claro ou cinza escuro"
          regra={
            <div className="space-y-1">
              <p>A cor diz o papel do card, não o valor. Responda nesta ordem:</p>
              <ol className="list-decimal space-y-0.5 pl-5">
                <li><b className="text-white">É o número principal da tela?</b> → <b className="text-white">roxo</b> (<code>surface-accent</code>). No máximo 1 por tela.</li>
                <li><b className="text-white">É só um número com legenda</b> (sem lista nem gráfico)? → <b className="text-white">vidro</b> (indicador desconstruído).</li>
                <li><b className="text-white">É bloco de conteúdo</b> (lista, gráfico, funil, tabela) <b className="text-white">e pede uma ação sua</b> (cobrar, renovar, resolver)? → <b className="text-white">cinza claro</b> (<code>surface-light</code>), no máximo 2 por tela.</li>
                <li>Bloco de conteúdo <b className="text-white">só para ler e analisar</b> → <b className="text-white">cinza escuro</b> (<code>surface-flat</code>), o padrão.</li>
              </ol>
              <p>O que muda com o valor é só a cor do texto (verde, vermelho), nunca a do card.</p>
            </div>
          }
          onde="Dashboard: Faturamento previsto roxo; MRR, Previsão 12 meses, Clientes ativos e Contratos a vencer em vidro; Recebíveis e Saúde do negócio claros. Saúde do negócio é análise (não pede ação) e pela regra seria cinza escuro."
          antes={
            <div className="grid grid-cols-2 gap-3">
              <MiniLista titulo="Recebíveis" claro linhas={[["A receber", "R$ 18.400"], ["Vencidos", "R$ 2.100"]]} />
              <MiniLista titulo="Saúde do negócio" claro linhas={[["LTV", "R$ 21.300"], ["Ticket médio", "R$ 1.950"], ["Margem", "38,2%"]]} />
            </div>
          }
          depois={
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <MiniLista titulo="Recebíveis" claro linhas={[["A receber", "R$ 18.400"], ["Vencidos", "R$ 2.100"]]} />
                <Porque>Pede ação (cobrar) → claro</Porque>
              </div>
              <div className="space-y-1.5">
                <MiniLista titulo="Saúde do negócio" linhas={[["LTV", "R$ 21.300"], ["Ticket médio", "R$ 1.950"], ["Margem", "38,2%"]]} />
                <Porque>Só análise → escuro</Porque>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Card className="surface-accent flex flex-col gap-1 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Faturamento previsto</p>
                  <p className="text-2xl font-black tracking-tighter text-white">R$ 42.800</p>
                </Card>
                <Porque>O número principal da tela → roxo (só este)</Porque>
              </div>
            </div>
          }
        />

        {/* 10 */}
        <Par
          n={10}
          titulo="Card desconstruído ou card inteiro"
          antesOk
          rotuloAntes="Desconstruído · um objeto"
          rotuloDepois="Inteiro · um painel"
          regra={
            <div className="space-y-1">
              <p>
                Desconstruído (chip com o título no canto + círculo encaixado) quando as <b className="text-white">três</b> respostas forem sim:
              </p>
              <ol className="list-decimal space-y-0.5 pl-5">
                <li><b className="text-white">Tem um nome curto que identifica?</b> Cabe no chip: 1 a 3 palavras (“MRR”, o nome do lead, “Novo agente”).</li>
                <li><b className="text-white">Tem no máximo um ícone ou uma ação?</b> É o que vai no círculo: ícone do indicador, editar, fechar.</li>
                <li><b className="text-white">É um item de uma série, ou uma janela própria?</b> Indicadores lado a lado, leads numa coluna, atividades do dia, modal, Post-it.</li>
              </ol>
              <p>
                Qualquer “não” → card inteiro. <b className="text-white">Nunca desconstruído:</b> o roxo de destaque (o chip disputa com o número),
                listas, gráficos, funis e tabelas (o título descreve o conteúdo e o recorte rouba espaço) e card com 2 ou mais ações.
              </p>
              <p>Forma e cor são decisões separadas: desconstruído pode ser vidro (indicador) ou cinza sólido (lead, modal).</p>
            </div>
          }
          onde="já seguido: indicadores do Dashboard, Clientes e Financeiro, atividades do Calendário, leads do Kanban, modais e Post-its são desconstruídos; listas, gráficos e o funil são inteiros."
          antes={
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <StatsCard title="MRR" value="R$ 31.500" icon={DollarCircle} description="Mensalidades valendo hoje" valueClassName="text-xl text-white" className="h-[150px]" />
                <Porque>Indicador de uma série</Porque>
              </div>
              <div className="space-y-1.5">
                <DeconstructedCard
                  chip={<span className="truncate text-[11px] font-black uppercase tracking-widest text-white/75">Kor Brasil</span>}
                  circle={
                    <span className="liquid-glass flex h-full w-full items-center justify-center !rounded-full">
                      <Edit2 size={16} className="relative z-10 text-white/85" />
                    </span>
                  }
                  className="h-[150px]"
                >
                  <p className="text-sm font-bold text-white">Reunião de renovação</p>
                  <p className="text-xs text-white/45">Qui, 14:00 · 1 ação: editar</p>
                </DeconstructedCard>
                <Porque>Item de uma lista, 1 ação</Porque>
              </div>
            </div>
          }
          depois={
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <MiniLista titulo="O ano de 2026" linhas={[["Total faturado", "R$ 412 mil"], ["Recebido", "R$ 371 mil"], ["A receber", "R$ 41 mil"]]} />
                <Porque>Lista: o título descreve conteúdo</Porque>
              </div>
              <div className="space-y-1.5">
                <Card className="surface-flat flex h-full flex-col gap-2 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Contrato · Meta</p>
                  <p className="text-xs text-white/55">R$ 700,00 · 27/08 → 26/02</p>
                  <div className="mt-auto flex gap-1.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06]"><Edit2 size={13} /></span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06]"><Refresh size={13} /></span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06]"><Profile2User size={13} /></span>
                  </div>
                </Card>
                <Porque>3 ações: não cabem no círculo</Porque>
              </div>
            </div>
          }
        />

        <header className="space-y-2 pt-6">
          <h1 className="text-3xl font-black tracking-tight">Padrões de formato — qual caixa usar</h1>
          <p className="max-w-3xl text-sm text-white/60">
            As regras 1 a 10 dizem como cada elemento se parece. As de 11 a 16 dizem qual formato a tela usa para o trabalho que
            ela faz — antes de decidir a cor de uma caixa, decidir se a caixa devia existir daquele jeito.
          </p>
        </header>

        <Par
          n={11}
          titulo="Lista de objetos que se abrem"
          regra="Uma linha por objeto, clica e abre a página dele. Colunas: só as 3–4 que ajudam a decidir qual abrir (nome, estado/saúde, última atividade). Data de criação, ids e slugs ficam dentro do objeto. Na linha, no máximo 1 ação (excluir); editar é abrir."
          onde="Clientes trackeados mostrava “Criado em” e “Slug”, sem saúde, e o lápis abria o assistente de setup."
          antes={
            <Card className="surface-flat divide-y divide-white/[0.06] p-0">
              {["Oka Resto", "Kor Brasil"].map((n) => (
                <div key={n} className="flex items-center gap-3 px-4 py-3 text-xs">
                  <b className="flex-1 text-white">{n}</b>
                  <span className="w-16 text-white/50">12/03/26</span>
                  <span className="w-16 font-mono text-white/50">{n.toLowerCase().replace(" ", "-")}</span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06]"><Edit2 size={12} /></span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06]"><Trash size={12} /></span>
                </div>
              ))}
            </Card>
          }
          depois={
            <Card className="surface-flat divide-y divide-white/[0.06] p-0">
              {([["Oka Resto", true, "há 2 h"], ["Kor Brasil", false, "há 6 dias"]] as const).map(([n, ok, u]) => (
                <div key={n} className="flex items-center gap-3 px-4 py-3 text-xs">
                  <b className="flex-1 text-white">{n}</b>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] text-white/90", ok ? "bg-emerald-500/20" : "bg-amber-500/20")}>{ok ? "Ok" : "Atenção"}</span>
                  <span className="w-20 text-white/50">{u}</span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06]"><Trash size={12} /></span>
                </div>
              ))}
            </Card>
          }
        />

        <Par
          n={12}
          titulo="Poucos registros, editados raramente"
          regra="Lista só de leitura + modal de edição + botão “Novo” que abre o mesmo modal vazio. Tabela com campo em toda célula é para editar centenas de linhas toda hora — planilha, não cadastro."
          onde="Admin: Planos, Pacotes de IA e Agências eram tabelas de inputs com rolagem lateral e um formulário em branco na última linha."
          antes={
            <Card className="surface-flat space-y-1.5 p-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-1.5">
                  {[16, 28, 12, 14, 24].map((w, j) => (
                    <span key={j} className="h-6 rounded-md bg-white/[0.06]" style={{ width: `${w}%` }} />
                  ))}
                </div>
              ))}
              <p className="pt-1 text-[10px] text-white/40">↔ rola para os lados · salvar por linha</p>
            </Card>
          }
          depois={
            <Card className="surface-flat divide-y divide-white/[0.06] p-0">
              {([["Starter", "R$ 197", "5 clientes"], ["Pro", "R$ 397", "15 clientes"]] as const).map(([n, p, l]) => (
                <div key={n} className="flex items-center gap-3 px-4 py-3 text-xs">
                  <b className="flex-1 text-white">{n}</b>
                  <span className="text-white/60">{p}</span>
                  <span className="w-20 text-white/50">{l}</span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06]"><Edit2 size={12} /></span>
                </div>
              ))}
              <div className="px-4 py-3 text-xs text-white/60">+ Novo plano (abre o modal)</div>
            </Card>
          }
        />

        <Par
          n={13}
          titulo="Ajustes que se preenchem uma vez"
          antesOk
          rotuloAntes="Usar"
          rotuloDepois="Não usar"
          regra="Página de blocos, cada um salva sozinho. Preenchido, o bloco vira uma linha “Configurado · Trocar”. Nunca um botão “Salvar tudo” no fim da página."
          onde="já seguido: Configurações da agência (Google, Meta, WhatsApp)."
          antes={
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-xl bg-emerald-400/[0.06] px-4 py-3 text-xs">
                <span className="flex items-center gap-2 text-white/85"><TickCircle size={14} className="text-emerald-300" /> Chaves do Google configuradas</span>
                <span className="text-white/60">Trocar</span>
              </div>
              <Card className="surface-flat space-y-2 p-4 text-xs">
                <p className="font-bold text-white">App da Meta</p>
                <span className="block h-7 rounded-lg bg-white/[0.06]" />
                <span className="inline-block rounded-full bg-white/[0.1] px-3 py-1 text-[10px]">Salvar</span>
              </Card>
            </div>
          }
          depois={
            <Card className="surface-flat space-y-2 p-4 text-xs">
              {["Google", "Meta", "WhatsApp"].map((n) => <span key={n} className="block h-7 rounded-lg bg-white/[0.06]" />)}
              <span className="inline-block rounded-full bg-white/[0.1] px-3 py-1 text-[10px]">Salvar tudo</span>
            </Card>
          }
        />

        <Par
          n={14}
          titulo="Assistente só cria; editar é na página do objeto"
          regra="Criar algo com muitos passos = assistente em etapas. Depois de criado, ele não é reaberto: cada parte se edita na aba correspondente da página do objeto. Duas portas para o mesmo dado = uma delas fica velha."
          onde="Setup do cliente: o assistente era reaberto pelo lápis da lista e pelo “Editar setup”, e as abas do cliente editavam as mesmas coisas."
          antes={
            <div className="space-y-2 text-xs text-white/70">
              <p>Lista → lápis → <b className="text-white">assistente</b></p>
              <p>Cliente → “Editar setup” → <b className="text-white">assistente</b></p>
              <p>Cliente → aba WhatsApp → <b className="text-white">edita o mesmo</b></p>
            </div>
          }
          depois={
            <div className="space-y-2 text-xs text-white/70">
              <p>“Novo cliente” → <b className="text-white">assistente</b> (só aqui)</p>
              <p>Cliente → aba Anúncios / WhatsApp / Site / Setup → <b className="text-white">edita</b></p>
            </div>
          }
        />

        <Par
          n={15}
          titulo="Formulário longo"
          regra="Interruptor no topo: desligado, o resto some. Agrupar em blocos curtos com título; listas de opções longas em grupos que abrem e fecham mostrando “4 de 7”. O que é da agência (saldo, compra, chaves) não mora na configuração de um cliente."
          onde="Análise de Atendimento com IA: tudo aberto mesmo desativado, saldo e compra do workspace no meio, todos os critérios com descrição sempre visível."
          antes={
            <Card className="surface-flat space-y-1.5 p-3">
              {Array.from({ length: 9 }).map((_, i) => <span key={i} className="block h-5 rounded-md bg-white/[0.06]" />)}
            </Card>
          }
          depois={
            <Card className="surface-flat space-y-2 p-3 text-xs">
              <div className="flex items-center justify-between"><b className="text-white">Ativado</b><InterruptorVisual ligado /></div>
              {([["Atendimento", "4 de 7"], ["Venda", "2 de 5"], ["Pós-venda", "0 de 4"]] as const).map(([n, c]) => (
                <div key={n} className="flex justify-between rounded-lg bg-white/[0.04] px-3 py-2">
                  <span className="text-white/80">{n}</span><span className="text-white/45">{c} ›</span>
                </div>
              ))}
            </Card>
          }
        />

        <Par
          n={16}
          titulo="Escolha na tela certa"
          regra="1 entre 2–5 → PillTabs. Várias entre poucas → chips com check. Várias entre muitas → grupos que abrem e fecham. Nunca botões feitos à mão para cada caso."
          onde="“Quais leads analisar” (1 entre 2) era feito à mão em vez de PillTabs."
          antes={
            <div className="flex gap-2 text-[11px]">
              <span className="rounded-xl bg-primary/40 px-3 py-2">Todos os leads</span>
              <span className="rounded-xl border border-white/10 px-3 py-2 text-white/40">Só tráfego pago</span>
            </div>
          }
          depois={
            <PillTabs items={[{ value: "a", label: "Todos os leads" }, { value: "b", label: "Só tráfego pago" }]} value={pill16} onChange={setPill16} />
          }
        />

        <p className="pb-10 text-center text-xs text-white/30">
          Página de teste — rota <code>/dev/padroes</code>. A coluna “Depois” usa o CSS escopado `.pad-depois`; nada foi aplicado ao sistema.
        </p>
      </div>
    </div>
  );
}

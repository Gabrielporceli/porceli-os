import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Calendar, Edit2, Flash, Refresh, TickCircle, Trash, Warning2 } from "iconsax-react";
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button";
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
}: { n: number; titulo: string; regra: string; onde: string; antes: ReactNode; depois: ReactNode }) {
  return (
    <section className="surface-flat no-elevation space-y-4 p-6">
      <div className="space-y-1">
        <h2 className="text-lg font-black tracking-tight">
          <span className="mr-2 text-white/30">{n}.</span>
          {titulo}
        </h2>
        <p className="text-sm text-white/60">{regra}</p>
        <p className="text-xs text-amber-300/80">No sistema hoje: {onde}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 rounded-2xl bg-white/[0.03] p-5">
          <span className="rounded-full bg-red-500/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white/90">Antes · hoje</span>
          <div className="space-y-3">{antes}</div>
        </div>
        <div className="pad-depois space-y-3 rounded-2xl bg-white/[0.03] p-5">
          <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white/90">Depois · padrão</span>
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

export default function PadroesLab() {
  const [abaAntes, setAbaAntes] = useState("Todas");
  const [abaDepois, setAbaDepois] = useState("Todas");
  const [swAntes, setSwAntes] = useState(true);
  const [swDepois, setSwDepois] = useState(true);

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

        <p className="pb-10 text-center text-xs text-white/30">
          Página de teste — rota <code>/dev/padroes</code>. A coluna “Depois” usa o CSS escopado `.pad-depois`; nada foi aplicado ao sistema.
        </p>
      </div>
    </div>
  );
}

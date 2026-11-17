/**
 * Central de Agentes.
 *
 * Canvas com um terminal por agente: arrasta pela barra de título,
 * redimensiona pelas bordas, digita direto. Os terminais trocam mensagens
 * entre si (comando `msg`) e a linha entre eles anima. Ainda não há motor:
 * cada terminal roda em modo demonstração (features/agents/terminal/session)
 * até o Hermes estar na VPS; aí entra a sessão por WebSocket, sem mudar a tela.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Cpu } from "iconsax-react";
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button";
import { Icon } from "@/components/ui/icon";
import { PageLoader } from "@/components/ui/PageLoader";
import { usePageReady } from "@/hooks/usePageReady";
import { useIsMobile } from "@/hooks/use-mobile";
import { AgentsCanvas, resetTerminalLayout } from "@/components/ui/agents-canvas";
import { AgentDialog } from "@/features/agents/AgentDialog";
import { AtividadeHermes } from "@/features/agents/AtividadeHermes";
import { Aprovacoes, BotaoAprovacoes, useAprovacoesPendentes } from "@/features/agents/Aprovacoes";
import { VOCE, updateAgent, useAgentsState } from "@/features/agents/agentsStore";

export default function AgentsHub() {
  const { agents, messages } = useAgentsState();
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [dialogo, setDialogo] = useState<{ open: boolean; editar?: string }>({ open: false });
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [fitVersion, setFitVersion] = useState(0);
  const [atividade, setAtividade] = useState(false);
  const [aprovacoes, setAprovacoes] = useState(false);
  // Celular: dois toques num terminal o levam pra tela cheia, acima do teclado.
  const isMobile = useIsMobile();
  const [foco, setFoco] = useState<string | null>(null);
  useEffect(() => {
    if (!isMobile) setFoco(null);
  }, [isMobile]);
  const sairDoFoco = () => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    setFoco(null);
  };
  // Quem chega pelo aviso da ilha ou pela notificação do celular vem com
  // ?aprovacoes=1: o painel já abre, e o parâmetro sai do endereço.
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    if (params.get("aprovacoes") !== "1") return;
    setAprovacoes(true);
    setParams({}, { replace: true });
  }, [params, setParams]);
  const pendentes = useAprovacoesPendentes();

  const conversas = useMemo(
    () => messages.filter((m) => m.de !== VOCE && m.para !== VOCE).map((m) => [m.de, m.para] as [string, string]),
    [messages],
  );

  // Mesma convenção das outras telas: quem desenha o "carregando" é a
  // transição do layout (overlay de blur + logo).
  const isReady = usePageReady();

  // O bloco ocupa a mesma faixa da barra lateral (16px do topo e do fundo).
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ h?: number; shift: number }>({ shift: 0 });
  useLayoutEffect(() => {
    const measure = () => {
      const el = boxRef.current;
      if (!el) return;
      if (window.innerWidth < 768) return setBox({ h: Math.max(520, window.innerHeight - 160), shift: 0 });
      const top = el.getBoundingClientRect().top + window.scrollY - (Number(el.dataset.shift) || 0);
      setBox({ h: window.innerHeight - 32, shift: 16 - top });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  if (!isReady) return <PageLoader />;

  return (
    // Celular: os 5 botões não cabem flutuando sobre o canvas (somam 560px e
    // os dois primeiros, Aprovações e MCP, saíam pela esquerda da tela). Aqui
    // eles viram uma faixa própria, numa grade de 6 colunas: linha 1 com
    // Aprovações e Criar agente (3 colunas cada, mesma largura) e linha 2 com
    // MCP, Ver todos e Organizar (2 colunas cada). O `order` sobe "Criar
    // agente" pro lado de Aprovações. A partir de md volta o de sempre:
    // flutuando no canto, na ordem do código.
    <div ref={boxRef} data-shift={box.shift} className="relative flex flex-col gap-3 md:block" style={{ height: box.h, marginTop: box.shift }}>
      <div className="z-20 grid shrink-0 grid-cols-6 gap-2 max-md:[&>*]:order-3 max-md:[&>*:first-child]:order-1 max-md:[&>*:last-child]:order-2 md:absolute md:right-4 md:top-4 md:flex md:flex-wrap md:items-center md:justify-end">
        <BotaoAprovacoes
          pendentes={pendentes.lista?.length ?? 0}
          onClick={() => setAprovacoes(true)}
          className="max-md:col-span-3 max-md:h-10 max-md:w-full max-md:px-2 max-md:text-[11px]"
        />
        <LiquidGlassButton
          onClick={() => setAtividade(true)}
          className="h-11 px-5 text-xs font-bold uppercase tracking-widest max-md:col-span-2 max-md:h-10 max-md:w-full max-md:px-2 max-md:text-[11px]"
        >
          MCP
        </LiquidGlassButton>
        {agents.length > 1 && (
          <LiquidGlassButton
            onClick={() => setFitVersion((v) => v + 1)}
            className="h-11 px-5 text-xs font-bold uppercase tracking-widest max-md:col-span-2 max-md:h-10 max-md:w-full max-md:px-2 max-md:text-[11px]"
          >
            Ver todos
          </LiquidGlassButton>
        )}
        {agents.length > 1 && (
          <LiquidGlassButton
            onClick={() => {
              resetTerminalLayout(agents.map((a) => a.id));
              setLayoutVersion((v) => v + 1);
            }}
            className="h-11 px-5 text-xs font-bold uppercase tracking-widest max-md:col-span-2 max-md:h-10 max-md:w-full max-md:px-2 max-md:text-[11px]"
          >
            Organizar
          </LiquidGlassButton>
        )}
        <motion.div className="max-md:col-span-3">
          <LiquidGlassButton
            tint="primary"
            onClick={() => setDialogo({ open: true })}
            className="h-11 px-6 text-xs font-bold uppercase tracking-widest max-md:h-10 max-md:w-full max-md:px-2 max-md:text-[11px]"
          >
            Criar agente
          </LiquidGlassButton>
        </motion.div>
      </div>

      {agents.length === 0 ? (
        <section className="surface-flat no-elevation flex min-h-0 flex-1 flex-col items-center justify-center rounded-3xl px-4 text-center md:h-full">
          <Icon as={Cpu} size={28} className="mx-auto mb-3 text-white/25" />
          <p className="text-sm text-white/45">Nenhum agente ainda</p>
          <p className="mt-1 text-xs text-white/30">
            O primeiro que você criar vira o agente principal; cada um ganha um terminal aqui.
          </p>
        </section>
      ) : (
        <div className={foco ? "agente-foco fixed inset-x-0 z-[80] flex flex-col gap-2 bg-black" : "min-h-0 flex-1 md:h-full"}>
        {foco && (
          // Só o celular chega aqui. O nome do agente já está na barra do
          // próprio terminal; aqui fica só o caminho de volta.
          <button
            type="button"
            onClick={sairDoFoco}
            className="flex h-10 shrink-0 items-center gap-2 self-start rounded-full bg-white/10 px-4 text-xs font-bold uppercase tracking-widest text-white"
          >
            ← Voltar
          </button>
        )}
        <div className={foco ? "min-h-0 flex-1" : "h-full"}>
        <AgentsCanvas
          fill
          variant="terminal"
          agents={agents}
          selectedId={selecionado}
          onSelect={setSelecionado}
          conversas={conversas}
          layoutVersion={layoutVersion}
          fitVersion={fitVersion}
          foco={foco}
          onFoco={isMobile ? setFoco : undefined}
          onEdit={(id) => setDialogo({ open: true, editar: id })}
          onRename={(id, nome) => updateAgent(id, { nome })}
          onColor={(id, cor) => updateAgent(id, { cor })}
        />
        </div>
        </div>
      )}

      <AgentDialog
        open={dialogo.open}
        onClose={() => setDialogo({ open: false })}
        agent={agents.find((a) => a.id === dialogo.editar) ?? null}
        isFirst={agents.length === 0}
        onCreated={setSelecionado}
      />

      <AtividadeHermes open={atividade} onClose={() => setAtividade(false)} />
      <Aprovacoes open={aprovacoes} onClose={() => setAprovacoes(false)} lista={pendentes.lista} />
    </div>
  );
}

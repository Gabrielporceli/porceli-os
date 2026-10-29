/**
 * Central de Agentes.
 *
 * Canvas com um terminal por agente: arrasta pela barra de título,
 * redimensiona pelas bordas, digita direto. Os terminais trocam mensagens
 * entre si (comando `msg`) e a linha entre eles anima. Ainda não há motor:
 * cada terminal roda em modo demonstração (features/agents/terminal/session)
 * até o Hermes estar na VPS; aí entra a sessão por WebSocket, sem mudar a tela.
 */
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Cpu } from "iconsax-react";
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button";
import { Icon } from "@/components/ui/icon";
import { PageLoader } from "@/components/ui/PageLoader";
import { usePageReady } from "@/hooks/usePageReady";
import { AgentsCanvas, resetTerminalLayout } from "@/components/ui/agents-canvas";
import { AgentDialog } from "@/features/agents/AgentDialog";
import { AtividadeHermes } from "@/features/agents/AtividadeHermes";
import { VOCE, updateAgent, useAgentsState } from "@/features/agents/agentsStore";

export default function AgentsHub() {
  const { agents, messages } = useAgentsState();
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [dialogo, setDialogo] = useState<{ open: boolean; editar?: string }>({ open: false });
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [fitVersion, setFitVersion] = useState(0);
  const [atividade, setAtividade] = useState(false);

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
    <div ref={boxRef} data-shift={box.shift} className="relative" style={{ height: box.h, marginTop: box.shift }}>
      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        <LiquidGlassButton
          onClick={() => setAtividade(true)}
          className="h-11 px-5 text-xs font-bold uppercase tracking-widest"
        >
          MCP
        </LiquidGlassButton>
        {agents.length > 1 && (
          <LiquidGlassButton
            onClick={() => setFitVersion((v) => v + 1)}
            className="h-11 px-5 text-xs font-bold uppercase tracking-widest"
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
            className="h-11 px-5 text-xs font-bold uppercase tracking-widest"
          >
            Organizar
          </LiquidGlassButton>
        )}
        <motion.div
        >
          <LiquidGlassButton
            tint="primary"
            onClick={() => setDialogo({ open: true })}
            className="h-11 px-6 text-xs font-bold uppercase tracking-widest"
          >
            Criar agente
          </LiquidGlassButton>
        </motion.div>
      </div>

      {agents.length === 0 ? (
        <section className="surface-flat no-elevation flex h-full flex-col items-center justify-center rounded-3xl px-4 text-center">
          <Icon as={Cpu} size={28} className="mx-auto mb-3 text-white/25" />
          <p className="text-sm text-white/45">Nenhum agente ainda</p>
          <p className="mt-1 text-xs text-white/30">
            O primeiro que você criar vira o agente principal; cada um ganha um terminal aqui.
          </p>
        </section>
      ) : (
        <AgentsCanvas
          fill
          variant="terminal"
          agents={agents}
          selectedId={selecionado}
          onSelect={setSelecionado}
          conversas={conversas}
          layoutVersion={layoutVersion}
          fitVersion={fitVersion}
          onEdit={(id) => setDialogo({ open: true, editar: id })}
          onRename={(id, nome) => updateAgent(id, { nome })}
          onColor={(id, cor) => updateAgent(id, { cor })}
        />
      )}

      <AgentDialog
        open={dialogo.open}
        onClose={() => setDialogo({ open: false })}
        agent={agents.find((a) => a.id === dialogo.editar) ?? null}
        isFirst={agents.length === 0}
        onCreated={setSelecionado}
      />

      <AtividadeHermes open={atividade} onClose={() => setAtividade(false)} />
    </div>
  );
}

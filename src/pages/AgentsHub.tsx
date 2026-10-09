/**
 * Central de Agentes.
 *
 * Canvas com os agentes (um orbe cada), chat individual com histórico,
 * troca de mensagens entre agentes e um agente principal que coordena os
 * demais. Os dados vivem no navegador (features/agents/agentsStore) e não há
 * motor ligado: as mensagens ficam gravadas, mas ninguém responde sozinho.
 */
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Cpu } from "iconsax-react";
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button";
import { Icon } from "@/components/ui/icon";
import { PageLoader } from "@/components/ui/PageLoader";
import { usePageReady } from "@/hooks/usePageReady";
import { AgentsCanvas } from "@/components/ui/agents-canvas";
import { AgentChat } from "@/features/agents/AgentChat";
import { AgentDialog } from "@/features/agents/AgentDialog";
import { VOCE, useAgentsState } from "@/features/agents/agentsStore";

export default function AgentsHub() {
  const { agents, messages } = useAgentsState();
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [dialogo, setDialogo] = useState<{ open: boolean; editar?: string }>({ open: false });

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
      <div className="absolute right-4 top-4 z-20">
        <motion.div
          whileHover={{ scale: 1.05, translateY: -2 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
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
            O primeiro que você criar vira o agente principal; cada um aparece aqui como um orbe.
          </p>
        </section>
      ) : (
        <AgentsCanvas
          fill
          agents={agents}
          selectedId={selecionado}
          onSelect={setSelecionado}
          conversas={conversas}
          panel={(id) => {
            const ag = agents.find((x) => x.id === id);
            return ag ? (
              <AgentChat
                agent={ag}
                agents={agents}
                messages={messages}
                onEdit={() => setDialogo({ open: true, editar: ag.id })}
                onClose={() => setSelecionado(null)}
              />
            ) : null;
          }}
        />
      )}

      <AgentDialog
        open={dialogo.open}
        onClose={() => setDialogo({ open: false })}
        agent={agents.find((a) => a.id === dialogo.editar) ?? null}
        isFirst={agents.length === 0}
        onCreated={setSelecionado}
      />
    </div>
  );
}

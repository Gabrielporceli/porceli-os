/**
 * Central de Agentes.
 *
 * Canvas com os agentes (um orbe cada), chat individual com histórico,
 * troca de mensagens entre agentes e um agente principal que coordena os
 * demais. Os dados vivem no navegador (features/agents/agentsStore) e não há
 * motor ligado: as mensagens ficam gravadas, mas ninguém responde sozinho.
 */
import { useMemo, useState } from "react";
import { Cpu, Flash } from "iconsax-react";
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
  if (!isReady) return <PageLoader />;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight">Central de Agentes</h1>
          <p className="text-sm text-white/45">
            Crie agentes, converse com cada um e acompanhe como eles se falam.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDialogo({ open: true })}
          // Sem `btn-glass-primary` nem `.bg-primary`: as duas levam
          // `backdrop-filter`, gatilho da "tarja de brilho" (ver
          // CORRIGIR-TARJA-DE-BRILHO.md, seção 6). A cor vem do tema via style.
          style={{ backgroundColor: "hsl(var(--primary))" }}
          className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          <Icon as={Flash} size={16} />
          Criar agente
        </button>
      </header>

      {agents.length === 0 ? (
        <section className="surface-flat no-elevation rounded-3xl px-4 py-14 text-center">
          <Icon as={Cpu} size={28} className="mx-auto mb-3 text-white/25" />
          <p className="text-sm text-white/45">Nenhum agente ainda</p>
          <p className="mt-1 text-xs text-white/30">
            O primeiro que você criar vira o agente principal; cada um aparece aqui como um orbe.
          </p>
        </section>
      ) : (
        <AgentsCanvas
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

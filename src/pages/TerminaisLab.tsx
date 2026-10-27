import { useMemo, useState } from "react";
import { AgentsCanvas, resetTerminalLayout } from "@/components/ui/agents-canvas";
import { VOCE, createAgent, deleteAgent, updateAgent, useAgentsState } from "@/features/agents/agentsStore";
import { AgentDialog } from "@/features/agents/AgentDialog";
import { appBackgroundStyle } from "@/lib/appBackground";

/**
 * /dev/terminais — o canvas de terminais da Central de Agentes, fora do login,
 * para testar a interface. Usa o mesmo agentsStore (localStorage deste
 * endereço); os agentes de exemplo só são criados no clique.
 */

const EXEMPLOS = [
  { nome: "Hermes Principal", papel: "Coordena os outros agentes" },
  { nome: "Financeiro", papel: "Cobra faturas e envia relatórios" },
  { nome: "Atendente", papel: "Responde leads no WhatsApp" },
  { nome: "Analista", papel: "Lê métricas de campanhas" },
];

export default function TerminaisLab() {
  const { agents, messages } = useAgentsState();
  const [sel, setSel] = useState<string | null>(null);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [fitVersion, setFitVersion] = useState(0);
  const [dialogo, setDialogo] = useState<{ open: boolean; editar?: string }>({ open: false });

  const conversas = useMemo(
    () => messages.filter((m) => m.de !== VOCE && m.para !== VOCE).map((m) => [m.de, m.para] as [string, string]),
    [messages],
  );

  return (
    <div className="flex h-screen flex-col gap-3 p-4 text-white" style={appBackgroundStyle}>
      <header className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-lg font-black tracking-tight">Terminais dos agentes</h1>
          <p className="text-xs text-white/45">
            Arraste pela barra de título, redimensione pelas bordas (selecione a janela), duplo clique no nome para renomear, digite <b>ajuda</b> dentro de um terminal.
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setDialogo({ open: true })}
            className="rounded-full bg-violet-500 px-4 py-1.5 text-sm font-semibold hover:bg-violet-400"
          >
            Criar agente
          </button>
          {agents.length === 0 && (
            <button
              onClick={() => EXEMPLOS.forEach((e) => createAgent({ ...e, prompt: "" }))}
              className="rounded-full bg-violet-500 px-4 py-1.5 text-sm font-semibold hover:bg-violet-400"
            >
              Criar agentes de exemplo
            </button>
          )}
          {agents.length > 0 && (
            <>
              <button
                onClick={() => setFitVersion((v) => v + 1)}
                className="rounded-full bg-white/10 px-4 py-1.5 text-sm hover:bg-white/15"
              >
                Ver todos
              </button>
              <button
                onClick={() => {
                  resetTerminalLayout(agents.map((a) => a.id));
                  setLayoutVersion((v) => v + 1);
                }}
                className="rounded-full bg-white/10 px-4 py-1.5 text-sm hover:bg-white/15"
              >
                Organizar
              </button>
              <button
                onClick={() => agents.forEach((a) => deleteAgent(a.id))}
                className="rounded-full bg-white/5 px-4 py-1.5 text-sm text-white/50 hover:bg-white/10"
              >
                Apagar exemplos
              </button>
            </>
          )}
        </div>
      </header>
      <div className="min-h-0 flex-1">
        {agents.length > 0 && (
          <AgentsCanvas
            fill
            variant="terminal"
            agents={agents}
            selectedId={sel}
            onSelect={setSel}
            conversas={conversas}
            layoutVersion={layoutVersion}
            fitVersion={fitVersion}
            onRename={(id, nome) => updateAgent(id, { nome })}
            onColor={(id, cor) => updateAgent(id, { cor })}
            onEdit={(id) => setDialogo({ open: true, editar: id })}
          />
        )}
      </div>
      <AgentDialog
        open={dialogo.open}
        onClose={() => setDialogo({ open: false })}
        agent={agents.find((a) => a.id === dialogo.editar) ?? null}
        isFirst={agents.length === 0}
        onCreated={setSel}
      />
    </div>
  );
}

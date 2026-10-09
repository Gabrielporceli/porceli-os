import { useEffect, useRef, useState } from "react";
import { Send2, Setting2 } from "iconsax-react";
import { Icon } from "@/components/ui/icon";
import { OrbAvatar, defaultOrbColor } from "@/components/ui/orb-avatar";
import { cn } from "@/lib/utils";
import {
  VOCE,
  agentTraffic,
  chatWith,
  sendMessage,
  type AgentMessage,
  type StoredAgent,
} from "./agentsStore";

const hora = (t: number) =>
  new Date(t).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

function Composer({ placeholder, onSend, leading }: { placeholder: string; onSend: (t: string) => void; leading?: React.ReactNode }) {
  const [texto, setTexto] = useState("");
  const enviar = () => {
    if (!texto.trim()) return;
    onSend(texto);
    setTexto("");
  };
  return (
    <div className="flex items-center gap-2">
      {leading}
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && enviar()}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-full bg-white/[0.06] px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30"
      />
      <button
        type="button"
        onClick={enviar}
        disabled={!texto.trim()}
        aria-label="Enviar"
        className="rounded-full bg-white/10 p-2.5 text-white transition-opacity hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Icon as={Send2} size={18} />
      </button>
    </div>
  );
}

function Bubble({ m, minha, autor }: { m: AgentMessage; minha: boolean; autor?: string }) {
  return (
    <div className={cn("flex flex-col", minha ? "items-end" : "items-start")}>
      {autor && <span className="mb-0.5 px-2 text-[10px] font-bold uppercase tracking-widest text-white/35">{autor}</span>}
      <div
        className={cn(
          "max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm",
          minha ? "bg-primary/80 text-white" : "bg-white/[0.07] text-white/90",
        )}
      >
        {m.texto}
      </div>
      <span className="mt-0.5 px-2 text-[10px] text-white/25">{hora(m.em)}</span>
    </div>
  );
}

interface Props {
  agent: StoredAgent;
  agents: StoredAgent[];
  messages: AgentMessage[];
  onEdit: () => void;
  onClose: () => void;
}

/** Painel do agente selecionado: conversa com o usuário (com histórico) e a
 *  troca de mensagens dele com os outros agentes. */
export function AgentChat({ agent, agents, messages, onEdit, onClose }: Props) {
  const [aba, setAba] = useState<"conversa" | "agentes">("conversa");
  const outros = agents.filter((a) => a.id !== agent.id);
  const [destino, setDestino] = useState("");
  const fim = useRef<HTMLDivElement>(null);

  const direta = chatWith(messages, agent.id);
  const trafego = agentTraffic(messages, agent.id);
  const lista = aba === "conversa" ? direta : trafego;
  const nome = (id: string) => (id === VOCE ? "Você" : agents.find((a) => a.id === id)?.nome ?? "Agente removido");

  useEffect(() => {
    setAba("conversa");
    setDestino("");
  }, [agent.id]);
  useEffect(() => {
    fim.current?.scrollIntoView({ block: "end" });
  }, [lista.length, aba, agent.id]);

  const alvo = outros.find((a) => a.id === destino)?.id ?? outros[0]?.id ?? "";

  return (
    <section className="surface-modal flex h-[460px] w-[380px] flex-col rounded-3xl">
      <header className="flex items-center gap-3 border-b border-white/[0.06] p-4">
        <OrbAvatar
          size="sm"
          color={agent.cor ?? defaultOrbColor(agent.id)}
          shape={agent.forma}
          hat={agent.chapeu}
          hatColor={agent.corChapeu}
          eyewear={agent.oculos}
          extras={agent.extras}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">
            {agent.nome}
            {agent.principal && <span className="ml-2 rounded-full bg-amber-300/15 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">Principal</span>}
          </p>
          <p className="truncate text-xs text-white/40">{agent.papel || "Sem papel definido"}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-2 text-white/40 transition-colors hover:bg-white/10 hover:text-white">
          <span className="block text-lg leading-none">×</span>
        </button>
        <button type="button" onClick={onEdit} aria-label="Editar agente" className="rounded-full p-2 text-white/40 transition-colors hover:bg-white/10 hover:text-white">
          <Icon as={Setting2} size={18} />
        </button>
      </header>

      <div className="flex gap-1 px-4 pt-3">
        {([["conversa", "Conversa"], ["agentes", `Entre agentes${trafego.length ? ` · ${trafego.length}` : ""}`]] as const).map(([k, t]) => (
          <button
            key={k}
            type="button"
            onClick={() => setAba(k)}
            className={cn("rounded-full px-3 py-1 text-xs font-bold transition-colors", aba === k ? "bg-white text-black" : "text-white/50 hover:bg-white/10")}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-4">
        <p className="rounded-xl bg-amber-300/[0.08] px-3 py-2 text-[11px] text-amber-200/80">
          Nenhum motor está ligado: as mensagens ficam salvas no histórico, mas {agent.nome} ainda não responde sozinho.
        </p>
        {lista.length === 0 ? (
          <p className="py-10 text-center text-sm text-white/35">
            {aba === "conversa" ? "Nenhuma mensagem ainda. Comece a conversa abaixo." : "Este agente ainda não trocou mensagens com outros."}
          </p>
        ) : (
          lista.map((m) =>
            aba === "conversa" ? (
              <Bubble key={m.id} m={m} minha={m.de === VOCE} />
            ) : (
              <Bubble key={m.id} m={m} minha={m.de === agent.id} autor={`${nome(m.de)} → ${nome(m.para)}`} />
            ),
          )
        )}
        <div ref={fim} />
      </div>

      <footer className="border-t border-white/[0.06] p-4">
        {aba === "conversa" ? (
          <Composer placeholder={`Escreva para ${agent.nome}…`} onSend={(t) => sendMessage(VOCE, agent.id, t)} />
        ) : outros.length === 0 ? (
          <p className="text-center text-xs text-white/35">Crie outro agente para eles poderem conversar.</p>
        ) : (
          <Composer
            placeholder={`${agent.nome} diz…`}
            onSend={(t) => sendMessage(agent.id, alvo, t)}
            leading={
              <select
                value={alvo}
                onChange={(e) => setDestino(e.target.value)}
                aria-label="Enviar para"
                className="max-w-[9rem] shrink-0 rounded-full bg-white/[0.06] px-3 py-2.5 text-xs font-semibold text-white outline-none"
              >
                {outros.map((o) => (
                  <option key={o.id} value={o.id} className="bg-[#2F2D2E]">
                    para {o.nome}
                  </option>
                ))}
              </select>
            }
          />
        )}
      </footer>
    </section>
  );
}

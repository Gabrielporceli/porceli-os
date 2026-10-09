import { useSyncExternalStore } from "react";
import type { CanvasAgent } from "@/components/ui/agents-canvas";

/**
 * Agentes e conversas, salvos no navegador. Não há motor ligado: o que o
 * usuário (ou um agente) escreve fica gravado, mas ninguém responde sozinho.
 * Quando houver um motor, é aqui que ele entra (chamando `sendMessage` com
 * `de` = id do agente), sem mexer na interface.
 */
export interface StoredAgent extends CanvasAgent {
  /** Instruções do agente (o "prompt de sistema"). */
  prompt: string;
  /** O agente principal coordena os outros; só um por vez. */
  principal?: boolean;
  criadoEm: number;
}

export const VOCE = "voce" as const;

export interface AgentMessage {
  id: string;
  /** "voce" ou o id de um agente. */
  de: string;
  para: string;
  texto: string;
  em: number;
}

interface State {
  agents: StoredAgent[];
  messages: AgentMessage[];
}

const KEY = "agents-hub:v1";

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return { agents: p.agents ?? [], messages: p.messages ?? [] };
    }
  } catch {
    /* storage indisponível ou corrompido: começa vazio */
  }
  return { agents: [], messages: [] };
}

let state: State = load();
const listeners = new Set<() => void>();

function commit(next: State) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* sem storage: vale só nesta sessão */
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useAgentsState = () => useSyncExternalStore(subscribe, () => state);

const uid = () => crypto.randomUUID();

export type AgentDraft = Omit<StoredAgent, "id" | "criadoEm" | "status" | "principal">;

export function createAgent(draft: AgentDraft & { principal?: boolean }): string {
  const id = uid();
  // O primeiro agente criado vira o principal.
  const principal = draft.principal || state.agents.length === 0;
  const agent: StoredAgent = { ...draft, id, status: "parado", principal, criadoEm: Date.now() };
  const agents = principal ? state.agents.map((a) => ({ ...a, principal: false })) : state.agents;
  commit({ ...state, agents: [...agents, agent] });
  return id;
}

export function updateAgent(id: string, patch: Partial<AgentDraft>) {
  commit({ ...state, agents: state.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)) });
}

export function setPrincipal(id: string) {
  commit({ ...state, agents: state.agents.map((a) => ({ ...a, principal: a.id === id })) });
}

export function deleteAgent(id: string) {
  const agents = state.agents.filter((a) => a.id !== id);
  // Sem principal depois da exclusão: o mais antigo assume.
  if (agents.length && !agents.some((a) => a.principal)) agents[0] = { ...agents[0], principal: true };
  commit({
    agents,
    messages: state.messages.filter((m) => m.de !== id && m.para !== id),
  });
}

export function sendMessage(de: string, para: string, texto: string) {
  const t = texto.trim();
  if (!t) return;
  commit({ ...state, messages: [...state.messages, { id: uid(), de, para, texto: t, em: Date.now() }] });
}

/** Conversa direta entre o usuário e um agente. */
export const chatWith = (messages: AgentMessage[], id: string) =>
  messages.filter((m) => (m.de === VOCE && m.para === id) || (m.de === id && m.para === VOCE));

/** Mensagens trocadas entre este agente e outros agentes. */
export const agentTraffic = (messages: AgentMessage[], id: string) =>
  messages.filter((m) => m.de !== VOCE && m.para !== VOCE && (m.de === id || m.para === id));

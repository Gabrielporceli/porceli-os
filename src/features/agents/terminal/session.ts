/**
 * Sessão de terminal de um agente.
 *
 * O terminal na tela (xterm.js) só conhece esta interface: manda o que o
 * usuário digita (`input`), recebe o que deve aparecer (`onOutput`) e avisa
 * quando muda de tamanho (`resize`). Quem está do outro lado não importa.
 *
 * Hoje só existe a DemoSession, que roda no navegador. Quando o Hermes estiver
 * na VPS, entra uma sessão por WebSocket ligada ao tmux de cada agente
 * (mesma interface), e a tela não muda.
 */
import {
  VOCE,
  getAgentsState,
  sendMessage,
  setAgentStatus,
  subscribeAgents,
  type AgentMessage,
  type StoredAgent,
} from "../agentsStore";
import { ansi, corDoAgente } from "./cores";

export interface TerminalSession {
  input(data: string): void;
  onOutput(cb: (data: string) => void): () => void;
  resize(cols: number, rows: number): void;
  dispose(): void;
}

// ANSI
const R = "\x1b[0m";
const B = "\x1b[1m";
const DIM = "\x1b[2m";
const ROXO = "\x1b[38;5;141m";
const VERDE = "\x1b[38;5;114m";
const VERMELHO = "\x1b[38;5;203m";
const AZUL = "\x1b[38;5;117m";
const AMARELO = "\x1b[38;5;222m";

const sem = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const hora = (t: number) => new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

/** Primeira palavra do nome, sem acento: é como o agente é chamado nos comandos. */
export const apelido = (a: Pick<StoredAgent, "nome">) => sem(a.nome).split(/\s+/)[0];

/**
 * Shell de demonstração: comandos locais e troca de mensagens entre agentes
 * pelo agentsStore — a linha animada no canvas vem dessas mensagens.
 */
export class DemoSession implements TerminalSession {
  private listeners = new Set<(d: string) => void>();
  private buffer = "";
  private history: string[] = [];
  private histIdx = -1;
  private vistos: Set<string>;
  private unsub: () => void;

  constructor(private agentId: string) {
    // Mensagens que já existiam não "chegam" de novo; só as novas.
    this.vistos = new Set(getAgentsState().messages.map((m) => m.id));
    this.unsub = subscribeAgents(() => this.receber());
  }

  private get agente() {
    return getAgentsState().agents.find((a) => a.id === this.agentId);
  }

  private nome(id: string) {
    if (id === VOCE) return "você";
    return getAgentsState().agents.find((a) => a.id === id)?.nome ?? "agente removido";
  }

  private out(d: string) {
    this.listeners.forEach((l) => l(d));
  }

  private println(s = "") {
    this.out(s.replace(/\n/g, "\r\n") + "\r\n");
  }

  /** Cor do agente, lida a cada uso: trocar a cor vale no próximo prompt. */
  private get cor() {
    const a = this.agente;
    return a ? ansi(corDoAgente(a)) : ROXO;
  }

  private prompt() {
    this.out(`${this.cor}${B}${apelido(this.agente ?? { nome: "agente" })}${R} ${DIM}❯${R} `);
  }

  /** Imprime algo sem atropelar o que o usuário está digitando. */
  private interromper(texto: string) {
    this.out("\r\x1b[2K");
    this.println(texto);
    this.prompt();
    this.out(this.buffer);
  }

  private linhaMsg(m: AgentMessage) {
    const doMesmo = m.de === this.agentId;
    const seta = doMesmo ? `${AZUL}→ ${this.nome(m.para)}` : `${AMARELO}← ${this.nome(m.de)}`;
    return `${DIM}${hora(m.em)}${R} ${seta}${R}  ${m.texto}`;
  }

  private receber() {
    for (const m of getAgentsState().messages) {
      if (this.vistos.has(m.id)) continue;
      this.vistos.add(m.id);
      // Só o que chega de OUTRO agente; o que este terminal enviou já foi impresso.
      if (m.para === this.agentId && m.de !== this.agentId && m.de !== VOCE) this.interromper(this.linhaMsg(m));
    }
  }

  start() {
    const a = this.agente;
    this.println(`${this.cor}${B}Hermes${R} ${DIM}·${R} ${B}${a?.nome ?? "agente"}${R}${a?.principal ? `  ${AMARELO}[principal]${R}` : ""}`);
    if (a?.papel) this.println(`${DIM}${a.papel}${R}`);
    this.println(`${DIM}Modo demonstração: este terminal ainda não está ligado à VPS. Digite ${R}ajuda${DIM}.${R}`);
    const recentes = getAgentsState()
      .messages.filter((m) => m.de === this.agentId || m.para === this.agentId)
      .slice(-6);
    if (recentes.length) {
      this.println();
      this.println(`${DIM}── últimas mensagens ──${R}`);
      recentes.forEach((m) => this.println(this.linhaMsg(m)));
    }
    this.println();
    this.prompt();
  }

  private executar(linha: string) {
    const [cmd, ...resto] = linha.trim().split(/\s+/);
    const c = sem(cmd ?? "");
    const agentes = getAgentsState().agents;

    if (!c) return;
    if (c === "ajuda" || c === "help") {
      this.println(`${B}Comandos${R}`);
      this.println(`  ${ROXO}agentes${R}                 lista os agentes e o status de cada um`);
      this.println(`  ${ROXO}msg${R} <agente> <texto>    envia uma mensagem para outro terminal`);
      this.println(`  ${ROXO}todos${R} <texto>           envia para todos os outros agentes`);
      this.println(`  ${ROXO}status${R} ativo|parado|erro muda o status deste agente`);
      this.println(`  ${ROXO}limpar${R}                  limpa a tela (ou Ctrl+L)`);
      this.println(`${DIM}O agente é chamado pela primeira palavra do nome: ${agentes.map(apelido).join(", ")}.${R}`);
      return;
    }
    if (c === "limpar" || c === "clear") {
      this.out("\x1b[2J\x1b[3J\x1b[H");
      return;
    }
    if (c === "agentes") {
      for (const a of agentes) {
        const cor = a.status === "ativo" ? VERDE : a.status === "erro" ? VERMELHO : DIM;
        const eu = a.id === this.agentId ? `${DIM} (este)${R}` : "";
        this.println(`  ${cor}●${R} ${B}${apelido(a).padEnd(12)}${R} ${a.papel}${eu}`);
      }
      return;
    }
    if (c === "status") {
      const s = sem(resto[0] ?? "") as StoredAgent["status"];
      if (!["ativo", "parado", "erro"].includes(s)) return this.println(`${VERMELHO}uso: status ativo|parado|erro${R}`);
      setAgentStatus(this.agentId, s);
      return this.println(`${DIM}status: ${s}${R}`);
    }
    if (c === "msg") {
      const alvo = sem(resto[0] ?? "");
      const texto = resto.slice(1).join(" ");
      const dest = agentes.find((a) => a.id !== this.agentId && apelido(a).startsWith(alvo));
      if (!alvo || !texto) return this.println(`${VERMELHO}uso: msg <agente> <texto>${R}`);
      if (!dest) return this.println(`${VERMELHO}nenhum agente chamado "${alvo}". Veja ${R}agentes`);
      sendMessage(this.agentId, dest.id, texto);
      return this.println(`${AZUL}→ ${dest.nome}${R}  ${texto}`);
    }
    if (c === "todos") {
      const texto = resto.join(" ");
      if (!texto) return this.println(`${VERMELHO}uso: todos <texto>${R}`);
      const outros = agentes.filter((a) => a.id !== this.agentId);
      outros.forEach((a) => sendMessage(this.agentId, a.id, texto));
      return this.println(`${AZUL}→ ${outros.length} agentes${R}  ${texto}`);
    }
    // Qualquer outra coisa seria uma instrução para o Hermes.
    sendMessage(VOCE, this.agentId, linha.trim());
    this.println(`${DIM}(sem motor ligado: quando o Hermes estiver na VPS, ele responde aqui)${R}`);
  }

  input(data: string) {
    // Setas para cima/baixo: histórico de comandos.
    if (data === "\x1b[A" || data === "\x1b[B") {
      if (!this.history.length) return;
      this.histIdx =
        data === "\x1b[A"
          ? Math.max(0, (this.histIdx < 0 ? this.history.length : this.histIdx) - 1)
          : Math.min(this.history.length, this.histIdx + 1);
      const linha = this.history[this.histIdx] ?? "";
      this.out("\r\x1b[2K");
      this.prompt();
      this.buffer = linha;
      this.out(linha);
      return;
    }
    if (data.startsWith("\x1b")) return; // outras teclas especiais: ignora

    for (const ch of data) {
      if (ch === "\r") {
        this.out("\r\n");
        const linha = this.buffer;
        this.buffer = "";
        this.histIdx = -1;
        if (linha.trim()) this.history.push(linha);
        this.executar(linha);
        this.prompt();
      } else if (ch === "\x7f" || ch === "\b") {
        if (this.buffer.length) {
          this.buffer = this.buffer.slice(0, -1);
          this.out("\b \b");
        }
      } else if (ch === "\x03") {
        this.buffer = "";
        this.out("^C\r\n");
        this.prompt();
      } else if (ch === "\x0c") {
        this.out("\x1b[2J\x1b[3J\x1b[H");
        this.prompt();
        this.out(this.buffer);
      } else if (ch >= " ") {
        this.buffer += ch;
        this.out(ch);
      }
    }
  }

  onOutput(cb: (d: string) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  resize() {
    /* o shell local não depende do tamanho; o da VPS vai repassar ao tmux */
  }

  dispose() {
    this.unsub();
    this.listeners.clear();
  }
}

/**
 * Sessão de terminal ligada a um agente do Hermes na VPS.
 *
 * Herda o editor de linha da DemoSession (histórico, Ctrl+C, Ctrl+L) e troca o
 * que acontece no Enter: a linha vai para a função hermes-chat, que repassa ao
 * Hermes e devolve a resposta em streaming. O histórico da conversa fica no
 * Hermes, identificado pelo id de sessão guardado aqui no navegador; `nova`
 * começa outra conversa.
 */
import { supabase } from "@/integrations/supabase/client";
import { setAgentStatus } from "../agentsStore";
import { DemoSession } from "./session";

const R = "\x1b[0m";
const B = "\x1b[1m";
const DIM = "\x1b[2m";
const VERMELHO = "\x1b[38;5;203m";
const AMARELO = "\x1b[38;5;222m";

/** Mesmo projeto do cliente Supabase do app (src/integrations/supabase/client.ts). */
const URL_FUNCAO = "https://dygadnfeoiimmbeqbsvt.supabase.co/functions/v1/hermes-chat";

/** Um quadro do SSE: chunk de chat.completion ou evento hermes.tool.progress. */
interface Quadro {
  choices?: { delta?: { content?: string }; finish_reason?: string | null }[];
  status?: string;
  emoji?: string;
  label?: string;
  tool?: string;
}

const chaveSessao = (perfil: string) => `hermes-sessao:${perfil}`;

function novaSessao(perfil: string) {
  const id = `os-${perfil}-${crypto.randomUUID()}`;
  try {
    localStorage.setItem(chaveSessao(perfil), id);
  } catch {
    /* sem storage: a conversa vale até fechar a aba */
  }
  return id;
}

function sessaoAtual(perfil: string) {
  try {
    const id = localStorage.getItem(chaveSessao(perfil));
    if (id) return id;
  } catch {
    /* segue com uma nova */
  }
  return novaSessao(perfil);
}

export class HermesSession extends DemoSession {
  private sessao: string;
  private abortar: AbortController | null = null;

  constructor(agentId: string, private perfil: string) {
    super(agentId);
    this.sessao = sessaoAtual(perfil);
  }

  start() {
    const a = this.agente;
    this.println(`${this.cor}${B}Hermes${R} ${DIM}·${R} ${B}${a?.nome ?? this.perfil}${R}${a?.principal ? `  ${AMARELO}[principal]${R}` : ""}`);
    if (a?.papel) this.println(`${DIM}${a.papel}${R}`);
    this.println(`${DIM}Ligado ao Hermes na VPS. Escreva e dê Enter. ${R}nova${DIM} começa outra conversa, ${R}Ctrl+C${DIM} interrompe.${R}`);
    this.println();
    this.prompt();
  }

  protected executar(linha: string) {
    const texto = linha.trim();
    const c = texto.toLowerCase();
    if (!texto) return;
    if (c === "limpar" || c === "clear") {
      this.out("\x1b[2J\x1b[3J\x1b[H");
      return;
    }
    if (c === "nova" || c === "/new") {
      this.sessao = novaSessao(this.perfil);
      this.println(`${DIM}Conversa nova. O agente não vê mais o que foi dito antes (a memória longa dele continua).${R}`);
      return;
    }
    if (c === "ajuda" || c === "help") {
      this.println(`  ${B}nova${R}     começa outra conversa`);
      this.println(`  ${B}limpar${R}   limpa a tela (ou Ctrl+L)`);
      this.println(`  ${B}Ctrl+C${R}   interrompe a resposta`);
      this.println(`${DIM}Qualquer outra coisa vai para o agente.${R}`);
      return;
    }
    return this.perguntar(texto);
  }

  protected interromperTurno() {
    this.abortar?.abort();
  }

  private async perguntar(texto: string) {
    this.abortar = new AbortController();
    setAgentStatus(this.agentId, "ativo");
    let escreveu = false;
    let erro = false;
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("sessão expirada: entre de novo no sistema");

      const resp = await fetch(URL_FUNCAO, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ agente: this.perfil, mensagem: texto, sessao: this.sessao }),
        signal: this.abortar.signal,
      });
      if (!resp.ok || !resp.body) {
        const corpo = await resp.json().catch(() => ({}));
        throw new Error(corpo.erro ?? `erro ${resp.status}`);
      }

      // SSE: blocos separados por linha em branco; "event:" opcional, "data:" com JSON.
      const leitor = resp.body.pipeThrough(new TextDecoderStream()).getReader();
      let resto = "";
      for (;;) {
        const { value, done } = await leitor.read();
        if (done) break;
        resto += value;
        const blocos = resto.split(/\r?\n\r?\n/);
        resto = blocos.pop() ?? "";
        for (const bloco of blocos) {
          let evento = "";
          let dados = "";
          for (const l of bloco.split(/\r?\n/)) {
            if (l.startsWith("event:")) evento = l.slice(6).trim();
            else if (l.startsWith("data:")) dados += l.slice(5).trim();
          }
          if (!dados || dados === "[DONE]") continue;
          let j: Quadro;
          try {
            j = JSON.parse(dados);
          } catch {
            continue;
          }
          if (evento === "hermes.tool.progress") {
            if (j.status === "running") {
              if (escreveu) this.out("\r\n");
              this.println(`${DIM}${j.emoji ?? "⚙"} ${j.label ?? j.tool}${R}`);
              escreveu = false;
            }
            continue;
          }
          const parte = j.choices?.[0]?.delta?.content;
          if (parte) {
            this.out(parte.replace(/\r?\n/g, "\r\n"));
            escreveu = true;
          }
          const fim = j.choices?.[0]?.finish_reason;
          if (fim === "error") erro = true;
        }
      }
      if (escreveu) this.out("\r\n");
    } catch (e) {
      if (escreveu) this.out("\r\n");
      if ((e as Error).name === "AbortError") {
        this.println(`${DIM}(interrompido)${R}`);
      } else {
        erro = true;
        this.println(`${VERMELHO}${(e as Error).message}${R}`);
      }
    } finally {
      this.abortar = null;
      setAgentStatus(this.agentId, erro ? "erro" : "parado");
    }
  }
}

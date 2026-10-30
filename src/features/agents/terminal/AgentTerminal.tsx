import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { Microphone2 } from "iconsax-react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { getAgentsState } from "../agentsStore";
import { DemoSession, type TerminalSession } from "./session";
import { HermesSession } from "./hermesSession";
import { useDictation } from "./useDictation";
import { comAlfa } from "./cores";

/**
 * Terminal de um agente (xterm.js). Só conversa com a TerminalSession: agente
 * do Hermes usa a HermesSession (VPS); agente criado à mão, a DemoSession.
 */

const TEMA = {
  background: "#0b0b0f",
  foreground: "#e6e6ea",
  cursor: "#a78bfa",
  cursorAccent: "#0b0b0f",
  selectionBackground: "rgba(167,139,250,.35)",
  black: "#1c1c22",
  brightBlack: "#5b5b66",
};

export function AgentTerminal({ agentId, cor = "#a78bfa", onFocus }: { agentId: string; cor?: string; onFocus?: () => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const sessionRef = useRef<TerminalSession | null>(null);

  // O ditado escreve como se fosse digitado, sem Enter: dá para conferir antes de enviar.
  const ditado = useDictation((texto) => {
    sessionRef.current?.input(texto + " ");
    termRef.current?.focus();
  });

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;

    const term = new Terminal({
      theme: { ...TEMA, cursor: cor, selectionBackground: comAlfa(cor, 0.35) },
      fontFamily: '"JetBrains Mono", "Cascadia Code", ui-monospace, Menlo, Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.2,
      cursorBlink: true,
      scrollback: 2000,
      allowProposedApi: false,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(el);

    const perfil = getAgentsState().agents.find((a) => a.id === agentId)?.hermes;
    const session: TerminalSession & { start?: () => void } = perfil
      ? new HermesSession(agentId, perfil)
      : new DemoSession(agentId);
    termRef.current = term;
    sessionRef.current = session;
    const offOut = session.onOutput((d) => term.write(d));
    const offIn = term.onData((d) => session.input(d));
    const offFocus = term.textarea ? (() => {
      const f = () => onFocus?.();
      term.textarea!.addEventListener("focus", f);
      return () => term.textarea?.removeEventListener("focus", f);
    })() : () => {};

    // Ajusta colunas/linhas ao tamanho da janela (arrastar a borda redimensiona).
    const ajustar = () => {
      if (el.clientWidth < 20 || el.clientHeight < 20) return;
      try {
        fit.fit();
        session.resize(term.cols, term.rows);
      } catch {
        /* terminal ainda sem medida */
      }
    };
    const ro = new ResizeObserver(ajustar);
    ro.observe(el);
    ajustar();
    session.start?.();

    return () => {
      ro.disconnect();
      offOut();
      offIn.dispose();
      offFocus();
      session.dispose();
      term.dispose();
      termRef.current = null;
      sessionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  // Trocar a cor do agente muda o cursor e a seleção sem recriar o terminal.
  useEffect(() => {
    if (termRef.current) termRef.current.options.theme = { ...TEMA, cursor: cor, selectionBackground: comAlfa(cor, 0.35) };
  }, [cor]);

  const aviso = ditado.erro ?? (ditado.ouvindo ? ditado.parcial || "Ouvindo…" : null);

  return (
    <div className="agent-term relative h-full w-full px-3 py-2">
      {/* O respiro fica no contêiner de fora: o FitAddon mede o elemento onde o
          xterm foi aberto, e padding nele faria o terminal transbordar. */}
      <div ref={boxRef} className="h-full w-full" />

      {aviso && (
        <div
          className={cn(
            "pointer-events-none absolute bottom-14 right-3 max-w-[75%] truncate rounded-lg px-2.5 py-1 text-xs",
            ditado.erro ? "bg-red-500/15 text-red-300" : "bg-white/10 text-white/80",
          )}
        >
          {aviso}
        </div>
      )}

      <button
        type="button"
        disabled={!ditado.suportado}
        onMouseDown={(e) => e.preventDefault() /* não tira o foco do terminal */}
        onClick={ditado.alternar}
        title={
          !ditado.suportado
            ? "Este navegador não tem ditado por voz (use Chrome ou Edge)"
            : ditado.ouvindo
              ? "Parar de ouvir"
              : "Falar em vez de digitar"
        }
        className={cn(
          "absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full border transition",
          ditado.ouvindo
            ? "animate-pulse border-red-400/60 bg-red-500/25 text-red-200 shadow-[0_0_14px_rgba(248,113,113,.45)]"
            : "border-white/10 bg-white/[0.06] text-white/60 hover:bg-white/[0.12] hover:text-white",
          !ditado.suportado && "cursor-not-allowed opacity-40",
        )}
      >
        <Icon as={Microphone2} size={16} />
      </button>
    </div>
  );
}

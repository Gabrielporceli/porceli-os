import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { DemoSession, type TerminalSession } from "./session";

/**
 * Terminal de um agente (xterm.js). Só conversa com a TerminalSession; trocar
 * a DemoSession pela sessão da VPS é mudar a linha que a cria.
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

export function AgentTerminal({ agentId, onFocus }: { agentId: string; onFocus?: () => void }) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;

    const term = new Terminal({
      theme: TEMA,
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

    const session: TerminalSession & { start?: () => void } = new DemoSession(agentId);
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  // O respiro fica no contêiner de fora: o FitAddon mede o elemento onde o
  // xterm foi aberto, e padding nele faria o terminal transbordar.
  return (
    <div className="agent-term h-full w-full px-3 py-2">
      <div ref={boxRef} className="h-full w-full" />
    </div>
  );
}

/**
 * Post-it aberto: janela flutuante, arrastável, várias ao mesmo tempo.
 *
 * NO CELULAR NÃO FLUTUA. Abaixo de 640px a janela vira tela cheia — arrastar
 * uma janelinha num aparelho de 375px é pior que não ter janela nenhuma, e o
 * celular é onde este sistema mais é usado. Mesmo componente, duas montagens.
 *
 * O arrasto usa Pointer Events com `setPointerCapture`: sem a captura, mover
 * rápido faz o ponteiro sair de cima do cabeçalho e o arrasto "cai" no meio.
 * Ouvir no `window` resolveria também, mas deixaria ouvintes órfãos se o
 * componente desmontasse durante o arrasto.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { CloseCircle, Maximize4, Refresh, Trash } from "iconsax-react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { corPostIt } from "./postit";

export interface PosicaoJanela {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Props {
  id: string;
  titulo: string;
  posicao: PosicaoJanela;
  z: number;
  /** true quando é a janela do topo da pilha. */
  ativa: boolean;
  pendente?: boolean;
  sincronizando?: boolean;
  onFocar: () => void;
  onMover: (p: PosicaoJanela) => void;
  onFechar: () => void;
  onSincronizar?: () => void;
  onExcluir?: () => void;
  children: React.ReactNode;
}

/** Uma média só: o componente precisa saber se monta flutuante ou em cheio. */
function useTelaGrande() {
  const [grande, setGrande] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 640px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const ouvir = (e: MediaQueryListEvent) => setGrande(e.matches);
    mq.addEventListener("change", ouvir);
    return () => mq.removeEventListener("change", ouvir);
  }, []);
  return grande;
}

const MIN_W = 300;
const MIN_H = 220;

export function PostItWindow({
  id, titulo, posicao, z, ativa, pendente, sincronizando,
  onFocar, onMover, onFechar, onSincronizar, onExcluir, children,
}: Props) {
  const grande = useTelaGrande();
  const cor = corPostIt(id);
  const arrasto = useRef<{ dx: number; dy: number } | null>(null);
  const redim = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  const iniciarArrasto = useCallback(
    (e: React.PointerEvent) => {
      // Os botões (fechar, sincronizar, excluir) moram DENTRO da alça de
      // arrasto. Sem esta saída, o `setPointerCapture` abaixo desvia os
      // eventos seguintes para o cabeçalho e o `click` do botão nunca
      // dispara — os três ficam inertes.
      if ((e.target as HTMLElement).closest("button")) return;
      if (!grande) return;
      onFocar();
      arrasto.current = { dx: e.clientX - posicao.x, dy: e.clientY - posicao.y };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [grande, onFocar, posicao.x, posicao.y]
  );

  const mover = useCallback(
    (e: React.PointerEvent) => {
      if (arrasto.current) {
        // Trava dentro da viewport, deixando uma faixa do cabeçalho sempre
        // alcançável — janela arrastada pra fora da tela não volta mais.
        const x = Math.min(
          Math.max(e.clientX - arrasto.current.dx, -posicao.w + 120),
          window.innerWidth - 60
        );
        const y = Math.min(Math.max(e.clientY - arrasto.current.dy, 0), window.innerHeight - 48);
        onMover({ ...posicao, x, y });
        return;
      }
      if (redim.current) {
        onMover({
          ...posicao,
          w: Math.max(MIN_W, redim.current.w + (e.clientX - redim.current.x)),
          h: Math.max(MIN_H, redim.current.h + (e.clientY - redim.current.y)),
        });
      }
    },
    [onMover, posicao]
  );

  const soltar = useCallback((e: React.PointerEvent) => {
    arrasto.current = null;
    redim.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* já solto */ }
  }, []);

  // Camadas: o header do sistema está em z-60. No desktop a janela fica
  // ABAIXO dele de propósito, pra o menu continuar clicável com post-its
  // abertos. No celular ela é tela cheia e vira modal de fato, então sobe
  // acima — senão o cabeçalho do sistema cobriria o botão de fechar.
  const estilo: React.CSSProperties = grande
    ? { left: posicao.x, top: posicao.y, width: posicao.w, height: posicao.h, zIndex: z }
    : { inset: 0, zIndex: 70 };

  return (
    <div
      className={cn(
        "fixed flex flex-col overflow-hidden border backdrop-blur-2xl",
        grande ? "rounded-3xl" : "rounded-none"
      )}
      style={{
        ...estilo,
        background: "rgba(16,16,20,0.92)",
        borderColor: ativa ? cor.fita : "rgba(255,255,255,0.10)",
        boxShadow: ativa
          ? "0 24px 70px rgba(0,0,0,0.65)"
          : "0 12px 40px rgba(0,0,0,0.45)",
      }}
      onPointerDown={onFocar}
    >
      {/* Cabeçalho = alça de arrasto. `touch-none` impede o navegador de
          rolar a página enquanto se arrasta com o dedo/caneta. */}
      <div
        onPointerDown={iniciarArrasto}
        onPointerMove={mover}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        className={cn(
          "flex shrink-0 items-center gap-2 border-b border-white/[0.07] px-3 py-2.5",
          grande && "cursor-grab touch-none active:cursor-grabbing"
        )}
        style={{ background: cor.fundo }}
      >
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: cor.fita }} />
        <span className="flex-1 truncate text-xs font-bold text-white/85">
          {titulo || "Sem título"}
        </span>

        {pendente && (
          <span
            title="Editada aqui e ainda não enviada ao cofre"
            className="shrink-0 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300"
          >
            pendente
          </span>
        )}

        {onSincronizar && (
          <button
            type="button"
            onClick={onSincronizar}
            disabled={sincronizando}
            title="Enviar esta nota para o cofre"
            className="shrink-0 rounded-lg p-1 text-white/45 transition-colors hover:bg-white/10 hover:text-white/80 disabled:opacity-40"
          >
            <Icon as={Refresh} size={14} className={sincronizando ? "animate-spin" : ""} />
          </button>
        )}
        {onExcluir && (
          <button
            type="button"
            onClick={onExcluir}
            title="Excluir nota"
            className="shrink-0 rounded-lg p-1 text-white/45 transition-colors hover:bg-rose-500/15 hover:text-rose-300"
          >
            <Icon as={Trash} size={14} />
          </button>
        )}
        <button
          type="button"
          onClick={onFechar}
          title="Fechar"
          className="shrink-0 rounded-lg p-1 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Icon as={CloseCircle} size={15} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>

      {grande && (
        <div
          onPointerDown={(e) => {
            onFocar();
            redim.current = { x: e.clientX, y: e.clientY, w: posicao.w, h: posicao.h };
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={mover}
          onPointerUp={soltar}
          onPointerCancel={soltar}
          title="Redimensionar"
          className="absolute bottom-0 right-0 cursor-nwse-resize touch-none p-1.5 text-white/20 hover:text-white/50"
        >
          <Icon as={Maximize4} size={13} />
        </div>
      )}
    </div>
  );
}

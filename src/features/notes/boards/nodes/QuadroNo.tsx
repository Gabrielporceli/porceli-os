/**
 * O nó dos quadros. Um componente só para mapa mental e fluxograma — o que
 * muda entre eles é a FORMA, decidida pelo papel.
 *
 * A forma não é decoração: num fluxograma, losango significa decisão e pílula
 * significa começo/fim. Desenhar tudo como retângulo tiraria a única coisa que
 * faz um fluxograma ser lido sem legenda.
 *
 * O losango é feito com um quadrado rotacionado 45° ATRÁS do texto, e não com
 * `transform` no nó inteiro: rotacionar o nó rotacionaria o texto junto e
 * bagunçaria as âncoras de conexão do React Flow.
 */
import { memo, useEffect, useRef, useState } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { corDoNo, type DadosNo } from "../types";

const LADOS = [
  { id: "top", position: Position.Top },
  { id: "right", position: Position.Right },
  { id: "bottom", position: Position.Bottom },
  { id: "left", position: Position.Left },
] as const;

/** Medidas por papel. O losango precisa ser quadrado pra girar direito. */
function medidas(papel: DadosNo["papel"]) {
  if (papel === "central") return { w: 190, h: 76, raio: "1.75rem", peso: "font-black", texto: "text-sm" };
  if (papel === "decisao") return { w: 150, h: 150, raio: "0.5rem", peso: "font-bold", texto: "text-xs" };
  if (papel === "inicio" || papel === "fim") return { w: 150, h: 56, raio: "999px", peso: "font-bold", texto: "text-xs" };
  return { w: 170, h: 66, raio: "1rem", peso: "font-semibold", texto: "text-xs" };
}

export const QuadroNo = memo(function QuadroNo({ id, data, selected }: NodeProps) {
  const d = data as DadosNo;
  const { setNodes } = useReactFlow();
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(d.texto);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Texto vindo de fora (desfazer, outra aba) não pode ser engolido pelo
  // estado local — mas só enquanto não está sendo editado, senão apagaria
  // o que a pessoa acabou de digitar.
  useEffect(() => { if (!editando) setTexto(d.texto); }, [d.texto, editando]);

  useEffect(() => {
    if (editando) { inputRef.current?.focus(); inputRef.current?.select(); }
  }, [editando]);

  const confirmar = () => {
    setEditando(false);
    setNodes((ns) =>
      ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, texto } } : n))
    );
  };

  const cor = corDoNo(d.cor);
  const m = medidas(d.papel);
  const eLosango = d.papel === "decisao";

  return (
    <div
      className="group relative flex items-center justify-center"
      style={{ width: m.w, height: m.h }}
      onDoubleClick={() => setEditando(true)}
    >
      {/* Corpo. No losango é um quadrado girado; nos demais, o próprio bloco. */}
      <div
        className="absolute inset-0 backdrop-blur-sm transition-shadow"
        style={{
          background: cor.fundo,
          border: `1.5px solid ${cor.borda}`,
          borderRadius: m.raio,
          transform: eLosango ? "rotate(45deg)" : undefined,
          boxShadow: selected ? `0 0 0 2px ${cor.borda}, 0 8px 28px rgba(0,0,0,0.45)` : "0 4px 16px rgba(0,0,0,0.3)",
        }}
      />

      <div
        className="relative z-[1] flex h-full w-full items-center justify-center px-3 text-center"
        style={eLosango ? { padding: "0 1.75rem" } : undefined}
      >
        {editando ? (
          <textarea
            ref={inputRef}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onBlur={confirmar}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); confirmar(); }
              if (e.key === "Escape") { setTexto(d.texto); setEditando(false); }
            }}
            // `nodrag` impede o React Flow de arrastar o nó ao selecionar texto.
            className={`nodrag w-full resize-none bg-transparent text-center ${m.texto} ${m.peso} text-white outline-none`}
            rows={2}
          />
        ) : (
          <span className={`line-clamp-3 break-words ${m.texto} ${m.peso} text-white/90`}>
            {d.texto || <span className="text-white/30">duplo clique</span>}
          </span>
        )}
      </div>

      {/* Âncoras nos quatro lados, visíveis no hover ou com o nó selecionado.
          Com ConnectionMode.Loose qualquer uma serve de origem ou destino. */}
      {LADOS.map(({ id: lado, position }) => (
        <Handle
          key={lado}
          id={lado}
          type="source"
          position={position}
          className={`!h-2.5 !w-2.5 !border-2 !border-white !transition-opacity group-hover:!opacity-100 ${
            selected ? "!opacity-100" : "!opacity-0"
          }`}
          style={{ background: cor.borda }}
        />
      ))}
    </div>
  );
});

/**
 * O nó dos quadros. Um componente só para mapa mental e fluxograma.
 *
 * A forma não é decoração: num fluxograma, losango significa decisão e pílula
 * significa começo/fim. O papel sugere a forma, e a pessoa pode trocar por
 * card (retângulo, pílula, círculo, losango, triângulo).
 *
 * Losango e triângulo são desenhados num SVG ATRÁS do texto, e não com
 * `transform` ou `clip-path` no nó inteiro: girar o nó giraria o texto junto e
 * bagunçaria as âncoras de conexão do React Flow, e o clip-path cortaria a borda.
 */
import { memo, useEffect, useRef, useState, type CSSProperties } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { corDoNo, formaDoNo, tamanhoDoNo, type DadosNo, type FormaNo } from "../types";

const LADOS = [
  { id: "top", position: Position.Top },
  { id: "right", position: Position.Right },
  { id: "bottom", position: Position.Bottom },
  { id: "left", position: Position.Left },
] as const;

/** Pontos do contorno das formas em SVG, numa caixa de 100×100. */
const POLIGONO: Partial<Record<FormaNo, string>> = {
  losango: "50,1.5 98.5,50 50,98.5 1.5,50",
  triangulo: "50,1.5 98.5,98.5 1.5,98.5",
};

/** Arredondamento das formas desenhadas com o próprio bloco. */
function raio(forma: FormaNo, central: boolean) {
  if (forma === "pilula" || forma === "circulo") return "999px";
  return central ? "1.75rem" : "1rem";
}

/** Respiro do texto: no losango e no triângulo a área útil é menor. */
const RESPIRO: Partial<Record<FormaNo, CSSProperties>> = {
  losango: { padding: "0 1.9rem" },
  triangulo: { padding: "38% 2.4rem 0.6rem" },
  circulo: { padding: "0 1rem" },
};

/** No triângulo, as âncoras dos lados ficam no meio das faces inclinadas. */
function posicaoDaAncora(forma: FormaNo, lado: string): CSSProperties | undefined {
  if (forma !== "triangulo") return undefined;
  if (lado === "left") return { left: "25%" };
  if (lado === "right") return { right: "25%" };
  return undefined;
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
  const forma = formaDoNo(d);
  const { w, h } = tamanhoDoNo(d);
  const central = d.papel === "central";
  const peso = central ? "font-black" : d.papel === "decisao" || d.papel === "inicio" || d.papel === "fim" ? "font-bold" : "font-semibold";
  const tamanhoTexto = central ? "text-sm" : "text-xs";
  const poligono = POLIGONO[forma];
  const sombra = selected
    ? `drop-shadow(0 0 1.5px ${cor.borda}) drop-shadow(0 8px 20px rgba(0,0,0,0.45))`
    : "drop-shadow(0 4px 12px rgba(0,0,0,0.3))";

  return (
    <div
      className="group relative flex items-center justify-center"
      style={{ width: w, height: h }}
      onDoubleClick={() => setEditando(true)}
    >
      {/* Corpo: SVG nas formas com ponta; nas demais, o próprio bloco. */}
      {poligono ? (
        <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ filter: sombra }}>
          <polygon
            points={poligono}
            fill={cor.fundo}
            stroke={cor.borda}
            strokeWidth={selected ? 2.5 : 1.5}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ) : (
        <div
          className="absolute inset-0 backdrop-blur-sm transition-shadow"
          style={{
            background: cor.fundo,
            border: `1.5px solid ${cor.borda}`,
            borderRadius: raio(forma, central),
            boxShadow: selected ? `0 0 0 2px ${cor.borda}, 0 8px 28px rgba(0,0,0,0.45)` : "0 4px 16px rgba(0,0,0,0.3)",
          }}
        />
      )}

      <div
        className="relative z-[1] flex h-full w-full items-center justify-center px-3 text-center"
        style={RESPIRO[forma]}
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
            className={`nodrag w-full resize-none bg-transparent text-center ${tamanhoTexto} ${peso} text-white outline-none`}
            rows={2}
          />
        ) : (
          <span className={`line-clamp-3 break-words ${tamanhoTexto} ${peso} text-white/90`}>
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
          style={{ background: cor.borda, ...posicaoDaAncora(forma, lado) }}
        />
      ))}
    </div>
  );
});

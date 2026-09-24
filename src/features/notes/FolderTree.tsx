/**
 * Pastas em árvore.
 *
 * O campo `folder` é um CAMINHO ("Áreas/Marketing/Tráfego Pago/Google Ads"),
 * não um nome. Desenhar um botão por caminho distinto dava 23 linhas de texto
 * truncado, cada uma repetindo o prefixo da anterior — o "paredão" que o
 * usuário reclamou. Aqui o caminho é quebrado em nós e só o nível aberto
 * aparece.
 *
 * Contagem é do RAMO INTEIRO, não só das notas soltas naquele nível: uma
 * pasta que só contém subpastas mostraria "0" e pareceria vazia.
 */
import { useMemo, useState } from "react";
import { ArrowDown2, ArrowRight2, Folder2, NoteText } from "iconsax-react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

interface No {
  nome: string;
  caminho: string;
  filhos: No[];
  /** Notas cujo `folder` é exatamente este caminho. */
  proprias: number;
  /** Próprias + tudo abaixo. */
  total: number;
}

function montarArvore(pastas: string[], contagem: Map<string, number>): No[] {
  const raiz: No = { nome: "", caminho: "", filhos: [], proprias: 0, total: 0 };

  for (const caminho of pastas) {
    if (!caminho) continue;
    let atual = raiz;
    const partes = caminho.split("/").filter(Boolean);
    partes.forEach((parte, i) => {
      const parcial = partes.slice(0, i + 1).join("/");
      let filho = atual.filhos.find((f) => f.nome === parte);
      if (!filho) {
        filho = { nome: parte, caminho: parcial, filhos: [], proprias: 0, total: 0 };
        atual.filhos.push(filho);
      }
      atual = filho;
    });
    atual.proprias = contagem.get(caminho) ?? 0;
  }

  // Totais de baixo pra cima, numa passada só.
  const somar = (n: No): number => {
    n.total = n.proprias + n.filhos.reduce((s, f) => s + somar(f), 0);
    return n.total;
  };
  raiz.filhos.forEach(somar);

  const ordenar = (ns: No[]) => {
    ns.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    ns.forEach((n) => ordenar(n.filhos));
  };
  ordenar(raiz.filhos);
  return raiz.filhos;
}

interface Props {
  pastas: string[];
  contagem: Map<string, number>;
  totalGeral: number;
  ativa: string | null;
  onSelecionar: (caminho: string | null) => void;
}

function Ramo({
  no, nivel, ativa, abertos, alternar, onSelecionar,
}: {
  no: No; nivel: number; ativa: string | null;
  abertos: Set<string>; alternar: (c: string) => void;
  onSelecionar: (c: string | null) => void;
}) {
  const aberto = abertos.has(no.caminho);
  const temFilhos = no.filhos.length > 0;
  const selecionado = ativa === no.caminho;

  return (
    <li>
      <div
        className={cn(
          "flex items-center gap-0.5 rounded-xl transition-colors",
          selecionado ? "bg-white/10" : "hover:bg-white/[0.06]"
        )}
        style={{ paddingLeft: nivel * 10 }}
      >
        {/* Abrir/fechar é separado de selecionar: clicar numa pasta pra ver
            as notas dela não deveria obrigar a expandir o ramo. */}
        <button
          type="button"
          onClick={() => temFilhos && alternar(no.caminho)}
          className={cn(
            "shrink-0 rounded-lg p-1 text-white/30 transition-colors",
            temFilhos ? "hover:text-white/70" : "pointer-events-none opacity-0"
          )}
          aria-label={aberto ? "Recolher" : "Expandir"}
        >
          <Icon as={aberto ? ArrowDown2 : ArrowRight2} size={12} />
        </button>

        <button
          type="button"
          onClick={() => onSelecionar(selecionado ? null : no.caminho)}
          className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 pr-2 text-left text-[13px]"
        >
          <Icon as={Folder2} size={13} className="shrink-0 text-white/35" />
          <span className={cn("flex-1 truncate", selecionado ? "text-white" : "text-white/70")}>
            {no.nome}
          </span>
          <span className="shrink-0 text-[10px] text-white/25">{no.total}</span>
        </button>
      </div>

      {aberto && temFilhos && (
        <ul>
          {no.filhos.map((f) => (
            <Ramo
              key={f.caminho} no={f} nivel={nivel + 1} ativa={ativa}
              abertos={abertos} alternar={alternar} onSelecionar={onSelecionar}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function FolderTree({ pastas, contagem, totalGeral, ativa, onSelecionar }: Props) {
  const arvore = useMemo(() => montarArvore(pastas, contagem), [pastas, contagem]);

  // Começa com o primeiro nível aberto: fechado demais esconde que existe
  // estrutura; aberto demais devolve o paredão.
  const [abertos, setAbertos] = useState<Set<string>>(
    () => new Set(arvore.map((n) => n.caminho))
  );

  const alternar = (c: string) =>
    setAbertos((atual) => {
      const novo = new Set(atual);
      if (novo.has(c)) novo.delete(c); else novo.add(c);
      return novo;
    });

  return (
    <ul className="space-y-0.5">
      <li>
        <button
          type="button"
          onClick={() => onSelecionar(null)}
          className={cn(
            "flex w-full items-center gap-1.5 rounded-xl px-2 py-1.5 text-left text-[13px] transition-colors",
            ativa === null ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/[0.06]"
          )}
        >
          <Icon as={NoteText} size={13} className="shrink-0 text-white/35" />
          <span className="flex-1">Todas</span>
          <span className="text-[10px] text-white/25">{totalGeral}</span>
        </button>
      </li>
      {arvore.map((n) => (
        <Ramo
          key={n.caminho} no={n} nivel={0} ativa={ativa}
          abertos={abertos} alternar={alternar} onSelecionar={onSelecionar}
        />
      ))}
    </ul>
  );
}

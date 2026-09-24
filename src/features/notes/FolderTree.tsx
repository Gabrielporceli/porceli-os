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
import { Add, ArrowDown2, ArrowRight2, CloseCircle, Folder2, NoteText } from "iconsax-react";
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
  /**
   * Cria a pasta com uma nota dentro.
   *
   * Pasta aqui NAO e registro — e o caminho da nota. Uma pasta sem nenhuma
   * nota nao existiria em lugar nenhum e sumiria da arvore no proximo
   * carregamento. Entao criar pasta e criar a primeira nota dela.
   */
  onNovaPasta?: (caminho: string) => void;
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

export function FolderTree({ pastas, contagem, totalGeral, ativa, onSelecionar, onNovaPasta }: Props) {
  const [criando, setCriando] = useState(false);
  const [nome, setNome] = useState("");
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

  const confirmar = () => {
    const limpo = nome.trim().replace(/^\/+|\/+$/g, "");
    setCriando(false);
    setNome("");
    if (!limpo || !onNovaPasta) return;
    // Nasce DENTRO da pasta selecionada — e o que se espera ao clicar em "+"
    // com uma pasta aberta. Sem pasta selecionada, vai pra raiz de Áreas.
    const base = ativa ?? "Áreas";
    const caminho = `${base}/${limpo}`;
    setAbertos((a) => new Set([...a, ...caminho.split("/").map((_, i, ps) => ps.slice(0, i + 1).join("/"))]));
    onNovaPasta(caminho);
  };

  return (
    <ul className="space-y-0.5">
      {onNovaPasta && (
        <li>
          {criando ? (
            <div className="flex items-center gap-1 rounded-xl bg-white/10 px-2 py-1">
              <Icon as={Folder2} size={13} className="shrink-0 text-white/40" />
              <input
                autoFocus
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmar();
                  if (e.key === "Escape") { setCriando(false); setNome(""); }
                }}
                onBlur={confirmar}
                placeholder="nome da pasta"
                className="min-w-0 flex-1 bg-transparent py-0.5 text-[13px] text-white placeholder:text-white/25 outline-none"
              />
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); setCriando(false); setNome(""); }}
                className="shrink-0 rounded p-0.5 text-white/30 hover:text-white/70"
                aria-label="Cancelar"
              >
                <Icon as={CloseCircle} size={13} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCriando(true)}
              title={ativa ? `Nova pasta dentro de ${ativa}` : "Nova pasta"}
              className="flex w-full items-center gap-1.5 rounded-xl px-2 py-1.5 text-left text-[13px] text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/80"
            >
              <Icon as={Add} size={13} className="shrink-0" />
              <span className="flex-1 truncate">
                {ativa ? `Nova pasta em ${ativa.split("/").pop()}` : "Nova pasta"}
              </span>
            </button>
          )}
        </li>
      )}
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

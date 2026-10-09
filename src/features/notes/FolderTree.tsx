/**
 * Pastas, sem a árvore do Obsidian.
 *
 * O campo `folder` é um CAMINHO ("Áreas/Marketing/Tráfego Pago/Google Ads"),
 * porque é assim que o cofre organiza os arquivos. Mas a tela não precisa
 * mostrar isso tudo:
 *
 *   • "Áreas" é só a raiz do cofre — esconder.
 *   • Aparece UMA lista de pastas (o primeiro nível) com o total de notas.
 *   • A pasta selecionada abre as subpastas dela, um nível só; o que for mais
 *     fundo fica dentro da subpasta (filtrar por ela traz o ramo inteiro).
 *   • Nada de setinha de expandir/recolher.
 *
 * Contagem é do RAMO INTEIRO: uma pasta que só tem subpastas não pode
 * mostrar "0" e parecer vazia.
 */
import { useMemo, useState } from "react";
import { Add, CloseCircle, Folder2, Trash } from "iconsax-react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/** Raiz do cofre; não aparece na tela e é onde as pastas novas nascem. */
const RAIZ = "Áreas";

interface Pasta {
  nome: string;
  caminho: string;
  total: number;
  filhas: { nome: string; caminho: string; total: number }[];
}

function agrupar(pastas: string[], contagem: Map<string, number>): { lista: Pasta[]; semPasta: number } {
  const topo = new Map<string, Pasta>();
  let semPasta = contagem.get("") ?? 0;

  for (const caminho of pastas) {
    if (!caminho) continue;
    const n = contagem.get(caminho) ?? 0;
    const prefixo = caminho.startsWith(`${RAIZ}/`) ? `${RAIZ}/` : "";
    const partes = caminho.slice(prefixo.length).split("/").filter(Boolean);
    if (partes.length === 0) { semPasta += n; continue; }

    const caminhoTopo = prefixo + partes[0];
    let t = topo.get(caminhoTopo);
    if (!t) {
      t = { nome: partes[0], caminho: caminhoTopo, total: 0, filhas: [] };
      topo.set(caminhoTopo, t);
    }
    t.total += n;

    if (partes.length > 1) {
      const caminhoFilha = `${caminhoTopo}/${partes[1]}`;
      let f = t.filhas.find((x) => x.caminho === caminhoFilha);
      if (!f) {
        f = { nome: partes[1], caminho: caminhoFilha, total: 0 };
        t.filhas.push(f);
      }
      f.total += n;
    }
  }

  const porNome = (a: { nome: string }, b: { nome: string }) => a.nome.localeCompare(b.nome, "pt-BR");
  const lista = [...topo.values()].sort(porNome);
  lista.forEach((p) => p.filhas.sort(porNome));
  return { lista, semPasta };
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
   * nota nao existiria em lugar nenhum e sumiria da lista no proximo
   * carregamento. Entao criar pasta e criar a primeira nota dela.
   */
  onNovaPasta?: (caminho: string) => void;
  /** Pede a exclusão da pasta (e do que há dentro). A confirmação é de quem chama. */
  onExcluirPasta?: (caminho: string, total: number) => void;
}

function Linha({
  nome, total, selecionada, recuo, onClick, onExcluir,
}: {
  nome: string; total: number; selecionada: boolean; recuo?: boolean;
  onClick: () => void; onExcluir?: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex items-center rounded-xl transition-colors",
        selecionada ? "bg-white/10" : "hover:bg-white/[0.06]",
        recuo && "ml-5"
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-1.5 text-left text-[13px]"
      >
        <Icon as={Folder2} size={recuo ? 12 : 13} className="shrink-0 text-white/35" />
        <span className={cn("flex-1 truncate", selecionada ? "text-white" : "text-white/70")}>{nome}</span>
        <span className={cn("shrink-0 text-[10px] text-white/30", onExcluir && "group-hover:hidden")}>{total}</span>
      </button>
      {onExcluir && (
        <button
          type="button"
          onClick={onExcluir}
          title={`Excluir pasta ${nome}`}
          aria-label={`Excluir pasta ${nome}`}
          className="mr-1 hidden shrink-0 rounded-lg p-1 text-white/30 transition-colors hover:bg-red-500/15 hover:text-red-400 group-hover:block"
        >
          <Icon as={Trash} size={13} />
        </button>
      )}
    </div>
  );
}

export function FolderTree({ pastas, contagem, totalGeral, ativa, onSelecionar, onNovaPasta, onExcluirPasta }: Props) {
  const [criando, setCriando] = useState(false);
  const [nome, setNome] = useState("");
  const { lista, semPasta } = useMemo(() => agrupar(pastas, contagem), [pastas, contagem]);

  const confirmar = () => {
    const limpo = nome.trim().replace(/^\/+|\/+$/g, "");
    setCriando(false);
    setNome("");
    if (!limpo || !onNovaPasta) return;
    // Com uma pasta selecionada, a nova nasce dentro dela; sem, no primeiro nível.
    onNovaPasta(`${ativa || RAIZ}/${limpo}`);
  };

  const alternar = (c: string) => onSelecionar(ativa === c ? null : c);

  return (
    <ul className="space-y-0.5">
      <li>
        <Linha nome="Todas" total={totalGeral} selecionada={ativa === null} onClick={() => onSelecionar(null)} />
      </li>

      {lista.map((p) => {
        // A pasta fica "aberta" quando ela ou algo dentro dela está selecionado.
        const aberta = ativa === p.caminho || !!ativa?.startsWith(`${p.caminho}/`);
        return (
          <li key={p.caminho} className="space-y-0.5">
            <Linha
              nome={p.nome}
              total={p.total}
              selecionada={ativa === p.caminho}
              onClick={() => alternar(p.caminho)}
              onExcluir={onExcluirPasta ? () => onExcluirPasta(p.caminho, p.total) : undefined}
            />
            {aberta && p.filhas.map((f) => (
              <Linha
                key={f.caminho}
                recuo
                nome={f.nome}
                total={f.total}
                selecionada={ativa === f.caminho || !!ativa?.startsWith(`${f.caminho}/`)}
                onClick={() => alternar(f.caminho)}
                onExcluir={onExcluirPasta ? () => onExcluirPasta(f.caminho, f.total) : undefined}
              />
            ))}
          </li>
        );
      })}

      {semPasta > 0 && (
        <li>
          <Linha nome="Sem pasta" total={semPasta} selecionada={ativa === ""} onClick={() => alternar("")} />
        </li>
      )}

      {onNovaPasta && (
        <li className="pt-1">
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
              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-[13px] text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/80"
            >
              <Icon as={Add} size={13} className="shrink-0" />
              <span className="flex-1 truncate">
                {ativa ? `Nova pasta em ${ativa.split("/").pop()}` : "Nova pasta"}
              </span>
            </button>
          )}
        </li>
      )}
    </ul>
  );
}

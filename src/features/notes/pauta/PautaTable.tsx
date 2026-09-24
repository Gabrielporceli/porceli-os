/**
 * A pauta: tabela dos ganchos que vão virar post.
 *
 * Tabela e não mural: aqui o que importa é comparar linha com linha — o que
 * já está feito, o que falta formato, quanta coisa tem em cada categoria.
 * Card não deixa varrer com o olho.
 *
 * Edição direta na célula, sem janela: a pauta se mexe o tempo todo, e abrir
 * um diálogo pra trocar o formato de um gancho seria atrito puro.
 */
import { useMemo, useState } from "react";
import { Add, ExportSquare, SearchNormal1, Trash } from "iconsax-react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { usePauta, type Ideia } from "./usePauta";

interface Props {
  ideias: Ideia[];
  isLoading: boolean;
  criar: (p?: Partial<Ideia>) => void;
  atualizar: (id: string, p: Partial<Ideia>) => void;
  remover: (id: string) => void;
}

/** Os formatos que existem em Conteúdo/Formatos, mais o vazio de propósito. */
const FORMATOS = [
  "", "Conversa", "Vídeo Narrado", "Tela Dividida", "Plano de Fundo",
  "Comparação", "Lista e Ranking", "Novelinha", "Trend com Texto",
  "A definir", "A definir (assistir referência)",
];

/** Célula editável: guarda rascunho local e só grava ao sair do campo. */
function Celula({
  valor, onMudar, placeholder, className,
}: { valor: string; onMudar: (v: string) => void; placeholder?: string; className?: string }) {
  const [rascunho, setRascunho] = useState<string | null>(null);
  return (
    <textarea
      value={rascunho ?? valor}
      onChange={(e) => setRascunho(e.target.value)}
      onBlur={() => {
        if (rascunho !== null && rascunho !== valor) onMudar(rascunho);
        setRascunho(null);
      }}
      rows={2}
      placeholder={placeholder}
      className={cn(
        "w-full resize-none bg-transparent leading-snug outline-none placeholder:text-white/20 focus:bg-white/[0.04]",
        className
      )}
    />
  );
}

function Filtro({
  valor, opcoes, onTrocar, rotuloVazio, contar,
}: {
  valor: string | null;
  opcoes: string[];
  onTrocar: (v: string | null) => void;
  rotuloVazio: string;
  contar: (o: string) => number;
}) {
  if (opcoes.length === 0) return null;
  return (
    <select
      value={valor ?? ""}
      onChange={(e) => onTrocar(e.target.value || null)}
      className="rounded-full bg-white/[0.04] px-3 py-1.5 text-xs text-white/70 outline-none"
    >
      <option value="" className="bg-[#15151a]">{rotuloVazio}</option>
      {opcoes.map((o) => (
        <option key={o} value={o} className="bg-[#15151a]">
          {o} ({contar(o)})
        </option>
      ))}
    </select>
  );
}

function Linha({
  ideia, onAtualizar, onRemover,
}: {
  ideia: Ideia;
  onAtualizar: (id: string, p: Partial<Ideia>) => void;
  onRemover: (id: string) => void;
}) {
  return (
    <tr className={cn("group border-b border-white/[0.04]", ideia.feito && "opacity-45")}>
      <td className="px-3 py-2 align-top">
        <button
          type="button"
          onClick={() => onAtualizar(ideia.id, { feito: !ideia.feito })}
          title={ideia.feito ? "Marcar como não feito" : "Marcar como feito"}
          className={cn(
            "mt-1 grid h-4 w-4 place-content-center rounded border text-[10px] transition-colors",
            ideia.feito
              ? "border-primary bg-primary text-white"
              : "border-white/25 hover:border-white/50"
          )}
        >
          {ideia.feito ? "OK" : ""}
        </button>
      </td>

      <td className="px-2 py-2 align-top">
        <Celula
          valor={ideia.gancho}
          onMudar={(v) => onAtualizar(ideia.id, { gancho: v })}
          placeholder="Qual é o gancho?"
          className={cn("text-sm text-white/85", ideia.feito && "line-through")}
        />
        {ideia.observacao && (
          <span className="mt-0.5 block text-[10px] uppercase tracking-wider text-white/25">
            {ideia.observacao}
          </span>
        )}
      </td>

      <td className="px-2 py-2 align-top">
        <Celula
          valor={ideia.categoria}
          onMudar={(v) => onAtualizar(ideia.id, { categoria: v })}
          placeholder="sem categoria"
          className="text-xs text-white/60"
        />
      </td>

      <td className="px-2 py-2 align-top">
        <select
          value={ideia.formato}
          onChange={(e) => onAtualizar(ideia.id, { formato: e.target.value })}
          className={cn(
            "w-full rounded-lg bg-transparent px-1 py-0.5 text-xs outline-none focus:bg-white/[0.06]",
            ideia.formato ? "text-white/70" : "text-white/25"
          )}
        >
          {/* Um formato fora da lista ainda precisa aparecer: sem isto ele
              some do seletor em silencio e a linha parece nao ter formato. */}
          {(FORMATOS.includes(ideia.formato) ? FORMATOS : [...FORMATOS, ideia.formato]).map((f) => (
            <option key={f} value={f} className="bg-[#15151a]">
              {f || "sem formato"}
            </option>
          ))}
        </select>
      </td>

      <td className="px-2 py-2 text-center align-top">
        {ideia.referencia ? (
          <a
            href={ideia.referencia}
            target="_blank"
            /* noreferrer junto: sem ele a página aberta ganha window.opener e
               pode redirecionar esta aba. */
            rel="noopener noreferrer"
            title={ideia.referencia}
            className="inline-block text-white/35 transition-colors hover:text-primary"
          >
            <Icon as={ExportSquare} size={14} />
          </a>
        ) : (
          <span className="text-white/15">—</span>
        )}
      </td>

      <td className="px-2 py-2 text-right align-top">
        <button
          type="button"
          onClick={() => onRemover(ideia.id)}
          title="Excluir"
          className="rounded-lg p-1 text-transparent transition-colors group-hover:text-white/30 hover:!text-rose-300"
        >
          <Icon as={Trash} size={13} />
        </button>
      </td>
    </tr>
  );
}

export function PautaTable({ ideias, isLoading, criar, atualizar, remover }: Props) {
  const [categoria, setCategoria] = useState<string | null>(null);
  const [formato, setFormato] = useState<string | null>(null);
  const [verFeitos, setVerFeitos] = useState(false);
  const [busca, setBusca] = useState("");

  const categorias = useMemo(
    () => [...new Set(ideias.map((i) => i.categoria).filter(Boolean))].sort(),
    [ideias]
  );
  const formatosUsados = useMemo(
    () => [...new Set(ideias.map((i) => i.formato).filter(Boolean))].sort(),
    [ideias]
  );

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return ideias.filter((i) => {
      if (!verFeitos && i.feito) return false;
      if (categoria && i.categoria !== categoria) return false;
      if (formato && i.formato !== formato) return false;
      if (q && !i.gancho.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [ideias, categoria, formato, verFeitos, busca]);

  const feitos = ideias.filter((i) => i.feito).length;

  if (isLoading) {
    return <p className="p-6 text-sm text-white/40">carregando a pauta…</p>;
  }

  return (
    <div className="space-y-3">
      <div className="liquid-glass flex flex-wrap items-center gap-2 rounded-3xl p-3.5">
        <div className="flex min-w-[160px] flex-1 items-center gap-2 rounded-full bg-white/[0.04] px-3 py-1.5">
          <Icon as={SearchNormal1} size={15} className="text-white/35" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar gancho…"
            className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/25 outline-none"
          />
        </div>

        <Filtro
          valor={categoria}
          opcoes={categorias}
          onTrocar={setCategoria}
          rotuloVazio="todas as categorias"
          contar={(c) => ideias.filter((i) => i.categoria === c && (verFeitos || !i.feito)).length}
        />
        <Filtro
          valor={formato}
          opcoes={formatosUsados}
          onTrocar={setFormato}
          rotuloVazio="todos os formatos"
          contar={(f) => ideias.filter((i) => i.formato === f && (verFeitos || !i.feito)).length}
        />

        <button
          type="button"
          onClick={() => setVerFeitos((v) => !v)}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs transition-colors",
            verFeitos
              ? "bg-white/90 font-bold text-black"
              : "bg-white/[0.04] text-white/45 hover:text-white/80"
          )}
        >
          {verFeitos ? "ocultar" : "mostrar"} {feitos} feito{feitos === 1 ? "" : "s"}
        </button>

        <button
          type="button"
          onClick={() => { void criar({ categoria: categoria ?? "", formato: formato ?? "" }); }}
          /* Sem `.bg-primary`: a classe leva backdrop-filter, e um
             backdrop-filter sob o header fixo é o gatilho da tarja de brilho
             — ver CORRIGIR-TARJA-DE-BRILHO.md. */
          style={{ backgroundColor: "hsl(var(--primary))" }}
          className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          <Icon as={Add} size={15} />
          Novo gancho
        </button>
      </div>

      {visiveis.length === 0 ? (
        <section className="liquid-glass rounded-3xl p-5">
          <p className="py-12 text-center text-sm text-white/40">
            {ideias.length === 0 ? "A pauta está vazia." : "Nada com esse filtro."}
          </p>
        </section>
      ) : (
        <section className="liquid-glass overflow-hidden rounded-3xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-widest text-white/35">
                  <th className="w-10 px-3 py-2.5" />
                  <th className="px-2 py-2.5 text-left font-black">Gancho</th>
                  <th className="w-40 px-2 py-2.5 text-left font-black">Categoria</th>
                  <th className="w-44 px-2 py-2.5 text-left font-black">Formato</th>
                  <th className="w-16 px-2 py-2.5 text-center font-black">Ref.</th>
                  <th className="w-10 px-2 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {visiveis.map((i) => (
                  <Linha key={i.id} ideia={i} onAtualizar={atualizar} onRemover={remover} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="px-1 text-[11px] text-white/25">
        {visiveis.length} de {ideias.length} · clique na célula pra editar
      </p>
    </div>
  );
}

/**
 * A mesma tabela, ligada ao banco.
 *
 * A separacao existe pro laboratorio (/dev/notas) renderizar a tabela com
 * dados de mentira: a tela real fica atras do login, e sem isso o visual
 * so seria conferido em producao.
 */
export function PautaConectada() {
  const { ideias, isLoading, criar, atualizar, remover } = usePauta();
  return (
    <PautaTable
      ideias={ideias}
      isLoading={isLoading}
      criar={(p) => { void criar(p); }}
      atualizar={atualizar}
      remover={(id) => { void remover(id); }}
    />
  );
}

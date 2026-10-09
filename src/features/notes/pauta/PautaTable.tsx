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
import { ExportSquare, SearchNormal1, Trash } from "iconsax-react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePauta, type Ideia } from "./usePauta";
import { RoteiroModal } from "./RoteiroModal";

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
  // Radix não aceita value="" num item, então "todos" tem um valor próprio.
  const TODOS = "__todos__";
  return (
    <Select value={valor ?? TODOS} onValueChange={(v) => onTrocar(v === TODOS ? null : v)}>
      <SelectTrigger className="h-9 w-auto min-w-[10rem] gap-2 rounded-full border-0 bg-white/[0.06] px-3.5 py-0 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 focus:ring-0 focus:ring-offset-0 data-[state=open]:bg-white/10">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="min-w-[12rem]">
        <SelectItem value={TODOS} className="rounded-lg text-xs font-medium focus:bg-[#6829C0] focus:text-white">
          {rotuloVazio}
        </SelectItem>
        {opcoes.map((o) => (
          <SelectItem key={o} value={o} className="rounded-lg text-xs font-medium focus:bg-[#6829C0] focus:text-white">
            {o} ({contar(o)})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Linha({
  ideia, onAtualizar, onRemover, onAbrir,
}: {
  ideia: Ideia;
  onAtualizar: (id: string, p: Partial<Ideia>) => void;
  onRemover: (id: string) => void;
  onAbrir: (id: string) => void;
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
        {/* Clicar no gancho abre o modal com o roteiro completo. */}
        <button
          type="button"
          onClick={() => onAbrir(ideia.id)}
          title="Abrir roteiro"
          className={cn(
            "block w-full rounded-lg px-1 py-0.5 text-left text-sm leading-snug text-white/85 transition-colors hover:bg-white/[0.06]",
            ideia.feito && "line-through",
            !ideia.gancho && "text-white/25"
          )}
        >
          {ideia.gancho || "Qual é o gancho?"}
          {ideia.roteiro && (
            <span className="ml-2 rounded-full bg-white/[0.08] px-1.5 py-0.5 align-middle text-[9px] font-bold uppercase tracking-wider text-white/45 no-underline">
              roteiro
            </span>
          )}
        </button>
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
        {/* Um formato fora da lista ainda precisa aparecer: sem isto ele
            some do seletor em silencio e a linha parece nao ter formato. */}
        <Select
          value={ideia.formato || "__vazio__"}
          onValueChange={(v) => onAtualizar(ideia.id, { formato: v === "__vazio__" ? "" : v })}
        >
          <SelectTrigger
            className={cn(
              "h-7 w-full gap-1 rounded-lg border-0 bg-transparent px-1 py-0 text-xs hover:bg-white/[0.06] focus:ring-0 focus:ring-offset-0 data-[state=open]:bg-white/[0.06]",
              ideia.formato ? "text-white/70" : "text-white/25"
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-[12rem]">
            {(FORMATOS.includes(ideia.formato) ? FORMATOS : [...FORMATOS, ideia.formato]).map((f) => (
              <SelectItem key={f || "__vazio__"} value={f || "__vazio__"} className="rounded-lg text-xs font-medium focus:bg-[#6829C0] focus:text-white">
                {f || "sem formato"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
  const [abertaId, setAbertaId] = useState<string | null>(null);

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
      <div className="surface-flat flex flex-wrap items-center gap-2 p-3.5">
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

        <LiquidGlassButton
          tint="primary"
          onClick={() => { void criar({ categoria: categoria ?? "", formato: formato ?? "" }); }}
          className="h-9 px-5 text-xs font-bold uppercase tracking-widest"
        >
          Novo gancho
        </LiquidGlassButton>
      </div>

      {visiveis.length === 0 ? (
        <section className="surface-flat p-5">
          <p className="py-12 text-center text-sm text-white/40">
            {ideias.length === 0 ? "A pauta está vazia." : "Nada com esse filtro."}
          </p>
        </section>
      ) : (
        <section className="surface-flat overflow-hidden">
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
                  <Linha key={i.id} ideia={i} onAtualizar={atualizar} onRemover={remover} onAbrir={setAbertaId} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="px-1 text-[11px] text-white/25">
        {visiveis.length} de {ideias.length} · clique no gancho pra abrir o roteiro
      </p>

      <RoteiroModal
        ideia={ideias.find((i) => i.id === abertaId) ?? null}
        formatos={FORMATOS}
        onAtualizar={atualizar}
        onClose={() => setAbertaId(null)}
      />
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

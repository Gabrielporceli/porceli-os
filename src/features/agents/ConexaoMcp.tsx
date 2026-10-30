/**
 * Conexão do MCP: o endereço e as chaves com que o Hermes (ou qualquer
 * cliente MCP) entra no sistema.
 *
 * A chave é gerada no banco (`mcp_criar_chave`), que guarda só o hash: ela
 * aparece aqui uma vez, logo depois de criada, com o trecho de config pronto.
 * Perdeu, revoga e gera outra.
 */
import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Copy, TickCircle, Trash } from "iconsax-react";
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

/** Mesmo projeto do cliente Supabase do app (src/integrations/supabase/client.ts). */
const URL_MCP = "https://dygadnfeoiimmbeqbsvt.supabase.co/functions/v1/mcp";

interface Chave {
  id: string;
  nome: string;
  prefixo: string;
  created_at: string;
  ultimo_uso: string | null;
  revogada_em: string | null;
  /** Ferramentas permitidas; vazio = acesso completo. */
  ferramentas: string[] | null;
}

/** Chave para os agentes de tráfego: o MCP recusa qualquer outra ferramenta. */
const SO_FICHA = ["ficha_do_cliente"];

const rotulo = "text-[10px] font-black uppercase tracking-widest text-white/40";

function configHermes(chave: string) {
  return `mcp_servers:
  porceli:
    url: "${URL_MCP}"
    headers:
      Authorization: "Bearer ${chave}"`;
}

function BotaoCopiar({ texto, titulo = "Copiar" }: { texto: string; titulo?: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      title={titulo}
      className="acao-vidro so-icone"
      onClick={async () => {
        await navigator.clipboard.writeText(texto);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 1800);
      }}
    >
      {copiado
        ? <TickCircle size={14} color="currentColor" className="text-emerald-300" />
        : <Copy size={14} color="currentColor" />}
    </button>
  );
}

export function ConexaoMcp() {
  // `mcp_chaves` e as RPCs ainda não estão nos tipos gerados do Supabase.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const [chaves, setChaves] = useState<Chave[] | null>(null);
  const [nome, setNome] = useState("");
  const [soFicha, setSoFicha] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [nova, setNova] = useState<{ nome: string; chave: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const { data } = await sb.from("mcp_chaves")
      .select("id, nome, prefixo, created_at, ultimo_uso, revogada_em, ferramentas")
      .order("revogada_em", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: false });
    setChaves((data ?? []) as Chave[]);
  }, [sb]);

  useEffect(() => { carregar(); }, [carregar]);

  const gerar = async () => {
    setGerando(true);
    setErro(null);
    const { data, error } = await sb.rpc("mcp_criar_chave", { p_nome: nome, p_ferramentas: soFicha ? SO_FICHA : null });
    setGerando(false);
    if (error) { setErro(error.message); return; }
    setNova({ nome: nome.trim(), chave: data as string });
    setNome("");
    setSoFicha(false);
    carregar();
  };

  const revogar = async (c: Chave) => {
    if (!window.confirm(`Revogar "${c.nome}"? Quem usa esta chave perde o acesso na hora.`)) return;
    const { error } = await sb.rpc("mcp_revogar_chave", { p_id: c.id });
    if (error) { setErro(error.message); return; }
    carregar();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className={rotulo}>Endereço do MCP</p>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-xl bg-white/[0.04] px-3 py-2.5 font-mono text-[12px] text-white/80">
            {URL_MCP}
          </code>
          <BotaoCopiar texto={URL_MCP} />
        </div>
        <p className="text-[11px] text-white/35">Streamable HTTP. A chave vai no cabeçalho <code>Authorization: Bearer …</code>.</p>
      </div>

      <div className="space-y-3">
        <p className={rotulo}>Nova chave</p>
        <form
          className="flex gap-2"
          onSubmit={(e) => { e.preventDefault(); if (nome.trim()) gerar(); }}
        >
          <Input
            autoComplete="off"
            placeholder="Nome, ex.: Hermes na VPS"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="h-11 flex-1 rounded-xl border-white/[0.08] bg-white/[0.04] text-white"
          />
          <LiquidGlassButton
            type="submit"
            tint="primary"
            disabled={gerando || !nome.trim()}
            className="h-11 shrink-0 px-5 text-xs font-bold uppercase tracking-widest"
          >
            Gerar chave
          </LiquidGlassButton>
        </form>
        <label className="flex items-center gap-2 text-[12px] text-white/60">
          <input type="checkbox" checked={soFicha} onChange={(e) => setSoFicha(e.target.checked)} />
          Só a ficha do cliente (para os agentes de tráfego): o MCP recusa qualquer outra ferramenta com esta chave.
        </label>
        {erro && <p className="text-[12px] text-rose-300/90">{erro}</p>}

        {/* A chave só existe aqui e agora: o banco guarda o hash. */}
        {nova && (
          <div className="space-y-3 rounded-2xl bg-amber-400/10 p-4">
            <p className="text-[13px] text-white/85">
              <strong>Copie agora.</strong> A chave “{nova.nome}” não aparece de novo. Se perder, revogue e gere outra.
            </p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 break-all rounded-xl bg-black/30 px-3 py-2.5 font-mono text-[12px] text-white">
                {nova.chave}
              </code>
              <BotaoCopiar texto={nova.chave} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-white/50">Config do Hermes (~/.hermes/config.yaml)</p>
                <BotaoCopiar texto={configHermes(nova.chave)} titulo="Copiar config" />
              </div>
              <pre className="overflow-x-auto rounded-xl bg-black/30 px-3 py-2.5 font-mono text-[11px] text-white/75 scrollbar-hide">
                {configHermes(nova.chave)}
              </pre>
            </div>
            <button type="button" onClick={() => setNova(null)} className="acao-texto">Já copiei</button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className={rotulo}>Chaves</p>
        {chaves === null ? (
          <p className="py-6 text-center text-sm text-white/35">Carregando…</p>
        ) : chaves.length === 0 ? (
          <p className="py-6 text-center text-sm text-white/35">Nenhuma chave. Sem chave, ninguém entra pelo MCP.</p>
        ) : (
          <div className="max-h-[36vh] divide-y divide-white/[0.05] overflow-y-auto rounded-2xl bg-white/[0.03] scrollbar-hide">
            {chaves.map((c) => {
              const revogada = Boolean(c.revogada_em);
              return (
                <div key={c.id} className={cn("flex items-center gap-3 px-4 py-3", revogada && "opacity-50")}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-white">
                      {c.nome}
                      <span className="ml-2 font-mono text-[11px] text-white/35">{c.prefixo}…</span>
                      {c.ferramentas?.length ? (
                        <span className="ml-2 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-white/50">
                          só {c.ferramentas.join(", ")}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[11px] text-white/35">
                      criada em {new Date(c.created_at).toLocaleDateString("pt-BR")}
                      {" · "}
                      {c.ultimo_uso
                        ? `último uso ${formatDistanceToNow(new Date(c.ultimo_uso), { addSuffix: true, locale: ptBR })}`
                        : "nunca usada"}
                    </p>
                  </div>
                  {revogada ? (
                    <span className="shrink-0 rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] text-white/50">Revogada</span>
                  ) : (
                    <button type="button" title="Revogar" onClick={() => revogar(c)} className="acao-vidro so-icone perigo">
                      <Trash size={14} color="currentColor" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Atividade do Hermes: o que ele fez no sistema pelo MCP.
 *
 * Lê `mcp_audit`, onde a Edge Function `mcp` registra cada chamada de
 * ferramenta. Lista só de leitura (padrão 11/17): uma linha por chamada, a
 * mais recente em cima, rolagem por dentro; clicar abre os parâmetros e o
 * erro. Atualiza sozinha a cada 10 s enquanto está aberta.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDown2, TickCircle, CloseCircle } from "iconsax-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PillTabs } from "@/components/ui/pill-tabs";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ConexaoMcp } from "./ConexaoMcp";

interface Chamada {
  id: string;
  ferramenta: string;
  argumentos: Record<string, unknown> | null;
  ok: boolean;
  erro: string | null;
  duracao_ms: number | null;
  created_at: string;
}

/** As operações do MCP (supabase/functions/mcp), em português de gente. */
const ROTULOS: Record<string, string> = {
  guia_do_sistema: "Leu o guia do sistema",
  listar_tabelas: "Listou as tabelas",
  descrever_tabela: "Descreveu tabela",
  buscar: "Consultou",
  sql: "SQL (leitura)",
  criar_cliente: "Criou cliente",
  editar_cliente: "Editou cliente",
  excluir_cliente: "Excluiu cliente",
  criar_contrato: "Criou contrato",
  editar_contrato: "Editou contrato",
  renovar_contrato: "Renovou contrato",
  encerrar_contrato: "Encerrou contrato",
  excluir_contrato: "Excluiu contrato",
  marcar_lancamento_pago: "Deu baixa em lançamento",
  gerar_lancamentos_faltantes: "Gerou lançamentos faltantes",
  renegociar: "Renegociou cobranças",
  criar_despesa: "Lançou despesa",
  pagar_despesa: "Pagou despesa",
  excluir_despesa: "Excluiu despesa",
  criar_lead: "Criou lead",
  editar_lead: "Editou lead",
  mover_lead: "Moveu lead",
  excluir_lead: "Excluiu lead",
  listar_agenda: "Consultou a agenda",
  criar_atividade: "Criou atividade",
  editar_atividade: "Editou atividade",
  concluir_tarefa: "Concluiu tarefa",
  excluir_atividade: "Excluiu atividade",
  criar_nota: "Criou nota",
  editar_nota: "Editou nota",
  excluir_nota: "Excluiu nota",
  enviar_whatsapp: "Enviou WhatsApp",
  agendar_mensagem: "Agendou mensagem",
  cancelar_mensagem: "Cancelou mensagem agendada",
  automacoes: "Automações",
  cadastro: "Cadastro",
  pedir_aprovacao: "Pediu aprovação",
  aprovacoes: "Consultou aprovações",
  atualizar_aprovacao: "Atualizou aprovação",
  ficha_do_cliente: "Leu a ficha do cliente",
};

/** O detalhe que identifica a chamada numa linha: tabela, nome, número, ação… */
function resumo(c: Chamada): string {
  const a = c.argumentos ?? {};
  const s = (v: unknown) => (v === undefined || v === null ? "" : String(v));
  switch (c.ferramenta) {
    case "descrever_tabela":
    case "buscar":
      return s(a.tabela);
    case "sql":
      return s(a.query).replace(/\s+/g, " ").slice(0, 90);
    case "criar_cliente":
      return s(a.empresa);
    case "criar_contrato":
      return [s(a.tipo), a.valor_mensal ? `R$ ${Number(a.valor_mensal).toLocaleString("pt-BR")}` : ""].filter(Boolean).join(" · ");
    case "criar_lead":
    case "editar_lead":
      return s(a.nome);
    case "criar_despesa":
      return s(a.descricao);
    case "criar_atividade":
    case "criar_nota":
    case "editar_nota":
      return s(a.titulo);
    case "enviar_whatsapp":
      return s(a.numero);
    case "agendar_mensagem":
      return s(a.telefone);
    case "automacoes":
      return s(a.acao);
    case "cadastro":
      return `${s(a.acao)} ${s(a.tabela)}`;
    default:
      return "";
  }
}

const LIMITE = 200;

export function AtividadeHermes({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [chamadas, setChamadas] = useState<Chamada[] | null>(null);
  const [filtro, setFiltro] = useState("todas");
  const [aberta, setAberta] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    // `mcp_audit` ainda não está nos tipos gerados do Supabase.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("mcp_audit")
      .select("id, ferramenta, argumentos, ok, erro, duracao_ms, created_at")
      .order("created_at", { ascending: false })
      .limit(LIMITE);
    setChamadas((data ?? []) as Chamada[]);
  }, []);

  useEffect(() => {
    if (!open) return;
    carregar();
    const t = setInterval(carregar, 10_000);
    return () => clearInterval(t);
  }, [open, carregar]);

  const erros = useMemo(() => (chamadas ?? []).filter((c) => !c.ok).length, [chamadas]);
  const visiveis = useMemo(
    () => (chamadas ?? []).filter((c) => (filtro === "erros" ? !c.ok : true)),
    [chamadas, filtro],
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="text-white max-w-2xl"
        chip={<DialogTitle className="truncate font-bold tracking-tight">MCP do Hermes</DialogTitle>}
      >
        {/* Mesmo respiro (p-6) dos outros modais do sistema: o DialogContent
            com chip não tem padding próprio. */}
        <div className="space-y-4 p-6">
          {/* Uma linha de abas só: o filtro de erros entra como aba, em vez de
              uma segunda fileira de pílulas dentro de "Atividade". */}
          <div className="flex items-center justify-between gap-3">
            <PillTabs
              items={[
                { value: "todas", label: "Atividade" },
                { value: "erros", label: "Erros", count: erros || undefined },
                { value: "conexao", label: "Conexão" },
              ]}
              value={filtro}
              onChange={setFiltro}
            />
            {filtro !== "conexao" && (
              <span className="text-[11px] text-white/35">
                {chamadas === null ? "" : `últimas ${Math.min(chamadas.length, LIMITE)} chamadas`}
              </span>
            )}
          </div>

          {filtro === "conexao" ? (
            <ConexaoMcp />
          ) : chamadas === null ? (
            <p className="py-10 text-center text-sm text-white/35">Carregando…</p>
          ) : visiveis.length === 0 ? (
            <p className="py-10 text-center text-sm text-white/35">
              {filtro === "erros" ? "Nenhum erro." : "O Hermes ainda não fez nada pelo MCP."}
            </p>
          ) : (
            <div className="max-h-[calc(85vh-15rem)] divide-y divide-white/[0.05] overflow-y-auto rounded-2xl bg-white/[0.03] scrollbar-hide">
              {visiveis.map((c) => {
                const expandida = aberta === c.id;
                const detalhe = resumo(c);
                return (
                  <div key={c.id}>
                    <button
                      type="button"
                      onClick={() => setAberta(expandida ? null : c.id)}
                      aria-expanded={expandida}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
                    >
                      {c.ok
                        ? <TickCircle size={16} color="currentColor" className="shrink-0 text-emerald-300/80" />
                        : <CloseCircle size={16} color="currentColor" className="shrink-0 text-rose-300/90" />}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] text-white">
                          {ROTULOS[c.ferramenta] ?? c.ferramenta}
                          {detalhe && <span className="text-white/45"> · {detalhe}</span>}
                        </p>
                        {!c.ok && c.erro && <p className="truncate text-[11px] text-rose-300/70">{c.erro}</p>}
                      </div>
                      <span className="shrink-0 text-[11px] tabular-nums text-white/35">
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}
                      </span>
                      <ArrowDown2
                        size={14}
                        color="currentColor"
                        className={cn("shrink-0 text-white/30 transition-transform", expandida ? "" : "-rotate-90")}
                      />
                    </button>
                    {expandida && (
                      <div className="space-y-2 px-4 pb-4">
                        <p className="text-[11px] text-white/35">
                          {new Date(c.created_at).toLocaleString("pt-BR")}
                          {c.duracao_ms !== null && ` · ${c.duracao_ms} ms`}
                          {` · ferramenta ${c.ferramenta}`}
                        </p>
                        {c.erro && (
                          <p className="whitespace-pre-wrap rounded-xl bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200/90">{c.erro}</p>
                        )}
                        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-black/30 px-3 py-2 font-mono text-[11px] text-white/70 scrollbar-hide">
                          {JSON.stringify(c.argumentos ?? {}, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

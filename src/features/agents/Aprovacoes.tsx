/**
 * Aprovações dos agentes.
 *
 * Lê `agente_aprovacoes`, onde os agentes registram pelo MCP (`pedir_aprovacao`)
 * o que depende do "ok" do Gabriel. Aqui ele aprova, pede ajuste (com o que
 * mudar) ou recusa; um script na VPS, sem IA, entrega a decisão ao agente pelo
 * Kanban e avisa o resultado no Telegram. Quando o pedido traz `texto` (o que
 * vai ser publicado, ex.: resposta a uma avaliação), ele aparece editável e o
 * que estiver na caixa na hora de aprovar é o que será publicado. O botão mostra quantas estão
 * pendentes e se atualiza a cada 30 s.
 */
import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Check, Pencil } from "lucide-react";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Aprovacao {
  id: string;
  agente: string;
  titulo: string;
  resumo: string | null;
  cliente: string | null;
  texto: string | null;
  created_at: string;
}

type Decisao = "aprovado" | "ajuste" | "recusado";

/** Nome de gente para o profile do Hermes que pediu. */
const AGENTE: Record<string, string> = {
  elly: "Elly", analista: "Analista", estrategista: "Estrategista", "operador-meta": "Meta Ads",
  "operador-google": "Google Ads", cro: "CRO", pesquisa: "Pesquisa", "especialista-tracking": "Tracking",
  "especialista-os": "Porceli OS", "presenca-local": "Presença Local",
};

/** Aprovações pendentes, recarregando a cada 30 s (e na hora, depois de decidir). */
export function useAprovacoesPendentes() {
  const [lista, setLista] = useState<Aprovacao[] | null>(null);
  const carregar = useCallback(async () => {
    const { data } = await supabase
      .from("agente_aprovacoes" as never)
      .select("id, agente, titulo, resumo, cliente, texto, created_at")
      .eq("status", "pendente")
      .order("created_at", { ascending: true });
    setLista((data ?? []) as unknown as Aprovacao[]);
  }, []);
  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 30_000);
    return () => clearInterval(t);
  }, [carregar]);
  return { lista, carregar };
}

/** Botão do topo da Central de Agentes: mesmo padrão dos outros, com o número de pendentes. */
export function BotaoAprovacoes({ pendentes, onClick }: { pendentes: number; onClick: () => void }) {
  return (
    <LiquidGlassButton onClick={onClick} className="h-11 gap-2 px-5 text-xs font-bold uppercase tracking-widest">
      Aprovações
      {pendentes > 0 && (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-black tabular-nums text-white">
          {pendentes}
        </span>
      )}
    </LiquidGlassButton>
  );
}

function Item({ a, onDecidido }: { a: Aprovacao; onDecidido: () => void }) {
  const [ajustando, setAjustando] = useState(false);
  const [texto, setTexto] = useState("");
  const [publicar, setPublicar] = useState(a.texto ?? "");
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState<Decisao | null>(null);
  const temTexto = a.texto !== null;

  const decidir = async (status: Decisao) => {
    if (status === "ajuste" && !texto.trim()) {
      toast.error("Diga o que precisa mudar.");
      return;
    }
    if (status === "aprovado" && temTexto && !publicar.trim()) {
      toast.error("O texto a publicar está vazio.");
      return;
    }
    setSalvando(status);
    const mudancas: Record<string, unknown> = { status, comentario: texto.trim() || null, decidido_em: new Date().toISOString() };
    if (temTexto && status === "aprovado") mudancas.texto = publicar.trim();
    const { error } = await supabase
      .from("agente_aprovacoes" as never)
      .update(mudancas as never)
      .eq("id", a.id)
      .eq("status", "pendente");
    setSalvando(null);
    if (error) {
      toast.error(`Não consegui salvar: ${error.message}`);
      return;
    }
    toast.success(
      status === "aprovado" ? "Aprovado. O agente segue em até 1 minuto e o resultado chega no Telegram."
        : status === "ajuste" ? "Ajuste enviado ao agente."
        : "Recusado.",
    );
    onDecidido();
  };

  return (
    <article className="rounded-2xl bg-white/[0.035] p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
      {/* Cabeçalho: o que decidir, quem pede, de quem é e quando */}
      <header className="space-y-2">
        <h3 className="text-[14px] font-semibold leading-snug text-white">{a.titulo}</h3>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="rounded-full bg-primary/20 px-2.5 py-0.5 font-semibold text-white">{AGENTE[a.agente] ?? a.agente}</span>
          {a.cliente && <span className="rounded-full bg-white/[0.07] px-2.5 py-0.5 font-semibold text-white/80">{a.cliente}</span>}
          <span className="pl-1 text-white/35">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: ptBR })}</span>
        </div>
      </header>

      {a.resumo && (
        <p className="mt-4 whitespace-pre-wrap text-[12.5px] leading-6 text-white/65">{a.resumo}</p>
      )}

      {temTexto && (
        <section className="mt-5 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">Texto que será publicado</p>
          <div className="flex items-start gap-3 rounded-xl bg-black/25 p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
            {editando ? (
              <Textarea
                autoFocus
                value={publicar}
                onChange={(e) => setPublicar(e.target.value)}
                className="min-h-[110px] flex-1 rounded-lg border-white/[0.06] bg-white/[0.03] text-[13px] leading-6 text-white"
              />
            ) : (
              <p className="flex-1 whitespace-pre-wrap text-[13px] leading-6 text-white/90">{publicar || "—"}</p>
            )}
            <button
              type="button"
              onClick={() => setEditando((e) => !e)}
              title={editando ? "Pronto" : "Editar texto"}
              aria-label={editando ? "Pronto" : "Editar texto"}
              className="acao-vidro so-icone shrink-0"
            >
              {editando ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
            </button>
          </div>
        </section>
      )}

      {ajustando && (
        <Textarea
          autoFocus
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="O que precisa mudar?"
          className="mt-5 min-h-[80px] rounded-xl border-white/[0.06] bg-white/[0.03] text-[13px] text-white placeholder:text-white/25"
        />
      )}

      {/* Ações separadas do conteúdo; recusar fica à direita, longe do aprovar */}
      <footer className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-4">
        {ajustando ? (
          <>
            <LiquidGlassButton tint="primary" disabled={!!salvando} onClick={() => decidir("ajuste")}
              className="h-9 px-4 text-[11px] font-bold uppercase tracking-widest">
              Enviar ajuste
            </LiquidGlassButton>
            <button type="button" onClick={() => setAjustando(false)} className="acao-texto px-2">
              Cancelar
            </button>
          </>
        ) : (
          <>
            <LiquidGlassButton tint="primary" disabled={!!salvando} onClick={() => decidir("aprovado")}
              className="h-9 px-5 text-[11px] font-bold uppercase tracking-widest">
              {salvando === "aprovado" ? "Aprovando…" : "Aprovar"}
            </LiquidGlassButton>
            <LiquidGlassButton disabled={!!salvando} onClick={() => setAjustando(true)}
              className="h-9 px-4 text-[11px] font-bold uppercase tracking-widest">
              Pedir ajuste
            </LiquidGlassButton>
            <button type="button" disabled={!!salvando} onClick={() => decidir("recusado")}
              className={cn("ml-auto px-2 text-[11px] font-bold uppercase tracking-widest text-rose-300/70 hover:text-rose-300",
                salvando && "opacity-50")}>
              Recusar
            </button>
          </>
        )}
      </footer>
    </article>
  );
}

export function Aprovacoes({ open, onClose, lista, onMudou }: {
  open: boolean; onClose: () => void; lista: Aprovacao[] | null; onMudou: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-2xl text-white"
        chip={<DialogTitle className="truncate font-bold tracking-tight">Aprovações</DialogTitle>}
      >
        <div className="space-y-4 p-6">
          <p className="text-[11px] text-white/35">
            O que os agentes só fazem com o seu ok. Você também pode responder pelo Telegram.
            {lista && lista.length > 0 && <span className="text-white/55"> · {lista.length} aguardando</span>}
          </p>
          {lista === null ? (
            <p className="py-10 text-center text-sm text-white/35">Carregando…</p>
          ) : lista.length === 0 ? (
            <p className="py-10 text-center text-sm text-white/35">Nada esperando por você.</p>
          ) : (
            <div className="max-h-[calc(85vh-14rem)] space-y-3 overflow-y-auto scrollbar-hide">
              {lista.map((a) => <Item key={a.id} a={a} onDecidido={onMudou} />)}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

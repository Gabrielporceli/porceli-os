/**
 * Central de Agentes — ESQUELETO.
 *
 * Página para acompanhar agentes conectados ao sistema e conversar com
 * eles. A forma está aqui; a ligação com agentes de verdade ainda não
 * existe, então tudo que depende de dados mostra estado vazio em vez de
 * inventar número.
 *
 * O desenho aposta em três coisas que qualquer integração vai precisar,
 * seja ela qual for:
 *   1. uma LISTA de agentes com estado (ativo / parado / com erro);
 *   2. um FLUXO do que eles estão fazendo, em ordem cronológica;
 *   3. um lugar para FALAR com o agente selecionado.
 * Se a integração mudar, o que muda é a fonte dos dados — não o layout.
 */
import { useState } from "react";
import { Cpu, Flash, MessageProgramming, Send2, Setting2 } from "iconsax-react";
import { Icon } from "@/components/ui/icon";
import { PageLoader } from "@/components/ui/PageLoader";
import { usePageReady } from "@/hooks/usePageReady";
import { cn } from "@/lib/utils";

type AgentStatus = "ativo" | "parado" | "erro";

interface Agent {
  id: string;
  nome: string;
  papel: string;
  status: AgentStatus;
}

/** Vazio de propósito: sem fonte de dados, a página mostra o estado vazio. */
const AGENTS: Agent[] = [];

const STATUS_STYLE: Record<AgentStatus, string> = {
  ativo: "bg-emerald-400/15 text-emerald-300",
  parado: "bg-white/10 text-white/50",
  erro: "bg-red-400/15 text-red-300",
};

export default function AgentsHub() {
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const agente = AGENTS.find((a) => a.id === selecionado) ?? null;

  // Mesma convenção das outras telas: quem desenha o "carregando" é a
  // transição do layout (overlay de blur + logo). Sem isto a página nunca
  // avisa que está carregando e a transição não acontece — foi o mesmo
  // motivo de /funnel-maps ficar de fora dela.
  const isReady = usePageReady();
  if (!isReady) return <PageLoader />;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight">Central de Agentes</h1>
          <p className="text-sm text-white/45">
            Acompanhe os agentes conectados e converse com eles.
          </p>
        </div>
        <button
          type="button"
          // Sem `btn-glass-primary` e sem a classe `.bg-primary`: as duas
          // levam `backdrop-filter` (a segunda por causa da regra
          // `.bg-primary:not(...)` do index.css). Um backdrop-filter aqui,
          // logo abaixo do header fixo que também tem um, é exatamente o
          // gatilho da "tarja de brilho" — ver CORRIGIR-TARJA-DE-BRILHO.md,
          // seção 6. A cor vem do tema via style, sem passar pela classe.
          style={{ backgroundColor: "hsl(var(--primary))" }}
          className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          <Icon as={Flash} size={16} />
          Conectar agente
        </button>
      </header>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* ── Agentes ─────────────────────────────────────────────── */}
        <aside className="liquid-glass rounded-3xl p-4 space-y-3 lg:sticky lg:top-32 h-fit">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-widest text-white/45">
              Agentes
            </span>
            <span className="text-xs text-white/30">{AGENTS.length}</span>
          </div>

          {AGENTS.length === 0 ? (
            <div className="rounded-2xl bg-white/[0.03] px-4 py-8 text-center">
              <Icon as={Cpu} size={28} className="mx-auto mb-3 text-white/25" />
              <p className="text-sm text-white/45">Nenhum agente conectado</p>
              <p className="mt-1 text-xs text-white/30">
                Quando você conectar o primeiro, ele aparece aqui.
              </p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {AGENTS.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setSelecionado(a.id)}
                    className={cn(
                      "w-full rounded-2xl px-3 py-2.5 text-left transition-colors",
                      selecionado === a.id ? "bg-white/10" : "hover:bg-white/[0.06]"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold">{a.nome}</span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                          STATUS_STYLE[a.status]
                        )}
                      >
                        {a.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-white/40">{a.papel}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div className="space-y-4 min-w-0">
          {/* ── Atividade ─────────────────────────────────────────── */}
          <section className="liquid-glass rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-widest text-white/45">
                Atividade
              </span>
              <button
                type="button"
                className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                <Icon as={Setting2} size={14} />
                Filtrar
              </button>
            </div>

            <div className="rounded-2xl bg-white/[0.03] px-4 py-12 text-center">
              <Icon as={Flash} size={28} className="mx-auto mb-3 text-white/25" />
              <p className="text-sm text-white/45">Sem atividade ainda</p>
              <p className="mt-1 text-xs text-white/30">
                O que os agentes fizerem no sistema aparece aqui, em ordem.
              </p>
            </div>
          </section>

          {/* ── Conversa ──────────────────────────────────────────── */}
          <section className="liquid-glass rounded-3xl p-5 space-y-4">
            <span className="text-xs font-black uppercase tracking-widest text-white/45">
              {agente ? `Conversa — ${agente.nome}` : "Conversa"}
            </span>

            <div className="rounded-2xl bg-white/[0.03] px-4 py-12 text-center">
              <Icon as={MessageProgramming} size={28} className="mx-auto mb-3 text-white/25" />
              <p className="text-sm text-white/45">
                {agente ? "Nenhuma mensagem ainda" : "Selecione um agente para conversar"}
              </p>
            </div>

            {/* Desabilitado enquanto não há agente: o campo existe pra
                mostrar a forma final, não pra fingir que funciona. */}
            <div className="flex items-center gap-2">
              <input
                disabled
                placeholder={agente ? "Escreva para o agente…" : "Conecte um agente primeiro"}
                className="flex-1 rounded-full bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none disabled:cursor-not-allowed"
              />
              <button
                type="button"
                disabled
                className="rounded-full bg-white/10 p-2.5 text-white/40 disabled:cursor-not-allowed"
                aria-label="Enviar"
              >
                <Icon as={Send2} size={18} />
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Copy, DocumentText } from "iconsax-react";
import { completude, perguntasParaWhatsApp, rotuloDoModelo } from "@/features/clients/fichaCampos";
import { useFichaCliente } from "@/hooks/useFichaCliente";
import { FichaClienteModal } from "./FichaClienteModal";

const card = "rounded-2xl border border-white/[0.06] bg-white/[0.04] px-5 py-4";
const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Cartão da ficha no cadastro do cliente: quanto já foi respondido, o CPL
 * máximo, o botão para copiar as perguntas (o dono responde pelo WhatsApp) e o
 * modal onde a agência registra as respostas.
 */
export function FichaClienteCard({ clientId, empresa, responsavel }: { clientId: string; empresa: string; responsavel?: string }) {
  const { data: ficha, isLoading } = useFichaCliente(clientId);
  const [aberta, setAberta] = useState(false);

  const { respondidos, total } = completude(ficha);
  const situacao = isLoading ? "…"
    : !ficha || respondidos === 0 ? "Pendente"
    : respondidos === total ? "Completa"
    : `${respondidos} de ${total} respondidas`;

  const copiar = async () => {
    try {
      const texto = perguntasParaWhatsApp(empresa, ficha as Record<string, unknown> | null | undefined, responsavel);
      if (!texto) {
        toast.success("A ficha já está completa: não há pergunta pendente para mandar.");
        return;
      }
      await navigator.clipboard.writeText(texto);
      toast.success(respondidos > 0
        ? "Perguntas que faltam copiadas. Cole no WhatsApp do cliente e depois registre as respostas em \"Abrir ficha\"."
        : "Perguntas copiadas. Cole no WhatsApp do cliente e depois registre as respostas em \"Abrir ficha\".");
    } catch {
      toast.error("Não consegui copiar. Tente de novo.");
    }
  };

  return (
    <div className={`${card} flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between`}>
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
          <DocumentText className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/40">Ficha do cliente</span>
          <span className="block truncate text-sm font-medium text-white">
            {situacao}
            {rotuloDoModelo(ficha?.modelo_negocio) ? ` · ${rotuloDoModelo(ficha?.modelo_negocio)}` : ""}
            {ficha?.nicho ? ` · ${ficha.nicho}` : ""}
            {ficha?.cpl_maximo != null ? ` · CPL máximo ${reais(Number(ficha.cpl_maximo))}` : ""}
          </span>
          {ficha?.preenchido_por === "cliente" && ficha.respondido_cliente_em && (
            <span className="block text-xs text-white/40">
              Respondida pelo cliente em {new Date(ficha.respondido_cliente_em).toLocaleDateString("pt-BR")}
            </span>
          )}
        </div>
      </div>
      {/* Celular: os dois botões dividem a largura da linha (juntos passavam da
          borda do card); a partir de lg ficam do tamanho do texto, à direita. */}
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto lg:shrink-0">
        <motion.div className="min-w-0 sm:flex-1 lg:flex-none">
          <button type="button" onClick={copiar} className="acao-vidro max-lg:w-full max-lg:justify-center" title="Copia as perguntas ainda em branco para mandar ao dono do negócio pelo WhatsApp">
            <Copy size={14} /> Copiar perguntas
          </button>
        </motion.div>
        <motion.div className="min-w-0 sm:flex-1 lg:flex-none">
          <button type="button" onClick={() => setAberta(true)} className="acao-vidro max-lg:w-full max-lg:justify-center">
            <DocumentText size={14} /> Abrir ficha
          </button>
        </motion.div>
      </div>
      <FichaClienteModal clientId={clientId} empresa={empresa} open={aberta} onClose={() => setAberta(false)} />
    </div>
  );
}

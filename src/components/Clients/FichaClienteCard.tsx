import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Copy, DocumentText } from "iconsax-react";
import { BLOCOS_FICHA, completude } from "@/features/clients/fichaCampos";
import { useFichaCliente } from "@/hooks/useFichaCliente";
import { FichaClienteModal } from "./FichaClienteModal";

const card = "rounded-2xl border border-white/[0.06] bg-white/[0.04] px-5 py-4";
const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * As perguntas da ficha em texto, prontas para colar no WhatsApp do cliente.
 * Quem responde é o dono; a agência passa as respostas para o modal.
 */
function perguntasParaWhatsApp(empresa: string, responsavel?: string): string {
  const nome = responsavel?.split(" ")[0];
  let n = 0;
  const blocos = BLOCOS_FICHA.map((b) =>
    [`*${b.titulo}*`, ...b.campos.map((c) => `${++n}. ${c.pergunta}`)].join("\n"));
  return [
    `Oi${nome ? `, ${nome}` : ""}! Para a gente acertar ainda mais nos anúncios da ${empresa}, preciso que você responda `
      + "estas perguntas sobre o seu negócio. Só você sabe responder. Pode ser por texto ou áudio, e o que não souber pode pular.",
    ...blocos,
  ].join("\n\n");
}

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
      await navigator.clipboard.writeText(perguntasParaWhatsApp(empresa, responsavel));
      toast.success("Perguntas copiadas. Cole no WhatsApp do cliente e depois registre as respostas em \"Abrir ficha\".");
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
          <span className="block truncate font-medium text-white">
            {situacao}
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
      <div className="flex shrink-0 items-center gap-2">
        <motion.div>
          <button type="button" onClick={copiar} className="acao-vidro" title="Copia as perguntas para mandar ao dono do negócio pelo WhatsApp">
            <Copy size={14} /> Copiar perguntas
          </button>
        </motion.div>
        <motion.div>
          <button type="button" onClick={() => setAberta(true)} className="acao-vidro">
            <DocumentText size={14} /> Abrir ficha
          </button>
        </motion.div>
      </div>
      <FichaClienteModal clientId={clientId} empresa={empresa} open={aberta} onClose={() => setAberta(false)} />
    </div>
  );
}

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { DocumentText, Send2 } from "iconsax-react";
import { completude } from "@/features/clients/fichaCampos";
import { useFichaCliente, useGerarLinkFicha } from "@/hooks/useFichaCliente";
import { FichaClienteModal } from "./FichaClienteModal";

const card = "rounded-2xl border border-white/[0.06] bg-white/[0.04] px-5 py-4";
const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Cartão da ficha no cadastro do cliente: quanto já foi respondido, o CPL
 * máximo, e os dois jeitos de preencher — a agência no modal, ou o dono do
 * negócio pelo link (copiado com a mensagem pronta para o WhatsApp).
 */
export function FichaClienteCard({ clientId, empresa, responsavel }: { clientId: string; empresa: string; responsavel?: string }) {
  const { data: ficha, isLoading } = useFichaCliente(clientId);
  const gerarLink = useGerarLinkFicha(clientId);
  const [aberta, setAberta] = useState(false);

  const { respondidos, total } = completude(ficha);
  const situacao = isLoading ? "…"
    : !ficha || respondidos === 0 ? "Pendente"
    : respondidos === total ? "Completa"
    : `${respondidos} de ${total} respondidas`;

  const enviar = async () => {
    try {
      const link = await gerarLink.mutateAsync();
      const nome = responsavel?.split(" ")[0];
      const mensagem = `Oi${nome ? `, ${nome}` : ""}! Para a gente acertar ainda mais nos anúncios da ${empresa}, `
        + `preciso que você responda a ficha do seu negócio. Leva uns 10 minutos e só você sabe responder: ${link}`;
      await navigator.clipboard.writeText(mensagem);
      toast.success("Link criado e mensagem copiada. É só colar no WhatsApp do cliente (vale 30 dias).");
    } catch (e) {
      toast.error(`Não consegui gerar o link: ${(e as Error).message}`);
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
          <button type="button" onClick={enviar} disabled={gerarLink.isPending} className="acao-vidro" title="Gera um link para o dono do negócio responder e copia a mensagem">
            <Send2 size={14} /> Enviar ao cliente
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

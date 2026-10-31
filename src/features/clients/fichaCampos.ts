/**
 * Ficha do cliente: as perguntas, num lugar só.
 *
 * Usado pela tela (modal no cadastro), pelo formulário público que o dono do
 * negócio responde e pelas Edge Functions (link público e MCP dos agentes).
 * Por isso é TypeScript puro, sem `@/` e sem React: as funções importam este
 * arquivo pelo caminho relativo.
 *
 * As perguntas são para o DONO responder: "de cada R$ 100 vendidos, quanto
 * sobra?" em vez de "margem de lucro". O `rotulo` é o nome curto, para a tela
 * da agência e para os agentes.
 */
export type TipoCampo = "texto" | "longo" | "reais" | "percentual" | "simnao";

export interface CampoFicha {
  chave: string;
  rotulo: string;
  pergunta: string;
  tipo: TipoCampo;
  exemplo?: string;
}

export interface BlocoFicha {
  titulo: string;
  campos: CampoFicha[];
}

export const BLOCOS_FICHA: BlocoFicha[] = [
  {
    titulo: "Negócio",
    campos: [
      { chave: "nicho", rotulo: "Nicho", pergunta: "Qual é o ramo do seu negócio?", tipo: "texto", exemplo: "Delivery, saúde, imobiliária…" },
      { chave: "subnicho", rotulo: "Subnicho", pergunta: "E, dentro dele, o que exatamente vocês fazem?", tipo: "texto", exemplo: "Hamburgueria artesanal, clínica de estética…" },
      { chave: "cidade", rotulo: "Cidade", pergunta: "Em que cidade vocês atendem?", tipo: "texto" },
      { chave: "raio_atendimento", rotulo: "Raio de atendimento", pergunta: "Até onde vocês atendem ou entregam?", tipo: "texto", exemplo: "Até 8 km, bairros X e Y, a cidade toda…" },
      { chave: "tempo_mercado", rotulo: "Tempo de mercado", pergunta: "Há quanto tempo o negócio existe?", tipo: "texto" },
    ],
  },
  {
    titulo: "Canais",
    campos: [
      { chave: "instagram", rotulo: "Instagram", pergunta: "Qual é o @ do Instagram do negócio?", tipo: "texto", exemplo: "@seunegocio" },
      { chave: "site", rotulo: "Site", pergunta: "Tem site? Qual o endereço?", tipo: "texto", exemplo: "www.seunegocio.com.br" },
      { chave: "outros_canais", rotulo: "Outros canais", pergunta: "Está em outros canais? (Google Meu Negócio, TikTok, iFood…)", tipo: "longo" },
      {
        chave: "autoriza_analise_canais", rotulo: "Autoriza análise dos canais", tipo: "simnao",
        pergunta: "Podemos usar o seu Instagram, site e anúncios como fonte de informações sobre a sua marca, para melhorar seus anúncios?",
      },
    ],
  },
  {
    titulo: "Números",
    campos: [
      { chave: "ticket_mediano", rotulo: "Ticket mediano", pergunta: "Quanto um cliente costuma gastar numa compra?", tipo: "reais", exemplo: "Ex.: 80" },
      { chave: "margem_percentual", rotulo: "Margem", pergunta: "De cada R$ 100 vendidos, quanto sobra depois de pagar os custos?", tipo: "percentual", exemplo: "Ex.: 30 (se sobram R$ 30)" },
      { chave: "conversao_percentual", rotulo: "Conversão lead → venda", pergunta: "De cada 10 pessoas que chamam no WhatsApp, quantas compram?", tipo: "percentual", exemplo: "Ex.: 3 de 10 → 30" },
      { chave: "meta_mensal", rotulo: "Meta do mês", pergunta: "Qual é a sua meta por mês? (vendas, pedidos ou faturamento)", tipo: "texto" },
      { chave: "capacidade_diaria", rotulo: "Capacidade por dia", pergunta: "Quantos pedidos ou atendimentos vocês dão conta por dia?", tipo: "texto" },
    ],
  },
  {
    titulo: "Oferta",
    campos: [
      { chave: "oferta_principal", rotulo: "Oferta principal", pergunta: "Qual produto ou serviço você mais quer vender?", tipo: "longo" },
      { chave: "preco_oferta", rotulo: "Preço da oferta", pergunta: "Quanto custa?", tipo: "texto" },
      { chave: "promocao_atual", rotulo: "Promoção atual", pergunta: "Tem alguma promoção ou condição especial agora?", tipo: "longo" },
      { chave: "diferenciais", rotulo: "Diferenciais", pergunta: "O que você tem que os concorrentes não têm?", tipo: "longo" },
      { chave: "por_que_compram", rotulo: "Por que compram", pergunta: "Por que os clientes escolhem você? O que eles mais elogiam?", tipo: "longo" },
    ],
  },
  {
    titulo: "Público",
    campos: [
      { chave: "publico_ideal", rotulo: "Cliente ideal", pergunta: "Quem é o seu melhor cliente? (idade, bairro, o que procura)", tipo: "longo" },
      { chave: "publico_nao_ideal", rotulo: "Quem não é cliente", pergunta: "Para quem você NÃO quer vender ou não atende?", tipo: "longo" },
    ],
  },
  {
    titulo: "Atendimento",
    campos: [
      { chave: "horario_atendimento", rotulo: "Horário", pergunta: "Qual é o horário de atendimento?", tipo: "texto" },
      { chave: "quem_atende", rotulo: "Quem atende", pergunta: "Quem responde o WhatsApp?", tipo: "texto" },
      { chave: "tempo_resposta", rotulo: "Tempo de resposta", pergunta: "Em quanto tempo vocês costumam responder uma mensagem?", tipo: "texto" },
    ],
  },
  {
    titulo: "Restrições",
    campos: [
      { chave: "restricoes", rotulo: "Não pode prometer", pergunta: "O que NÃO pode ser prometido ou mostrado nos anúncios?", tipo: "longo" },
      { chave: "regras_conselho", rotulo: "Regras do conselho", pergunta: "Seu ramo tem regras de conselho profissional (CRM, CRO, OAB…)? Quais?", tipo: "longo" },
      { chave: "assuntos_proibidos", rotulo: "Assuntos proibidos", pergunta: "Algum assunto, palavra ou imagem que não pode aparecer?", tipo: "longo" },
    ],
  },
  {
    titulo: "Marca",
    campos: [
      { chave: "tom_de_voz", rotulo: "Tom de voz", pergunta: "Como vocês falam com os clientes? (formal, descontraído, com gírias…)", tipo: "longo" },
      { chave: "palavras_usar", rotulo: "Palavras que usam", pergunta: "Palavras ou expressões que a marca gosta de usar", tipo: "texto" },
      { chave: "palavras_evitar", rotulo: "Palavras a evitar", pergunta: "Palavras ou expressões que vocês evitam", tipo: "texto" },
      { chave: "concorrentes", rotulo: "Concorrentes", pergunta: "Quem são seus 3 principais concorrentes?", tipo: "longo" },
      { chave: "observacoes", rotulo: "Observações", pergunta: "Tem mais alguma coisa que a agência precisa saber?", tipo: "longo" },
    ],
  },
];

export const CAMPOS_FICHA: CampoFicha[] = BLOCOS_FICHA.flatMap((b) => b.campos);
export const CHAVES_FICHA: string[] = CAMPOS_FICHA.map((c) => c.chave);
export const CHAVES_NUMERICAS = new Set(CAMPOS_FICHA.filter((c) => c.tipo === "reais" || c.tipo === "percentual").map((c) => c.chave));
export const CHAVES_SIMNAO = new Set(CAMPOS_FICHA.filter((c) => c.tipo === "simnao").map((c) => c.chave));

/** "sim" / true / "não" → booleano; vazio → null. */
export function simNaoDaResposta(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return null;
  if (["sim", "s", "true", "yes", "pode"].includes(s)) return true;
  if (["não", "nao", "n", "false", "no"].includes(s)) return false;
  return null;
}

/** Limite por resposta de texto: protege o formulário público de abuso. */
export const MAX_TEXTO_FICHA = 2000;

/** "1.234,56" / "30%" / "R$ 80" → número; vazio → null. */
export function numeroDaResposta(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v ?? "").replace(/[R$%\s]/g, "");
  if (!s) return null;
  const normal = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}

/** CPL máximo = ticket mediano × margem × conversão (as notas de Fórmulas). */
export function cplMaximo(f: Record<string, unknown>): number | null {
  const t = numeroDaResposta(f.ticket_mediano);
  const m = numeroDaResposta(f.margem_percentual);
  const c = numeroDaResposta(f.conversao_percentual);
  if (t === null || m === null || c === null) return null;
  return Math.round(t * (m / 100) * (c / 100) * 100) / 100;
}

/** Quantos campos estão respondidos. */
export function completude(f: Record<string, unknown> | null | undefined): { respondidos: number; total: number } {
  const total = CAMPOS_FICHA.length;
  if (!f) return { respondidos: 0, total };
  const respondidos = CAMPOS_FICHA.filter((c) => {
    const v = f[c.chave];
    return v !== null && v !== undefined && String(v).trim() !== "";
  }).length;
  return { respondidos, total };
}

/**
 * Limpa um conjunto de respostas: só as chaves da ficha, texto aparado e com
 * limite, números convertidos. Usado pela tela e pelo formulário público.
 */
export function limparRespostas(entrada: Record<string, unknown>): Record<string, string | number | boolean | null> {
  const saida: Record<string, string | number | boolean | null> = {};
  for (const chave of CHAVES_FICHA) {
    if (!(chave in entrada)) continue;
    const v = entrada[chave];
    if (CHAVES_SIMNAO.has(chave)) {
      saida[chave] = simNaoDaResposta(v);
    } else if (CHAVES_NUMERICAS.has(chave)) {
      saida[chave] = numeroDaResposta(v);
    } else {
      const s = String(v ?? "").trim().slice(0, MAX_TEXTO_FICHA);
      saida[chave] = s || null;
    }
  }
  return saida;
}

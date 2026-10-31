/**
 * Ficha do cliente: as perguntas, num lugar só.
 *
 * Usado pela tela (modal no cadastro), pelo formulário público que o dono do
 * negócio responde e pelas Edge Functions (link público e MCP dos agentes).
 * Por isso é TypeScript puro, sem `@/` e sem React: as funções importam este
 * arquivo pelo caminho relativo.
 *
 * A agência atende de tudo (hamburgueria, clínica, dropshipping, infoproduto,
 * imobiliária…). O que muda as perguntas não é o nicho, é o MODELO DE NEGÓCIO:
 * a primeira pergunta escolhe o modelo, e cada campo diz em quais modelos
 * aparece (`modelos`; sem a lista, aparece para todos).
 *
 * As perguntas são para o DONO responder: "de cada R$ 100 vendidos, quanto
 * sobra?" em vez de "margem de lucro". O `rotulo` é o nome curto, para a tela
 * da agência e para os agentes.
 */
export type TipoCampo = "texto" | "longo" | "reais" | "percentual" | "simnao" | "escolha";

export type ModeloNegocio = "local" | "servico" | "ecommerce" | "infoproduto" | "alto_valor" | "b2b";

export const MODELOS: { valor: ModeloNegocio; rotulo: string; exemplo: string }[] = [
  { valor: "local", rotulo: "Negócio local", exemplo: "atende ou entrega na região: hamburgueria, pizzaria, loja física" },
  { valor: "servico", rotulo: "Serviço com agendamento", exemplo: "clínica, estética, consultório, academia, consultoria" },
  { valor: "ecommerce", rotulo: "Loja online / dropshipping", exemplo: "vende produtos pela internet e envia" },
  { valor: "infoproduto", rotulo: "Infoproduto", exemplo: "curso, mentoria, e-book, comunidade" },
  { valor: "alto_valor", rotulo: "Venda de alto valor", exemplo: "imóveis, carros, móveis planejados, energia solar" },
  { valor: "b2b", rotulo: "Venda para empresas (B2B)", exemplo: "serviço ou produto vendido para outras empresas" },
];

export interface CampoFicha {
  chave: string;
  rotulo: string;
  pergunta: string;
  tipo: TipoCampo;
  exemplo?: string;
  /** Em quais modelos o campo aparece. Sem a lista: em todos. */
  modelos?: ModeloNegocio[];
  /** Só para `escolha`. */
  opcoes?: { valor: string; rotulo: string }[];
}

export interface BlocoFicha {
  titulo: string;
  campos: CampoFicha[];
}

const LOCAIS: ModeloNegocio[] = ["local", "servico", "alto_valor"];

export const BLOCOS_FICHA: BlocoFicha[] = [
  {
    titulo: "Modelo de negócio",
    campos: [
      {
        chave: "modelo_negocio", rotulo: "Modelo de negócio", tipo: "escolha",
        pergunta: "Qual destes descreve melhor como você vende?",
        opcoes: MODELOS.map((m) => ({ valor: m.valor, rotulo: `${m.rotulo} (${m.exemplo})` })),
      },
    ],
  },
  {
    titulo: "Negócio",
    campos: [
      { chave: "nicho", rotulo: "Nicho", pergunta: "Qual é o ramo do seu negócio?", tipo: "texto", exemplo: "Delivery, saúde, imobiliária, moda…" },
      { chave: "subnicho", rotulo: "Subnicho", pergunta: "E, dentro dele, o que exatamente vocês fazem?", tipo: "texto", exemplo: "Hamburgueria artesanal, curso de oratória cristã…" },
      { chave: "cidade", rotulo: "Cidade", pergunta: "Em que cidade fica o negócio?", tipo: "texto" },
      { chave: "raio_atendimento", rotulo: "Raio de atendimento", pergunta: "Até onde vocês atendem ou entregam?", tipo: "texto", exemplo: "Até 8 km, bairros X e Y, a cidade toda…", modelos: LOCAIS },
      { chave: "tempo_mercado", rotulo: "Tempo de mercado", pergunta: "Há quanto tempo o negócio existe?", tipo: "texto" },
    ],
  },
  {
    titulo: "Canais",
    campos: [
      { chave: "instagram", rotulo: "Instagram", pergunta: "Qual é o @ do Instagram do negócio?", tipo: "texto", exemplo: "@seunegocio" },
      { chave: "site", rotulo: "Site", pergunta: "Tem site ou página de vendas? Qual o endereço?", tipo: "texto", exemplo: "www.seunegocio.com.br" },
      { chave: "outros_canais", rotulo: "Outros canais", pergunta: "Está em outros canais? (Google Meu Negócio, TikTok, iFood, YouTube…)", tipo: "longo" },
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
      { chave: "conversao_percentual", rotulo: "Conversão lead → venda", pergunta: "De cada 10 pessoas interessadas (que chamam no WhatsApp ou entram na página de vendas), quantas compram?", tipo: "percentual", exemplo: "Ex.: 3 de 10 → 30" },
      { chave: "meta_mensal", rotulo: "Meta do mês", pergunta: "Qual é a sua meta por mês? (vendas, pedidos ou faturamento)", tipo: "texto" },
      { chave: "capacidade_diaria", rotulo: "Capacidade por dia", pergunta: "Quantos pedidos ou atendimentos vocês dão conta por dia?", tipo: "texto", modelos: ["local", "servico"] },
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
    titulo: "Serviço com agendamento",
    campos: [
      { chave: "servico_carro_chefe", rotulo: "Serviço carro-chefe", pergunta: "Qual serviço ou procedimento traz mais clientes?", tipo: "longo", modelos: ["servico"] },
      { chave: "capacidade_agenda", rotulo: "Agenda", pergunta: "Quantos horários livres vocês têm por semana para clientes novos?", tipo: "texto", modelos: ["servico"] },
      { chave: "comparecimento", rotulo: "Comparecimento", pergunta: "De cada 10 agendados, quantos realmente aparecem?", tipo: "texto", modelos: ["servico"] },
      { chave: "etapas_fechamento", rotulo: "Etapas até fechar", pergunta: "Como o cliente fecha? (avaliação gratuita, consulta, orçamento…)", tipo: "longo", modelos: ["servico"] },
    ],
  },
  {
    titulo: "Loja online",
    campos: [
      { chave: "plataforma_loja", rotulo: "Plataforma da loja", pergunta: "Em qual plataforma está a loja? (Shopify, Nuvemshop, Yampi…)", tipo: "texto", modelos: ["ecommerce"] },
      { chave: "produto_carro_chefe", rotulo: "Produto carro-chefe", pergunta: "Qual produto mais vende? E qual dá mais lucro?", tipo: "longo", modelos: ["ecommerce"] },
      { chave: "prazo_entrega", rotulo: "Prazo de entrega", pergunta: "Em quanto tempo o pedido chega no cliente?", tipo: "texto", modelos: ["ecommerce"] },
      { chave: "politica_frete", rotulo: "Frete", pergunta: "Como funciona o frete? (grátis acima de…, pago, por região)", tipo: "texto", modelos: ["ecommerce"] },
      { chave: "taxa_recompra", rotulo: "Recompra", pergunta: "Os clientes costumam comprar de novo? Em quanto tempo?", tipo: "texto", modelos: ["ecommerce"] },
    ],
  },
  {
    titulo: "Infoproduto",
    campos: [
      { chave: "plataforma_venda", rotulo: "Plataforma de venda", pergunta: "Por qual plataforma você vende? (Hotmart, Kiwify, Eduzz…)", tipo: "texto", modelos: ["infoproduto"] },
      { chave: "formato_produto", rotulo: "Formato", pergunta: "O que é o produto? (curso gravado, mentoria, e-book, comunidade…)", tipo: "texto", modelos: ["infoproduto"] },
      { chave: "funil_venda", rotulo: "Funil", pergunta: "Como você vende? (venda direta/perpétuo, lançamento, VSL, webinário, aplicação)", tipo: "longo", modelos: ["infoproduto"] },
      { chave: "ofertas_adicionais", rotulo: "Order bump e upsell", pergunta: "Tem order bump, upsell ou outros produtos depois da compra? Quais e quanto custam?", tipo: "longo", modelos: ["infoproduto"] },
      { chave: "garantia", rotulo: "Garantia", pergunta: "Qual é a garantia? Quantos pedem reembolso?", tipo: "texto", modelos: ["infoproduto"] },
      { chave: "afiliados", rotulo: "Afiliados", pergunta: "Trabalha com afiliados ou coprodutores?", tipo: "texto", modelos: ["infoproduto"] },
    ],
  },
  {
    titulo: "Venda consultiva",
    campos: [
      { chave: "tipo_produto", rotulo: "Produto", pergunta: "O que exatamente vocês vendem? (tipos de imóvel, modelos, serviços)", tipo: "longo", modelos: ["alto_valor", "b2b"] },
      { chave: "faixa_preco", rotulo: "Faixa de preço", pergunta: "Qual a faixa de preço do que vocês vendem?", tipo: "texto", modelos: ["alto_valor", "b2b"] },
      { chave: "ciclo_venda", rotulo: "Ciclo de venda", pergunta: "Do primeiro contato até fechar, quanto tempo costuma levar?", tipo: "texto", modelos: ["alto_valor", "b2b"] },
      { chave: "equipe_vendas", rotulo: "Equipe comercial", pergunta: "Quem atende e negocia? (corretores, vendedores, você)", tipo: "texto", modelos: ["alto_valor", "b2b"] },
      { chave: "decisor", rotulo: "Quem decide", pergunta: "Na empresa que compra, quem decide? (dono, gerente, setor)", tipo: "texto", modelos: ["b2b"] },
    ],
  },
  {
    titulo: "Público",
    campos: [
      { chave: "publico_ideal", rotulo: "Cliente ideal", pergunta: "Quem é o seu melhor cliente? (idade, região, o que procura)", tipo: "longo" },
      { chave: "publico_nao_ideal", rotulo: "Quem não é cliente", pergunta: "Para quem você NÃO quer vender ou não atende?", tipo: "longo" },
    ],
  },
  {
    titulo: "Atendimento",
    campos: [
      { chave: "horario_atendimento", rotulo: "Horário", pergunta: "Qual é o horário de atendimento?", tipo: "texto" },
      { chave: "quem_atende", rotulo: "Quem atende", pergunta: "Quem responde os clientes no WhatsApp ou no suporte?", tipo: "texto" },
      { chave: "tempo_resposta", rotulo: "Tempo de resposta", pergunta: "Em quanto tempo vocês costumam responder uma mensagem?", tipo: "texto" },
    ],
  },
  {
    titulo: "Restrições",
    campos: [
      { chave: "restricoes", rotulo: "Não pode prometer", pergunta: "O que NÃO pode ser prometido ou mostrado nos anúncios?", tipo: "longo" },
      { chave: "regras_conselho", rotulo: "Regras do conselho", pergunta: "Seu ramo tem regras de conselho profissional (CRM, CRO, OAB, CRECI…)? Quais?", tipo: "longo" },
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

/** O campo aparece para este modelo? Sem modelo escolhido, só os comuns a todos. */
export function campoVisivel(c: CampoFicha, modelo: unknown): boolean {
  if (!c.modelos) return true;
  return typeof modelo === "string" && (c.modelos as string[]).includes(modelo);
}

/** Os blocos com os campos do modelo; bloco que fica vazio some. */
export function blocosDoModelo(modelo: unknown): BlocoFicha[] {
  return BLOCOS_FICHA
    .map((b) => ({ ...b, campos: b.campos.filter((c) => campoVisivel(c, modelo)) }))
    .filter((b) => b.campos.length > 0);
}

export function rotuloDoModelo(modelo: unknown): string | null {
  return MODELOS.find((m) => m.valor === modelo)?.rotulo ?? null;
}

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

/** Quantos campos do modelo do cliente estão respondidos. */
export function completude(f: Record<string, unknown> | null | undefined): { respondidos: number; total: number } {
  const campos = CAMPOS_FICHA.filter((c) => campoVisivel(c, f?.modelo_negocio));
  const total = campos.length;
  if (!f) return { respondidos: 0, total };
  const respondidos = campos.filter((c) => {
    const v = f[c.chave];
    return v !== null && v !== undefined && String(v).trim() !== "";
  }).length;
  return { respondidos, total };
}

/**
 * Limpa um conjunto de respostas: só as chaves da ficha, texto aparado e com
 * limite, números e sim/não convertidos, modelo só se for um dos conhecidos.
 * Usado pela tela e pelo formulário público.
 */
export function limparRespostas(entrada: Record<string, unknown>): Record<string, string | number | boolean | null> {
  const saida: Record<string, string | number | boolean | null> = {};
  for (const chave of CHAVES_FICHA) {
    if (!(chave in entrada)) continue;
    const v = entrada[chave];
    if (chave === "modelo_negocio") {
      saida[chave] = MODELOS.some((m) => m.valor === v) ? (v as string) : null;
    } else if (CHAVES_SIMNAO.has(chave)) {
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

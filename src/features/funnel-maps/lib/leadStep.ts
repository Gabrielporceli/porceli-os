/**
 * O passo de LEAD é onde o custo por lead (gasto até ali ÷ leads) é medido.
 *
 * Padrão pelo tipo do card; o usuário pode marcar ou desmarcar em qualquer um.
 * E o custo por lead é medido UMA vez, no PRIMEIRO lead do fluxo: um lead mais
 * à frente (quem virou contato depois de clicar no WhatsApp) são menos
 * pessoas, então dividiria o mesmo gasto por menos gente e daria um custo
 * maior que o do lead de verdade.
 */
const LEAD_VARIANTS = new Set([
  'whatsapp-click',
  'message-received',
  'submit-form',
  'book-call',
  'contact',
  'became-contact',
]);

export function isLeadStep(data: { category?: string; variant?: string; isLead?: boolean }): boolean {
  if (data.category === 'traffic') return false;
  return data.isLead ?? LEAD_VARIANTS.has(data.variant ?? '');
}

/** Cards de lead que NÃO têm outro lead antes deles no fluxo: são os únicos
 *  que mostram o custo por lead. */
export function firstLeadIds(
  nodes: { id: string; type?: string; data: unknown }[],
  edges: { source: string; target: string }[],
): Set<string> {
  const flow = nodes.filter((n) => n.type === 'funnelNode' || n.type === 'pageNode');
  const leads = new Set(flow.filter((n) => isLeadStep(n.data as never)).map((n) => n.id));

  const parents = new Map<string, string[]>();
  for (const e of edges) parents.set(e.target, [...(parents.get(e.target) ?? []), e.source]);

  const first = new Set<string>();
  for (const id of leads) {
    const seen = new Set<string>();
    const stack = [...(parents.get(id) ?? [])];
    let hasLeadBefore = false;
    while (stack.length && !hasLeadBefore) {
      const cur = stack.pop()!;
      if (seen.has(cur) || cur === id) continue;
      seen.add(cur);
      if (leads.has(cur)) hasLeadBefore = true;
      stack.push(...(parents.get(cur) ?? []));
    }
    if (!hasLeadBefore) first.add(id);
  }
  return first;
}

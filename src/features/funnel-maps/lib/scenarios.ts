/**
 * Cenários da projeção: pessimista, médio e otimista.
 *
 * O usuário define só os dois extremos (taxa e visitas pessimistas e
 * otimistas). O médio NUNCA é digitado: é sempre a média dos dois. Assim os
 * três ficam coerentes e o mapa serve de norte pra metas, com uma faixa
 * realista em vez de um número único.
 *
 * O cenário REAL é à parte: não é média de nada, é o que de fato aconteceu
 * (taxas, visitas, investimento e ticket reais). Onde ainda não há dado real,
 * vale o médio, pra o funil continuar fechando a conta.
 *
 * Campos guardados:
 *   conexão  → rateLow, rateHigh        (legado: rate)
 *   tráfego  → visitorsLow, visitorsHigh (legado: visitors)
 * Mapas antigos, com só `rate`/`visitors`, valem igual nos três cenários.
 */
export type Scenario = 'low' | 'mid' | 'high' | 'real';

export const SCENARIOS: { id: Scenario; label: string }[] = [
  { id: 'low', label: 'Pessimista' },
  { id: 'mid', label: 'Médio' },
  { id: 'high', label: 'Otimista' },
  { id: 'real', label: 'Real' },
];

/** Valor de um par (pessimista, otimista) no cenário. Aceita os dois em
 *  qualquer ordem: o menor é sempre o pessimista. */
export function pick(a: number, b: number, scenario: Scenario): number {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  if (scenario === 'low') return lo;
  if (scenario === 'high') return hi;
  return (lo + hi) / 2; // médio (e base do real, enquanto não há dado real)
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Novo par (pessimista, otimista) depois de o usuário digitar `value` no
 * cenário ativo:
 *  • pessimista: define o pessimista; se passar do otimista, o otimista sobe junto;
 *  • otimista: define o otimista; se ficar abaixo do pessimista, o pessimista desce junto;
 *  • médio: desloca os dois juntos, mantendo a distância entre eles (a média vira `value`).
 * Sem isso, digitar no otimista um valor menor que o pessimista era ignorado
 * (o "maior dos dois" continuava valendo) e o campo parecia travado.
 */
export function withScenarioValue(
  a: number,
  b: number,
  scenario: Scenario,
  value: number,
  max = Number.POSITIVE_INFINITY,
): { low: number; high: number } {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const v = clamp(value, 0, max);
  if (scenario === 'low') return { low: v, high: Math.max(hi, v) };
  if (scenario === 'high') return { low: Math.min(lo, v), high: v };
  // Médio e Real não passam por aqui como limites; o médio desloca os dois,
  // estreitando a distância se um lado bateria no teto/chão.
  const spread = Math.min((hi - lo) / 2, v, max - v);
  return { low: v - spread, high: v + spread };
}

interface RateFields {
  rate?: number;
  rateLow?: number;
  rateHigh?: number;
  rateReal?: number;
}

interface VisitorFields {
  visitors?: number;
  visitorsLow?: number;
  visitorsHigh?: number;
  visitorsReal?: number;
}

/** Taxa de uma conexão no cenário: no Real, o dado real (ou o médio, se ainda
 *  não houver). */
export function rateFor(d: RateFields | undefined, scenario: Scenario): number {
  const { low, high } = rateBounds(d);
  if (scenario === 'real') return d?.rateReal ?? pick(low, high, 'mid');
  return pick(low, high, scenario);
}

/** Visitas de um card de tráfego no cenário. */
export function visitorsFor(d: VisitorFields | undefined, scenario: Scenario): number {
  const { low, high } = visitorBounds(d);
  if (scenario === 'real') return d?.visitorsReal ?? pick(low, high, 'mid');
  return pick(low, high, scenario);
}

export function rateBounds(d: RateFields | undefined): { low: number; high: number } {
  return { low: d?.rateLow ?? d?.rate ?? 100, high: d?.rateHigh ?? d?.rate ?? 100 };
}

export function visitorBounds(d: VisitorFields | undefined): { low: number; high: number } {
  return { low: d?.visitorsLow ?? d?.visitors ?? 0, high: d?.visitorsHigh ?? d?.visitors ?? 0 };
}

/** Campos de taxa prontos pra persistir numa conexão (inclui o médio em `rate`). */
export function edgeRateFields(d: RateFields | undefined): { rateLow: number; rateHigh: number; rate: number; rateReal?: number } {
  const { low, high } = rateBounds(d);
  return { rateLow: low, rateHigh: high, rate: pick(low, high, 'mid'), rateReal: d?.rateReal };
}

interface NodeLike {
  id: string;
  type?: string;
  data: Record<string, unknown>;
}

interface EdgeLike {
  id: string;
  source: string;
  target: string;
  data?: unknown;
}

/** Aplica um cenário: devolve nós com `visitors` resolvido (tráfego) e conexões
 *  com `rate` resolvido, no formato que a conta de pessoas espera. */
export function resolveScenario<N extends NodeLike>(
  nodes: N[],
  edges: EdgeLike[],
  scenario: Scenario,
): { nodes: N[]; edges: { id: string; source: string; target: string; rate: number }[] } {
  return {
    nodes: nodes.map((n) => {
      const isFlow = n.type === 'funnelNode' || n.type === 'pageNode';
      if (!isFlow) return n;
      const d = n.data as Record<string, unknown> & VisitorFields & { cost?: number; costReal?: number; avgTicket?: number; avgTicketReal?: number };
      const patch: Record<string, unknown> = {};
      if (d.category === 'traffic') patch.visitors = visitorsFor(d, scenario);
      if (scenario === 'real') {
        // Investimento e ticket reais valem só quando foram informados.
        if (d.costReal !== undefined) patch.cost = d.costReal;
        if (d.avgTicketReal !== undefined) patch.avgTicket = d.avgTicketReal;
      }
      return Object.keys(patch).length ? { ...n, data: { ...n.data, ...patch } } : n;
    }),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      rate: rateFor(e.data as RateFields | undefined, scenario),
    })),
  };
}

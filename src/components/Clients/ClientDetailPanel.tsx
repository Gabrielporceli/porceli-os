import type { ComponentType } from 'react';
import { motion } from 'framer-motion';
import { Building, Calendar, Call, Hashtag, Sms, Edit2, Trash} from 'iconsax-react';
import { LiquidGlassButton } from '@/components/ui/liquid-glass-button';
import { Badge } from '@/components/ui/badge';
import { usePlansContext } from '@/contexts/PlansContext';

export interface ClientRow {
  id: string;
  company: string;
  cnpj: string;
  responsible: string;
  phone: string;
  email: string;
  grupoId?: string;
  contractEnd: string;
  paymentDay: number;
  tags: string[];
  address: string;
  plan?: string;
  startDate?: string;
  planColor?: string;
  monthlyValue?: string;
}

const STATUS_TAGS = ['ativo', 'a vencer', 'vencido', 'inativo'];

/** Tag de situação do cliente (ativo, a vencer…), se houver. */
export function clientStatus(client: Pick<ClientRow, 'tags'>): string | undefined {
  return client.tags?.find((t) => STATUS_TAGS.includes(t.toLowerCase()));
}

/** Bolinha de situação, no mesmo vocabulário de cores da lista de contratos. */
export function clientStatusDot(client: Pick<ClientRow, 'tags'>): string {
  switch (clientStatus(client)?.toLowerCase()) {
    case 'ativo': return 'bg-green-500';
    case 'a vencer': return 'bg-yellow-500';
    case 'vencido': return 'bg-red-500';
    default: return 'bg-white/20';
  }
}

export function formatMonthly(value?: string): string {
  const n = value ? parseFloat(value) : 0;
  return `R$ ${(Number.isNaN(n) ? 0 : n).toFixed(2).replace('.', ',')}`;
}

const formatDate = (iso?: string) => {
  if (!iso) return 'Não definido';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
};

const getTagColor = (tag: string) => {
  switch (tag.toLowerCase()) {
    case 'ativo': return 'bg-green-500/20 text-white/90 hover:bg-green-500/20';
    case 'a vencer': return 'bg-yellow-500/20 text-white/90 hover:bg-yellow-500/20';
    case 'vencido': return 'bg-red-500/20 text-white/90 hover:bg-red-500/20';
    default: return 'bg-Porceli-gray-600 text-white hover:bg-Porceli-gray-700';
  }
};

type Icon = ComponentType<{ className?: string }>;

function Field({ icon: Ic, label, children }: { icon: Icon; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
        <Ic className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/40">{label}</span>
        <span className="block truncate font-medium text-white">{children}</span>
      </div>
    </div>
  );
}

interface ClientDetailPanelProps {
  client: ClientRow;
  planColors?: Record<string, string>;
  onEdit: () => void;
  onDelete: () => void;
}

const card = 'rounded-2xl border border-white/[0.06] bg-white/[0.04] px-5 py-4';

const spring = { type: 'spring', stiffness: 400, damping: 17 } as const;

/** Conteúdo do painel da lista de clientes: um card de cabeçalho com situação,
 *  plano e ações, e um card com os dados — no mesmo estilo dos cards de contrato. */
export function ClientDetailPanel({ client, planColors = {}, onEdit, onDelete }: ClientDetailPanelProps) {
  const { getPlanByName } = usePlansContext();
  const status = clientStatus(client);

  const planClass = (plan: string) => {
    const fromContext = getPlanByName(plan);
    if (fromContext?.color) return fromContext.color;
    if (planColors[plan]) return planColors[plan];
    return 'bg-Porceli-gray-600 text-white hover:bg-Porceli-gray-700';
  };

  return (
    <>
      <div className={`${card} flex flex-col justify-between gap-4 lg:flex-row lg:items-center`}>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h4 className="truncate text-lg font-bold text-white">{client.company}</h4>
            {status && (
              <Badge className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${getTagColor(status)}`}>{status}</Badge>
            )}
            {client.plan && (
              <Badge className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${planClass(client.plan)}`}>{client.plan}</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-white/50">
            <Calendar className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-sm font-medium">Pagamento: dia {client.paymentDay}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <motion.div>
            <button type="button" onClick={onEdit} title="Editar" aria-label="Editar" className="acao-vidro so-icone"><Edit2 size={14} /></button>
          </motion.div>
          <motion.div>
            <button type="button" onClick={onDelete} title="Excluir" aria-label="Excluir" className="acao-vidro so-icone perigo"><Trash size={14} /></button>
          </motion.div>
        </div>
      </div>

      <div className={card}>
        <div className="grid grid-cols-1 gap-x-10 gap-y-5 md:grid-cols-2">
          <Field icon={Building} label="CNPJ">{client.cnpj || 'Não definido'}</Field>
          <Field icon={Sms} label="Email">{client.email || 'Não definido'}</Field>
          <Field icon={Call} label="Responsável">{client.responsible || 'Não definido'}</Field>
          <Field icon={Calendar} label="Início do contrato">{formatDate(client.startDate)}</Field>
          <Field icon={Call} label="Telefone">{client.phone || 'Não definido'}</Field>
          <Field icon={Calendar} label="Fim do contrato">{formatDate(client.contractEnd)}</Field>
          <Field icon={Hashtag} label="Grupo ID">{client.grupoId || 'Não definido'}</Field>
          <Field icon={Calendar} label="Valor mensal">
            <span className="text-lg font-bold tracking-tight">{formatMonthly(client.monthlyValue)}</span>
          </Field>
        </div>
      </div>
    </>
  );
}

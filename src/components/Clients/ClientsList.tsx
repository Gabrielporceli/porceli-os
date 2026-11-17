import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Profile2User } from 'iconsax-react';
import { MasterDetail, NAME_FADE } from '@/components/ui/MasterDetail';
import { cn } from '@/lib/utils';
import { ClientDetailPanel, clientStatus, clientStatusDot, type ClientRow } from './ClientDetailPanel';

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

// Ativos, depois a vencer, depois vencidos e inativos; quem não tem situação vai por último.
const STATUS_ORDER = ['ativo', 'a vencer', 'vencido', 'inativo'];
const rank = (c: ClientRow) => {
  const i = STATUS_ORDER.indexOf(clientStatus(c)?.toLowerCase() ?? '');
  return i === -1 ? STATUS_ORDER.length : i;
};

interface ClientsListProps {
  clients: ClientRow[];
  onEditClient: (client: ClientRow) => void;
  onDeleteClient: (client: ClientRow) => void;
  planColors?: Record<string, string>;
  /** Quanto cada cliente já gerou (soma do que foi pago), por id. */
  revenueByClient?: Record<string, number>;
}

/** Lista de clientes no mesmo layout da lista de contratos: os clientes à
 *  esquerda, e o selecionado vira uma aba grudada no painel com os dados e as
 *  ações dele. */
export function ClientsList({ clients, onEditClient, onDeleteClient, planColors = {}, revenueByClient = {} }: ClientsListProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Dentro de cada grupo, ordem alfabética.
  const ordered = useMemo(
    () => [...clients].sort((a, b) => rank(a) - rank(b) || a.company.localeCompare(b.company, 'pt-BR')),
    [clients],
  );
  const selected = ordered.find((c) => c.id === selectedId) ?? ordered[0];

  if (clients.length === 0) {
    return (
      <div className="surface-flat no-elevation rounded-3xl p-20 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[2.5rem] border border-white/5 bg-white/5">
          <Profile2User className="h-10 w-10 text-white/20" />
        </div>
        <h3 className="mb-2 text-xl font-bold tracking-tight text-white">Nenhum cliente por aqui</h3>
        <p className="mx-auto max-w-xs text-sm text-white/40">Ajuste a busca e os filtros, ou cadastre um novo cliente.</p>
      </div>
    );
  }

  return (
    <MasterDetail
      items={ordered}
      getKey={(c) => c.id}
      selectedKey={selected.id}
      onSelect={setSelectedId}
      minHeight={520}
      measureKey={clients.length}
      renderRow={(client, isSelected) => (
        <>
          <div className={cn('relative h-2 w-2 shrink-0 rounded-full', clientStatusDot(client))} />
          <div className="relative min-w-0 flex-1">
            <div className="overflow-hidden" style={NAME_FADE}>
              <motion.p
                animate={{ scale: isSelected ? 1.15 : 1 }}
                transition={{ duration: 0.25 }}
                className={cn(
                  'origin-left whitespace-nowrap text-[13px] font-semibold leading-snug',
                  isSelected ? 'text-white' : 'text-white/40',
                )}
              >
                {client.company}
              </motion.p>
            </div>
            <div className="relative mt-0.5 h-[14px]">
              <AnimatePresence initial={false}>
                {isSelected ? (
                  <motion.p
                    key="gerou"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="absolute inset-0 text-[11px] text-white/50"
                  >
                    Gerou: <span className="font-bold text-green-400">{brl(revenueByClient[client.id] ?? 0)}</span>
                  </motion.p>
                ) : (
                  <motion.p
                    key="plano"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 truncate text-[10px] text-white/30"
                  >
                    {client.plan || 'Sem plano'}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        </>
      )}
    >
      <ClientDetailPanel
        key={selected.id}
        client={selected}
        planColors={planColors}
        onEdit={() => onEditClient(selected)}
        onDelete={() => onDeleteClient(selected)}
      />
    </MasterDetail>
  );
}

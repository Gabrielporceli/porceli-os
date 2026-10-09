import { useState } from "react";
import { PageLoader } from "@/components/ui/PageLoader";
import { usePageReady } from "@/hooks/usePageReady";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Danger, DocumentText, DollarCircle, ExportSquare } from 'iconsax-react';
import { ContractsHeader } from "@/components/Contracts/ContractsHeader";
import { EditContractModal } from "@/components/Contracts/EditContractModal";
import { DeleteContractDialog } from "@/components/Contracts/DeleteContractDialog";
import { useContracts, useUpdateContract, useRenewContract, useCreateContract } from "@/hooks/useContracts";
import { RenewContractModal } from "@/components/Contracts/RenewContractModal";
import { NewContractModal } from "@/components/Contracts/NewContractModal";
import { useUpdateClient } from "@/hooks/useClients";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { MasterDetail, NAME_FADE } from "@/components/ui/MasterDetail";


interface Contract {
  id: string;
  client: string;
  client_id: string;
  type: string;
  monthlyValue: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'inactive' | 'expiring' | 'concluded';
  payment_day?: number;
  contract_url?: string;
  /** recorrente entra no MRR/churn do Dashboard; pontual e rescisão não. */
  category?: 'recorrente' | 'pontual' | 'rescisao';
}

export default function Contracts() {
  const { data: contractsData = [], isLoading, error } = useContracts();
  const updateContractMutation = useUpdateContract();
  const renewContractMutation = useRenewContract();
  const updateClientMutation = useUpdateClient();

  const queryClient = useQueryClient();
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [deletingContract, setDeletingContract] = useState<Contract | null>(null);
  const [renewingContract, setRenewingContract] = useState<Contract | null>(null);
  const [isNewContractModalOpen, setIsNewContractModalOpen] = useState(false);
  const [selectedClientName, setSelectedClientName] = useState<string | null>(null);
  const createContractMutation = useCreateContract();

  const isReady = usePageReady(isLoading);


  if (!isReady) return <PageLoader />;

  // Transform Supabase contracts to component format
  const contracts: Contract[] = contractsData.map(contract => ({
    id: contract.id,
    client: contract.client?.company || 'Cliente não encontrado',
    client_id: contract.client_id || contract.client?.id || '',
    type: contract.type,
    monthlyValue: Number(contract.monthly_value),
    startDate: contract.start_date,
    endDate: contract.end_date,
    status: contract.status as Contract['status'],
    payment_day: contract.client?.payment_day,
    contract_url: contract.contract_url,
    category: (contract as any).category ?? 'recorrente',
  }));

  const getStatusBadge = (status: Contract['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20 transition-all font-bold px-3 py-1 rounded-full">Ativo</Badge>;
      case 'expiring':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/20 transition-all font-bold px-3 py-1 rounded-full">A vencer</Badge>;
      case 'concluded':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20 transition-all font-bold px-3 py-1 rounded-full">Concluído</Badge>;
      case 'inactive':
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20 transition-all font-bold px-3 py-1 rounded-full">Inativo</Badge>;
      default:
        return <Badge variant="outline" className="bg-white/5 text-white/50 border-white/10 font-bold px-3 py-1 rounded-full">Desconhecido</Badge>;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Date(date.valueOf() + date.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR');
  };

  const getDaysUntilExpiration = (endDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(endDate);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleRenewClick = (contract: Contract) => {
    // Renova exatamente o contrato clicado — nunca reescolher outro do
    // mesmo cliente. A versão anterior buscava, entre os contratos ativos/a
    // vencer desse cliente, o que tivesse a data de término MAIS DISTANTE
    // ("o mais atual"), ignorando qual botão o usuário realmente clicou.
    // Isso quebrava exatamente o caso de uso principal: um cliente com dois
    // contratos (um a vencer, outro ativo com prazo mais longo) — clicar em
    // "Renovar" no que está a vencer acabava trazendo os dados do outro.
    setRenewingContract(contract);
  };

  const handleEditContract = async (contractData: Omit<Contract, 'id'>) => {
    if (editingContract) {
      try {
        await updateContractMutation.mutateAsync({
          id: editingContract.id,
          type: contractData.type,
          monthly_value: contractData.monthlyValue,
          start_date: contractData.startDate,
          end_date: contractData.endDate,
          status: contractData.status,
          payment_day: contractData.payment_day,
          contract_url: contractData.contract_url,
          category: contractData.category,
        } as any);
        setEditingContract(null);
      } catch (error) {
        console.error('Error updating contract:', error);
      }
    }
  };

  const handleCreateContract = async (contractData: any) => {
    try {
      await createContractMutation.mutateAsync(contractData);
      setIsNewContractModalOpen(false);
    } catch (error) {
      console.error('Error creating contract:', error);
    }
  };

  // Lógica compartilhada de cancelamento.
  // ATENÇÃO: existe um trigger no banco (sync_client_contract_status) que, ao mudar
  // a tag do cliente para 'Inativo', marca TODOS os contratos do cliente como inactive.
  // Por isso, só marcamos o cliente como Inativo se NÃO houver outros contratos ativos.
  const cancelContractBase = async (contract: Contract) => {
    await updateContractMutation.mutateAsync({ id: contract.id, status: 'inactive' });

    if (!contract.client_id) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Verifica se o cliente ainda tem outros contratos ativos
    const { data: remaining } = await supabase
      .from('contracts')
      .select('id, status, end_date')
      .eq('client_id', contract.client_id)
      .eq('user_id', user.id)
      .neq('id', contract.id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const hasActiveContract = (remaining || []).some(c => {
      if (c.status === 'active' || c.status === 'expiring') return true;
      if (c.end_date) return new Date(c.end_date) >= today;
      return false;
    });

    try {
      if (hasActiveContract) {
        // Cliente continua ativo — NÃO mexe na tag (evita o trigger cancelar tudo).
        // Apenas regenera as faturas: remove pendentes e recria a partir dos contratos
        // ainda ativos (assim as faturas do contrato cancelado somem, mas as outras ficam).
        const { updateFinancialEntriesForClient } = await import('@/hooks/useGenerateFinancialEntries');
        await updateFinancialEntriesForClient(contract.client_id, user.id);
      } else {
        // Nenhum contrato ativo restante — marca cliente como Inativo e remove faturas pendentes
        await updateClientMutation.mutateAsync({ id: contract.client_id, tags: ['Inativo'] });
        await supabase
          .from('financial_entries')
          .delete()
          .eq('client_id', contract.client_id)
          .eq('user_id', user.id)
          .eq('status', 'pending');
      }
    } catch (err) {
      console.error('Erro ao finalizar cancelamento do contrato:', err);
    }

    queryClient.invalidateQueries({ queryKey: ['clients'] });
    queryClient.invalidateQueries({ queryKey: ['financial-entries'] });
  };

  const handleConfirmCancel = async () => {
    if (!deletingContract) return;
    try {
      await cancelContractBase(deletingContract);
      setDeletingContract(null);
    } catch (error) {
      console.error('Error canceling contract:', error);
    }
  };

  const handleConfirmCancelWithFine = async (amount: number, dueDate: string) => {
    if (!deletingContract) return;
    try {
      await cancelContractBase(deletingContract);

      // Inserir fatura de multa rescisória
      if (deletingContract.client_id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error: fineError } = await supabase
            .from('financial_entries')
            .insert({
              client_id: deletingContract.client_id,
              user_id: user.id,
              name: `Multa Rescisória — ${deletingContract.client}`,
              amount,
              due_date: dueDate,
              reference: 'Multa Rescisória',
              status: 'pending',
            });

          if (fineError) {
            console.error('Erro ao inserir multa rescisória:', fineError);
          } else {
            queryClient.invalidateQueries({ queryKey: ['financial-entries'] });
          }

          // Gera a cobrança de verdade no Asaas — antes, a multa só era
          // gravada em financial_entries, nunca chegava a existir no Asaas
          // (bug real: cliente não foi cobrado, precisou gerar a fatura
          // manualmente). Multa é sempre uma cobrança avulsa (installments:
          // 1), então usamos asaas-renegotiation diretamente em vez do
          // fluxo de parcelamento de contrato.
          const { data: clientRow } = await supabase
            .from('clients')
            .select('company, cnpj, email, phone')
            .eq('id', deletingContract.client_id)
            .eq('user_id', user.id)
            .maybeSingle();

          if (clientRow?.cnpj) {
            try {
              const { data, error } = await supabase.functions.invoke('asaas-renegotiation', {
                body: {
                  cnpj: clientRow.cnpj,
                  company_name: clientRow.company,
                  email: clientRow.email,
                  phone: clientRow.phone,
                  total_amount: amount,
                  due_date: dueDate,
                  installments: 1,
                  billing_type: 'BOLETO',
                  description: `Multa Rescisória — ${deletingContract.client}`,
                },
              });
              if (error || !data?.success) {
                console.error('Erro ao gerar cobrança da multa no Asaas:', data?.error || error?.message);
              }
            } catch (asaasErr) {
              console.error('Erro ao chamar asaas-renegotiation:', asaasErr);
            }
          } else {
            console.warn('Cliente sem CNPJ cadastrado — multa gravada só no sistema, sem cobrança no Asaas.');
          }
        }
      }

      setDeletingContract(null);
    } catch (error) {
      console.error('Error canceling contract with fine:', error);
    }
  };

  const expiringContracts = contracts.filter(c => c.status === 'expiring');

  const clientGroups = contracts.reduce<Record<string, typeof contracts>>((acc, c) => {
    const key = c.client || 'Sem cliente';
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  const getClientPriority = (cc: typeof contracts) => {
    if (cc.some(c => c.status === 'active')) return 0;
    if (cc.some(c => c.status === 'expiring')) return 1;
    if (cc.some(c => c.status === 'concluded')) return 2;
    return 3;
  };

  const clientNames = Object.keys(clientGroups).sort(
    (a, b) => getClientPriority(clientGroups[a]) - getClientPriority(clientGroups[b])
  );

  const effectiveClient = selectedClientName ?? clientNames[0] ?? null;


  const getClientStatusColor = (clientContracts: typeof contracts) => {
    if (clientContracts.some(c => c.status === 'expiring')) return 'bg-yellow-500';
    if (clientContracts.some(c => c.status === 'active')) return 'bg-green-500';
    if (clientContracts.some(c => c.status === 'concluded')) return 'bg-blue-500';
    return 'bg-white/20';
  };

  const getStatusAccentClass = (status: Contract['status']) => {
    switch (status) {
      case 'active': return 'border-l-green-500';
      case 'expiring': return 'border-l-yellow-500';
      case 'inactive': return 'border-l-red-500/40';
      case 'concluded': return 'border-l-blue-500';
      default: return 'border-l-white/10';
    }
  };

  const contractStatusOrder: Record<Contract['status'], number> = { active: 0, expiring: 1, concluded: 2, inactive: 3 };

  const selectedContracts = (effectiveClient ? (clientGroups[effectiveClient] ?? []) : [])
    .slice()
    .sort((a, b) => contractStatusOrder[a.status] - contractStatusOrder[b.status]);
  const selectedMRR = selectedContracts
    .filter(c => c.status === 'active' || c.status === 'expiring')
    .reduce((sum, c) => sum + c.monthlyValue, 0);

  if (isLoading) {
    return (
      <div className="space-y-6 md:space-y-8 animate-fade-in">
        <div className="h-8 bg-Porceli-gray-700 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-Porceli-gray-700 rounded animate-pulse" />
          ))}
        </div>
        <div className="h-40 bg-Porceli-gray-700 rounded animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 md:space-y-8 animate-fade-in">
        <div className="text-center py-12">
          <p className="text-red-400">Erro ao carregar contratos: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      <ContractsHeader onNewContract={() => setIsNewContractModalOpen(true)} />

      {/* Expiring Contracts Alert */}
      {expiringContracts.length > 0 && (
        <div className="surface-flat no-elevation rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-white/5 flex items-center gap-3">
            <Danger className="w-4 h-4 text-yellow-500" />
            <h3 className="text-xl font-bold text-white tracking-tight">Atenção Prioritária</h3>
          </div>
          <div className="divide-y divide-white/5">
            {expiringContracts.map((contract) => (
              <motion.div
                key={contract.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-8 px-4 sm:px-6 py-4 hover:bg-white/[0.04] transition-all duration-300"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/10 shrink-0">
                    <Calendar className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-white font-semibold truncate">{contract.client}</h4>
                    <p className="text-white/40 text-xs">{contract.type} • Vence em {formatDate(contract.endDate)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0">
                  <div className="text-right">
                    <p className="text-[10px] text-yellow-500/60 font-black uppercase tracking-widest">Restam</p>
                    <p className="text-white font-black">{getDaysUntilExpiration(contract.endDate)} dias</p>
                  </div>
                  <motion.div whileHover={{ scale: 1.05, translateY: -2 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
                    <LiquidGlassButton
                      tint="danger"
                      onClick={() => handleRenewClick(contract)}
                      className="h-9 px-6 text-xs font-bold uppercase tracking-widest"
                    >
                      Renovar Agora
                    </LiquidGlassButton>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Master-Detail */}
      {contracts.length === 0 ? (
        <div className="surface-flat no-elevation rounded-3xl p-20 text-center">
          <div className="w-20 h-20 bg-white/5 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 border border-white/5">
            <DocumentText className="w-10 h-10 text-white/20" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Vazio por aqui</h3>
          <p className="text-white/40 text-sm max-w-xs mx-auto">Novos contratos aparecerão automaticamente ao fechar negócios com valores mensais.</p>
        </div>
      ) : (
        <MasterDetail
          items={clientNames}
          getKey={(name) => name}
          selectedKey={effectiveClient}
          onSelect={setSelectedClientName}
          measureKey={expiringContracts.length}
          renderRow={(name, isSelected) => {
            const cc = clientGroups[name];
            return (
              <>
                <div className={cn("relative w-2 h-2 rounded-full flex-shrink-0 shrink-0", getClientStatusColor(cc))} />
                <div className="relative min-w-0 flex-1">
                  <div className="overflow-hidden" style={NAME_FADE}>
                    <motion.p
                      animate={{ scale: isSelected ? 1.15 : 1 }}
                      transition={{ duration: 0.25 }}
                      className={cn("font-semibold whitespace-nowrap leading-snug text-[13px] origin-left", isSelected ? "text-white" : "text-white/40")}
                    >{name}</motion.p>
                  </div>
                  <div className="relative h-[14px] mt-0.5">
                    <AnimatePresence initial={false}>
                      {isSelected ? (
                        <motion.p
                          key="mrr"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="absolute inset-0 text-[11px] text-white/50"
                        >
                          MRR: <span className="text-green-400 font-bold">{formatCurrency(cc.filter(c => c.status === 'active' || c.status === 'expiring').reduce((s, c) => s + c.monthlyValue, 0))}</span>
                        </motion.p>
                      ) : (
                        <motion.p
                          key="count"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="absolute inset-0 text-[10px] text-white/30"
                        >
                          {cc.length} {cc.length === 1 ? 'contrato' : 'contratos'}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </>
            );
          }}
        >
              {selectedContracts.map((contract) => (
                <div
                  key={contract.id}
                  className="bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] rounded-2xl px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors"
                >
                  {/* Info */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                      contract.status === 'active' && "bg-green-500/10",
                      contract.status === 'expiring' && "bg-yellow-500/10",
                      contract.status === 'concluded' && "bg-blue-500/10",
                      contract.status === 'inactive' && "bg-white/5",
                    )}>
                      <DollarCircle className={cn(
                        "w-4 h-4",
                        contract.status === 'active' && "text-green-500",
                        contract.status === 'expiring' && "text-yellow-500",
                        contract.status === 'concluded' && "text-blue-400",
                        contract.status === 'inactive' && "text-white/20",
                      )} />
                    </div>

                    <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-6 items-center">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-white font-bold text-sm truncate">{contract.type}</p>
                          {contract.contract_url && (
                            <motion.a
                              href={contract.contract_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              whileHover={{ scale: 1.15 }}
                              whileTap={{ scale: 0.9 }}
                              className="text-white/20 hover:text-primary transition-colors shrink-0"
                              title="Abrir contrato"
                            >
                              <ExportSquare className="w-3 h-3" />
                            </motion.a>
                          )}
                        </div>
                        {getStatusBadge(contract.status)}
                      </div>
                      <div>
                        <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-1">Valor</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-white font-bold">{formatCurrency(contract.monthlyValue)}</span>
                          <span className="text-white/20 text-xs">/mês</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-1">Vigência</p>
                        <div className="flex items-center gap-1.5 text-white/50 text-xs">
                          <Calendar className="w-3 h-3 opacity-40 shrink-0" />
                          <span>{formatDate(contract.startDate)}</span>
                          <span className="opacity-30">→</span>
                          <span>{formatDate(contract.endDate)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 shrink-0">
                    <motion.div whileHover={{ scale: 1.05, translateY: -2 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
                      <LiquidGlassButton onClick={() => setEditingContract(contract)} className="h-8 px-4 text-[10px] font-bold uppercase tracking-widest">
                        Editar
                      </LiquidGlassButton>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05, translateY: -2 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
                      <LiquidGlassButton onClick={() => handleRenewClick(contract)} className="h-8 px-4 text-[10px] font-bold uppercase tracking-widest">
                        {contract.status === 'active' ? 'Estender' : 'Renovar'}
                      </LiquidGlassButton>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05, translateY: -2 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
                      <LiquidGlassButton tint="danger" onClick={() => setDeletingContract(contract)} className="h-8 px-4 text-[10px] font-bold uppercase tracking-widest">
                        Cancelar
                      </LiquidGlassButton>
                    </motion.div>
                  </div>
                </div>
              ))}
        </MasterDetail>
      )}
      <EditContractModal
        isOpen={!!editingContract}
        contract={editingContract}
        onClose={() => setEditingContract(null)}
        onSave={handleEditContract}
      />
      <DeleteContractDialog
        isOpen={!!deletingContract}
        contract={deletingContract}
        onClose={() => setDeletingContract(null)}
        onConfirm={handleConfirmCancel}
        onConfirmWithFine={handleConfirmCancelWithFine}
      />
      <RenewContractModal
        isOpen={!!renewingContract}
        contract={renewingContract}
        onClose={() => setRenewingContract(null)}
        onConfirm={async (data) => {
          try {
            await renewContractMutation.mutateAsync(data);
            setRenewingContract(null);
          } catch (error) {
            console.error('Error renewing contract:', error);
          }
        }}
        isPending={renewContractMutation.isPending}
      />
      <NewContractModal
        isOpen={isNewContractModalOpen}
        onClose={() => setIsNewContractModalOpen(false)}
        onSave={handleCreateContract}
        isPending={createContractMutation.isPending}
      />
    </div>
  );
}

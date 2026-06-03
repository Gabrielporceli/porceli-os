import { useState } from "react";
import { PageLoader } from "@/components/ui/PageLoader";
import { usePageReady } from "@/hooks/usePageReady";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, DollarSign, AlertTriangle, Settings, ExternalLink } from "lucide-react";
import { ContractsHeader } from "@/components/Contracts/ContractsHeader";
import { EditContractModal } from "@/components/Contracts/EditContractModal";
import { DeleteContractDialog } from "@/components/Contracts/DeleteContractDialog";
import { useContracts, useUpdateContract, useRenewContract, useCreateContract } from "@/hooks/useContracts";
import { RenewContractModal } from "@/components/Contracts/RenewContractModal";
import { NewContractModal } from "@/components/Contracts/NewContractModal";
import { useUpdateClient } from "@/hooks/useClients";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";

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
    contract_url: contract.contract_url
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
        return <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 transition-all font-bold px-3 py-1 rounded-full">Inativo</Badge>;
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
    // Se não tiver ID de cliente, usa o contrato atual por segurança
    if (!contract.client_id) {
      setRenewingContract(contract);
      return;
    }

    // Buscar todos os contratos deste cliente
    const clientContracts = contracts.filter(c => c.client_id === contract.client_id);
    
    // Tentar encontrar o contrato ativo ou a vencer (dando preferência ao que vence mais tarde)
    // Isso garante que estamos renovando a partir do contrato mais atual
    const activeContracts = clientContracts
      .filter(c => c.status === 'active' || c.status === 'expiring')
      .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
    
    if (activeContracts.length > 0) {
      setRenewingContract(activeContracts[0]);
    } else {
      // Se não houver ativos, pega o contrato mais recente desse cliente
      const lastContract = [...clientContracts].sort((a, b) => 
        new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
      )[0];
      setRenewingContract(lastContract || contract);
    }
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
          contract_url: contractData.contract_url
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

  // Lógica compartilhada de cancelamento: marca inativo, atualiza tag e remove faturas pendentes
  const cancelContractBase = async (contract: Contract) => {
    await updateContractMutation.mutateAsync({ id: contract.id, status: 'inactive' });

    if (contract.client_id) {
      const { data: { user } } = await supabase.auth.getUser();

      try {
        await updateClientMutation.mutateAsync({ id: contract.client_id, tags: ['Inativo'] });
        queryClient.invalidateQueries({ queryKey: ['clients'] });
      } catch (clientError) {
        console.error('Erro ao atualizar tag do cliente:', clientError);
      }

      if (user) {
        const { error: deleteError } = await supabase
          .from('financial_entries')
          .delete()
          .eq('client_id', contract.client_id)
          .eq('user_id', user.id)
          .eq('status', 'pending');

        if (deleteError) {
          console.error('Erro ao deletar faturas pendentes:', deleteError);
        } else {
          queryClient.invalidateQueries({ queryKey: ['financial-entries'] });
        }
      }
    }
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
        }
      }

      setDeletingContract(null);
    } catch (error) {
      console.error('Error canceling contract with fine:', error);
    }
  };

  const activeContracts = contracts.filter(c => c.status === 'active');
  const expiringContracts = contracts.filter(c => c.status === 'expiring');
  const inactiveContracts = contracts.filter(c => c.status === 'inactive');

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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div whileHover={{ translateY: -4 }} className="liquid-glass border-white/5 p-5 flex flex-col justify-center h-28 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <FileText className="w-16 h-16 text-white" />
          </div>
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.1em] mb-1">Total de Contratos</p>
          <p className="text-3xl font-bold text-white tracking-tight">{contracts.length}</p>
        </motion.div>

        <motion.div whileHover={{ translateY: -4 }} className="liquid-glass border-green-500/10 p-5 flex flex-col justify-center h-28 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-[0.1] group-hover:opacity-[0.2] transition-opacity">
            <FileText className="w-16 h-16" style={{ stroke: "#22c55e" }} />
          </div>
          <p className="text-green-400/50 text-[10px] font-bold uppercase tracking-[0.1em] mb-1">Contratos Ativos</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-white tracking-tight">{activeContracts.length}</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ translateY: -4 }} className="liquid-glass border-yellow-500/30 p-5 flex flex-col justify-center h-28 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-[0.15] group-hover:opacity-[0.25] transition-opacity">
            <AlertTriangle className="w-16 h-16" style={{ stroke: "#eab308" }} />
          </div>
          <p className="text-yellow-400/50 text-[10px] font-bold uppercase tracking-[0.1em] mb-1">A Vencer</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-white tracking-tight">{expiringContracts.length}</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ translateY: -4 }} className="liquid-glass border-red-500/10 p-5 flex flex-col justify-center h-28 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-[0.1] group-hover:opacity-[0.2] transition-opacity">
            <FileText className="w-16 h-16" style={{ stroke: "#ef4444" }} />
          </div>
          <p className="text-red-400/50 text-[10px] font-bold uppercase tracking-[0.1em] mb-1">Inativos</p>
          <p className="text-3xl font-bold text-white tracking-tight">{inactiveContracts.length}</p>
        </motion.div>
      </div>

      {/* Expiring Contracts Alert */}
      {expiringContracts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <span className="text-xs font-bold text-white/60 uppercase tracking-widest">Atenção Prioritária</span>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {expiringContracts.map((contract) => (
              <motion.div
                key={contract.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="liquid-glass border-yellow-500/20 bg-yellow-500/[0.02] p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/10 shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                    <Calendar className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold">{contract.client}</h4>
                    <p className="text-white/40 text-xs">{contract.type} • Vence em {formatDate(contract.endDate)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs text-yellow-500/60 font-bold uppercase tracking-wider">Restam</p>
                    <p className="text-white font-black">{getDaysUntilExpiration(contract.endDate)} dias</p>
                  </div>
                  <motion.div 
                    whileHover={{ scale: 1.05, translateY: -2 }} 
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Button
                      onClick={() => handleRenewClick(contract)}
                      className="liquid-glass hover:bg-white/10 text-white/70 border-white/5 h-11 px-8 rounded-2xl transition-all"
                    >
                      Renovar Agora
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Contracts List */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-white/40" />
          <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest">Lista de Contratos</h3>
        </div>
        <p className="text-[10px] text-white/20 font-medium">Sincronizado automaticamente</p>
      </div>

      {contracts.length === 0 ? (
        <div className="liquid-glass border-white/5 p-20 text-center">
          <div className="w-20 h-20 bg-white/5 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 border border-white/5">
            <FileText className="w-10 h-10 text-white/10" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Vazio por aqui</h3>
          <p className="text-white/30 text-sm max-w-xs mx-auto">Novos contratos aparecerão automaticamente ao fechar negócios com valores mensais.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 pb-10">
          {contracts.map((contract) => (
            <motion.div
              key={contract.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              whileHover={{ scale: 1.005, translateY: -2 }}
              className="liquid-glass border-white/5 p-5 flex items-center justify-between group transition-shadow hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] min-h-[100px]"
            >
              <div className="flex items-center gap-6 flex-1">
                <div className={cn(
                  "w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center transition-all duration-500",
                  contract.status === 'active' && "group-hover:bg-green-500/10 group-hover:border-green-500/20",
                  contract.status === 'concluded' && "group-hover:bg-blue-500/10 group-hover:border-blue-500/20",
                  contract.status === 'expiring' && "group-hover:bg-yellow-500/10 group-hover:border-yellow-500/20",
                  contract.status === 'inactive' && "group-hover:bg-red-500/10 group-hover:border-red-500/20"
                )}>
                  <FileText className={cn(
                    "w-6 h-6 text-white/20 transition-colors duration-500",
                    contract.status === 'active' && "group-hover:text-green-400",
                    contract.status === 'concluded' && "group-hover:text-blue-400",
                    contract.status === 'expiring' && "group-hover:text-yellow-400",
                    contract.status === 'inactive' && "group-hover:text-red-400"
                  )} />
                </div>
                <div className="grid grid-cols-4 gap-8 flex-1 items-center">
                  <div>
                    <div className="flex items-center gap-2 mb-1 min-w-0">
                      <h4 className={cn(
                        "text-white font-bold text-lg tracking-tight transition-colors truncate m-0",
                        contract.status === 'active' && "group-hover:text-green-400",
                        contract.status === 'concluded' && "group-hover:text-blue-400",
                        contract.status === 'expiring' && "group-hover:text-yellow-400",
                        contract.status === 'inactive' && "group-hover:text-red-400"
                      )} title={contract.client}>{contract.client}</h4>
                      {contract.contract_url && (
                        <motion.a
                          href={contract.contract_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          whileHover={{ scale: 1.15, color: '#6829c0' }}
                          whileTap={{ scale: 0.9 }}
                          className="text-white/20 hover:text-primary transition-all p-1 shrink-0 flex items-center justify-center mb-1"
                          title="Abrir contrato"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </motion.a>
                      )}
                    </div>
                    {getStatusBadge(contract.status)}
                  </div>
                  <div>
                    <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-1">Assinatura</p>
                    <div className="flex items-center gap-2">
                      <DollarSign className={cn(
                        "w-3.5 h-3.5 opacity-50",
                        contract.status === 'active' && "text-green-500",
                        contract.status === 'concluded' && "text-blue-500",
                        contract.status === 'expiring' && "text-yellow-500",
                        contract.status === 'inactive' && "text-red-500"
                      )} />
                      <span className="text-white font-bold">{formatCurrency(contract.monthlyValue)}</span>
                      <span className="text-white/20 text-xs">/mês</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-1">Vigência</p>
                    <div className="flex items-center gap-2 text-white/80 font-medium">
                      <Calendar className="w-3.5 h-3.5 opacity-30" />
                      <span>{formatDate(contract.startDate)}</span>
                      <span className="opacity-20">→</span>
                      <span>{formatDate(contract.endDate)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-1">Plano</p>
                    <p className="text-white/60 font-medium truncate">{contract.type}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 ml-12 pr-2">
                <motion.div
                  whileHover={{ scale: 1.05, translateY: -2 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingContract(contract)}
                    className="liquid-glass text-white/70 hover:bg-white/10 hover:text-white border border-white/5 rounded-2xl px-8 h-11 font-bold transition-all"
                  >
                    Editar
                  </Button>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05, translateY: -2 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRenewClick(contract)}
                    className="liquid-glass text-white/70 hover:bg-white/10 hover:text-white border border-white/5 rounded-2xl px-8 h-11 font-bold transition-all"
                  >
                    {contract.status === 'active' ? 'Estender' : 'Renovar'}
                  </Button>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05, translateY: -2 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeletingContract(contract)}
                    className="liquid-glass text-red-500 hover:bg-white/10 hover:text-red-400 border border-white/5 rounded-2xl px-8 h-11 font-bold transition-all"
                  >
                    Cancelar
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>
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

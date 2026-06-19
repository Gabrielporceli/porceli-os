import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, AlertCircle, TrendingDown, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { FinancialKPIs } from "@/components/Financial/FinancialKPIs";
import { FinancialHeader } from "@/components/Financial/FinancialHeader";
import { ExpenseModal } from "@/components/Financial/ExpenseModal";
import { ProjectionChart } from "@/components/Financial/ProjectionChart";
import { useClients } from "@/hooks/useClients";
import { useContracts } from "@/hooks/useContracts";
import { useExpenses } from "@/hooks/useExpenses";
import { useFinancialEntries } from "@/hooks/useFinancialEntries";
import { DeleteExpenseDialog } from "@/components/Financial/DeleteExpenseDialog";
import { RenegotiationModal } from "@/components/Financial/RenegotiationModal";
import { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PageLoader } from "@/components/ui/PageLoader";
import { usePageReady } from "@/hooks/usePageReady";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function Financial() {
  const { data: clients = [] } = useClients();
  const { data: contracts = [], refetch } = useContracts();
  const { expenses, createExpense, payExpense, deleteExpense, isLoading: expensesLoading, isPaying, isDeleting } = useExpenses();
  const { financialEntries, financialEntriesLoading, markAsPaid, isMarkingAsPaid, generateMissingEntries, isGeneratingEntries } = useFinancialEntries();

  // Add state for the delete confirmation modal
  const [deleteExpenseDialog, setDeleteExpenseDialog] = useState<{
    open: boolean;
    expenseId: string;
    expenseDescription: string;
  }>({
    open: false,
    expenseId: "",
    expenseDescription: ""
  });

  // Filtros de status — padrão "Mês Atual" ao abrir a página.
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'currentMonth'>('currentMonth');

  // Filtro de despesas
  const [expenseFilter, setExpenseFilter] = useState<'all' | 'currentMonth'>('currentMonth');

  const queryClient = useQueryClient();
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expandedOverdueClients, setExpandedOverdueClients] = useState<string[]>([]);
  const [renegotiating, setRenegotiating] = useState<{ clientName: string; clientId: string; entries: any[] } | null>(null);

  const toggleOverdueClient = (clientName: string) => {
    setExpandedOverdueClients(prev =>
      prev.includes(clientName) ? prev.filter(n => n !== clientName) : [...prev, clientName]
    );
  };

  useEffect(() => {
    const onFocus = () => {
      refetch();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refetch]);

  const isReady = usePageReady(expensesLoading || financialEntriesLoading);
  if (!isReady) return <PageLoader />;

  // Calculate monthly revenue from active contracts
  const monthlyRevenue = contracts
    .filter(contract => contract.status === 'active')
    .reduce((total, contract) => total + (contract.monthly_value || 0), 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para formatar data sem problemas de timezone
  const formatDateBR = (dateString: string) => {
    // Para datas no formato 'YYYY-MM-DD', formate diretamente sem conversão de timezone
    const dateParts = dateString.split('-');
    const day = dateParts[2];
    const month = dateParts[1];
    const year = dateParts[0];

    return `${day}/${month}/${year}`;
  };

  // Função para criar data local a partir de string YYYY-MM-DD sem problemas de timezone
  const parseLocalDate = (dateString: string) => {
    const dateParts = dateString.split('-');
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1; // JavaScript months are 0-indexed
    const day = parseInt(dateParts[2]);

    return new Date(year, month, day);
  };

  // Filtro correto para contratos e clientes elegíveis para o gráfico
  const contratosElegiveis = contracts.filter(contract => {
    // Contrato deve ser 'active' ou 'expiring'
    const statusContrato = contract.status;
    if (statusContrato !== 'active' && statusContrato !== 'expiring') return false;
    // Cliente deve existir e estar 'Ativo' ou 'A vencer'
    const cliente = contract.client;
    if (!cliente) return false;
    const tags = (cliente.tags || []);
    // Normaliza para evitar problemas de maiúsculas/minúsculas
    const tagsLower = tags.map(t => t.toLowerCase());
    if (!tagsLower.includes('ativo'.toLowerCase()) && !tagsLower.includes('a vencer'.toLowerCase())) return false;
    // Precisa ter valores essenciais
    return contract.monthly_value && contract.start_date && contract.end_date && cliente.payment_day;
  });

  // Nova lógica de projeção mensal
  const contractProjections = contratosElegiveis.map(contract => {
    const start = parseLocalDate(contract.start_date);
    const end = parseLocalDate(contract.end_date);
    const paymentDay = Number(contract.client.payment_day);
    // Lógica do primeiro pagamento
    let firstPaymentDate = new Date(start);
    if (start.getDate() >= paymentDay) {
      // Se começou depois ou no dia do pagamento, só paga no mês seguinte
      firstPaymentDate.setMonth(firstPaymentDate.getMonth() + 1);
    }
    firstPaymentDate.setDate(paymentDay);
    // Corrige se o dia não existe no mês
    if (firstPaymentDate.getDate() !== paymentDay) {
      // Ex: pagamento dia 31 em fevereiro
      firstPaymentDate.setDate(0); // último dia do mês
    }
    // Calcula todos os meses de pagamento dentro da vigência
    let durationInMonths = 0;
    let paymentDate = new Date(firstPaymentDate);
    while (paymentDate <= end) {
      if (paymentDate >= firstPaymentDate && paymentDate <= end) {
        durationInMonths++;
      }
      paymentDate = new Date(paymentDate.getFullYear(), paymentDate.getMonth() + 1, paymentDay);
      // Corrige se o dia não existe no mês
      if (paymentDate.getDate() !== paymentDay) {
        paymentDate.setDate(0);
      }
    }
    return {
      clientName: contract.client.company || 'Cliente não encontrado',
      monthlyValue: Number(contract.monthly_value),
      durationInMonths,
      startMonth: `${firstPaymentDate.getFullYear()}-${String(firstPaymentDate.getMonth() + 1).padStart(2, '0')}`,
    };
  });

  const faturamentoGeral = contractProjections.reduce(
    (total, c) => total + c.monthlyValue * c.durationInMonths, 0
  );

  // Número correto de contratos ativos (status active ou expiring e com data de fim ainda vigente)
  const todayForContracts = new Date();
  todayForContracts.setHours(0, 0, 0, 0);
  const thisYear = todayForContracts.getFullYear();
  const activeContractsCount = contracts.filter(c => {
    if (c.status !== 'active' && c.status !== 'expiring') return false;
    if (!c.end_date) return false;
    const end = parseLocalDate(c.end_date);
    return end >= todayForContracts;
  }).length;

  // Total do ano corrente usando os financial_entries reais (para alinhar com o dashboard)
  const total2026FromEntries = financialEntries
    .filter((entry: any) => {
      if (!entry?.due_date) return false;
      if (entry?.status !== 'paid' && entry?.status !== 'pending') return false;
      const d = parseLocalDate(entry.due_date);
      return d.getFullYear() === thisYear;
    })
    .reduce((sum: number, entry: any) => sum + (Number(entry.amount) || 0), 0);

  // Totais mensais reais (a partir das faturas) — fonte da verdade para o gráfico,
  // garantindo que a curva bata exatamente com os lançamentos financeiros.
  const monthlyData2026 = (() => {
    const totals = Array(12).fill(0);
    for (const entry of financialEntries as any[]) {
      if (!entry?.due_date) continue;
      if (entry?.status !== 'paid' && entry?.status !== 'pending') continue;
      const d = parseLocalDate(entry.due_date);
      if (d.getFullYear() !== thisYear) continue;
      totals[d.getMonth()] += Number(entry.amount) || 0;
    }
    return totals.map((value, i) => {
      const name = new Date(thisYear, i, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
      return { period: name.charAt(0).toUpperCase() + name.slice(1), value };
    });
  })();

  const handleAddExpense = (expenseData: any) => {
    console.log('DEBUG - Dados recebidos para despesa:', expenseData);

    if (!expenseData.description || !expenseData.amount || isNaN(expenseData.amount) || expenseData.amount <= 0 || !expenseData.category || !expenseData.date) {
      console.error('Dados inválidos para despesa:', expenseData);
      return;
    }

    const expense = {
      description: expenseData.description,
      amount: expenseData.amount,
      category: expenseData.category,
      date: expenseData.date,
      status: 'pending',
      type: 'expense',
      is_recurring: expenseData.is_recurring || false,
      recurrence_type: expenseData.recurrence_type
    };

    console.log('DEBUG - Criando despesa:', expense);
    createExpense(expense);
  };

  const handleMarkAsPaid = async (entryId: string) => {
    await markAsPaid(entryId);
  };

  const handlePayExpense = (expenseId: string) => {
    console.log('DEBUG - Pagando despesa:', expenseId);
    payExpense(expenseId);
  };



  const handleDeleteExpense = (expenseId: string, expenseDescription: string) => {
    setDeleteExpenseDialog({
      open: true,
      expenseId,
      expenseDescription
    });
  };

  const confirmDeleteExpense = () => {
    console.log('DEBUG - Excluindo despesa:', deleteExpenseDialog.expenseId);
    deleteExpense(deleteExpenseDialog.expenseId);
    setDeleteExpenseDialog({
      open: false,
      expenseId: "",
      expenseDescription: ""
    });
  };



  // Filtrar lançamentos financeiros conforme status
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Função para determinar status visual
  const getStatusTag = (entry: any) => {
    if (entry.status === 'paid') {
      return { label: 'Pago', color: 'bg-green-600' };
    }
    // Se está pendente e a data de vencimento é anterior ao dia atual, está em atraso
    const dueDate = parseLocalDate(entry.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time for comparison
    dueDate.setHours(0, 0, 0, 0);

    if (entry.status === 'pending' && dueDate < today) {
      return { label: 'Em atraso', color: 'bg-red-600' };
    }
    return { label: 'Em aberto', color: 'bg-yellow-600' };
  };

  // Separar lançamentos em atraso dos demais (sem esconder lançamentos legítimos do banco)
  const overdueEntries = financialEntries.filter((entry: any) => getStatusTag(entry).label === 'Em atraso');

  const normalEntries = financialEntries.filter((entry: any) => getStatusTag(entry).label !== 'Em atraso').filter((entry: any) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'currentMonth') {
      const d = parseLocalDate(entry.due_date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }
    return entry.status === statusFilter;
  });

  // Cálculo dos KPIs
  const receitasMes = financialEntries
    .filter(entry => {
      const d = parseLocalDate(entry.due_date);
      return entry.status === 'paid' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, entry) => sum + Number(entry.amount), 0);

  const despesasMes = expenses
    .filter(e => {
      const d = parseLocalDate(e.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const lucroMes = receitasMes - despesasMes;



  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      <FinancialHeader
        onNewTransaction={() => setIsExpenseModalOpen(true)}
        onSync={() => generateMissingEntries()}
        isSyncing={isGeneratingEntries}
      />

      <ExpenseModal
        onAddExpense={handleAddExpense}
        open={isExpenseModalOpen}
        onOpenChange={setIsExpenseModalOpen}
      />

      <FinancialKPIs
        totalReceitas={faturamentoGeral}
        receitasMes={receitasMes}
        despesasMes={despesasMes}
        lucroMes={lucroMes}
      />

      {/* Pagamentos em Atraso */}
      {overdueEntries.length > 0 && (
        <Card className="liquid-glass dashboard-glow border border-white/5 overflow-hidden">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Pagamentos em Atraso</h3>
              <p className="text-white/30 text-sm mt-0.5">{overdueEntries.length} {overdueEntries.length === 1 ? 'fatura' : 'faturas'}</p>
            </div>
            <span className="text-red-500 font-black text-xl">
              {formatCurrency(overdueEntries.reduce((sum: number, e: any) => sum + Number(e.amount), 0))}
            </span>
          </div>

          <div className="divide-y divide-white/5">
            {(() => {
              const groups = overdueEntries.reduce((acc: Record<string, typeof overdueEntries>, entry: any) => {
                const key = entry.name;
                if (!acc[key]) acc[key] = [];
                acc[key].push(entry);
                return acc;
              }, {});

              return Object.entries(groups).map(([clientName, entries]: [string, any[]]) => {
                const totalAmount = entries.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
                const isExpanded = expandedOverdueClients.includes(clientName);
                return (
                  <div key={clientName} className="hover:bg-white/[0.04] transition-all duration-300 group">
                    {/* Linha do cliente — clicável */}
                    <div
                      className="p-6 cursor-pointer flex items-center justify-between"
                      onClick={() => toggleOverdueClient(clientName)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          {isExpanded
                            ? <ChevronDown className="w-5 h-5 text-white/40 group-hover:text-primary transition-colors" />
                            : <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-primary transition-colors" />
                          }
                        </div>
                        <h4 className="text-white font-semibold text-lg">{clientName}</h4>
                        <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
                          {entries.length} {entries.length === 1 ? 'fatura' : 'faturas'}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <motion.button
                          whileHover={{ scale: 1.05, translateY: -1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            const clientId = entries[0]?.client_id ?? "";
                            setRenegotiating({ clientName, clientId, entries });
                          }}
                          className="btn-danger-glass h-9 px-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"
                        >
                          Renegociar
                        </motion.button>
                        <span className="text-red-500 font-bold text-sm">{formatCurrency(totalAmount)}</span>
                      </div>
                    </div>

                    {/* Faturas individuais — visíveis só quando expandido */}
                    {isExpanded && (
                      <div className="px-6 pb-6 pt-0">
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
                          {entries.map((entry: any, i: number) => (
                            <div
                              key={entry.id}
                              className={`flex items-center justify-between px-6 py-4 hover:bg-white/[0.04] transition-all duration-300 ${i > 0 ? 'border-t border-white/5' : ''}`}
                            >
                              <div className="flex items-center gap-12">
                                <div>
                                  <p className="text-white/30 text-[10px] uppercase font-black tracking-widest mb-1">Referência</p>
                                  <p className="text-white/80 font-medium">{entry.reference}</p>
                                </div>
                                <div>
                                  <p className="text-white/30 text-[10px] uppercase font-black tracking-widest mb-1">Vencimento</p>
                                  <p className="text-white/80 font-medium">{formatDateBR(entry.due_date)}</p>
                                </div>
                                <div>
                                  <p className="text-white/30 text-[10px] uppercase font-black tracking-widest mb-1">Valor</p>
                                  <p className="text-white font-bold">{formatCurrency(Number(entry.amount))}</p>
                                </div>
                              </div>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleMarkAsPaid(entry.id)}
                                disabled={isMarkingAsPaid}
                                className="btn-success-glass rounded-xl h-9 px-4 font-bold transition-colors"
                              >
                                Confirmar
                              </motion.button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </Card>
      )}

      {/* Lançamentos Financeiros */}
      <Card className="liquid-glass border-white/5 dashboard-glow overflow-hidden">
        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Lançamentos Financeiros</h3>
            <p className="text-white/30 text-sm mt-1">Todos os lançamentos do sistema</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Filter buttons */}
            {[
              { id: 'all', label: 'Todos' },
              { id: 'pending', label: 'Em Aberto' },
              { id: 'paid', label: 'Pagos' },
              { id: 'currentMonth', label: 'Mês Atual' }
            ].map((btn) => (
              <motion.div
                key={btn.id}
                whileHover={{ scale: 1.05, translateY: -2 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Button
                  variant="ghost"
                  onClick={() => setStatusFilter(btn.id as any)}
                  className={cn(
                    "h-9 px-4 rounded-xl transition-all font-bold text-xs tracking-tight w-full",
                    statusFilter === btn.id
                      ? "btn-primary-glass text-white border-primary/40"
                      : "liquid-glass text-white/70 hover:text-white border-white/5"
                  )}
                  size="sm"
                >
                  {btn.label}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
          {financialEntriesLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-Porceli-purple border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-Porceli-gray-400">Carregando lançamentos...</p>
            </div>
          ) : normalEntries.length === 0 ? (
            <div className="text-center py-8">
              <TrendingDown className="w-16 h-16 text-Porceli-gray-600 mx-auto mb-4" />
              <p className="text-Porceli-gray-400">Nenhum lançamento encontrado</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {normalEntries.map((entry) => {
                const statusTag = getStatusTag(entry);
                return (
                  <div key={entry.id} className="flex items-center justify-between gap-8 p-6 hover:bg-white/[0.04] transition-all duration-300 group">
                    <h4 className="text-white font-semibold text-lg w-1/3 min-w-0 truncate shrink-0">{entry.name}</h4>
                    <div className="flex items-center gap-12 flex-1">
                      <div>
                        <p className="text-white/30 text-[10px] uppercase font-black tracking-widest mb-1">Valor</p>
                        <p className="text-white font-bold">{formatCurrency(Number(entry.amount))}</p>
                      </div>
                      <div>
                        <p className="text-white/30 text-[10px] uppercase font-black tracking-widest mb-1">Referência</p>
                        <p className="text-white/80 font-medium">{entry.reference}</p>
                      </div>
                      <div>
                        <p className="text-white/30 text-[10px] uppercase font-black tracking-widest mb-1">Vencimento</p>
                        <p className="text-white/80 font-medium">{formatDateBR(entry.due_date)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {entry.status === 'pending' ? (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleMarkAsPaid(entry.id)}
                          disabled={isMarkingAsPaid}
                          className="btn-success-glass rounded-xl h-9 px-4 font-bold transition-colors"
                        >
                          Confirmar
                        </motion.button>
                      ) : (
                        <span className="text-green-500/50 font-bold text-sm tracking-tight">Pago</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </Card>

      {/* Despesas Section */}
      <Card className="liquid-glass border-white/5 dashboard-glow overflow-hidden">
        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Despesas</h3>
            <p className="text-white/30 text-sm mt-1">Todas as despesas do sistema</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Filter buttons */}
            {[
              { id: 'all', label: 'Todos' },
              { id: 'currentMonth', label: 'Mês Atual' }
            ].map((btn) => (
              <motion.div
                key={btn.id}
                whileHover={{ scale: 1.05, translateY: -2 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Button
                  variant="ghost"
                  onClick={() => setExpenseFilter(btn.id as any)}
                  className={cn(
                    "h-9 px-4 rounded-xl transition-all font-bold text-xs tracking-tight w-full",
                    expenseFilter === btn.id
                      ? "btn-primary-glass text-white border-primary/40"
                      : "liquid-glass text-white/70 hover:text-white border-white/5"
                  )}
                  size="sm"
                >
                  {btn.label}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
          {expensesLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-Porceli-purple border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-Porceli-gray-400">Carregando despesas...</p>
            </div>
          ) : (() => {
            const filteredExpenses = expenses.filter((expense) => {
              if (expenseFilter === 'all') return true;
              if (expenseFilter === 'currentMonth') {
                const d = parseLocalDate(expense.date);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
              }
              return true;
            });

            if (filteredExpenses.length === 0) {
              return (
                <div className="text-center py-8">
                  <TrendingDown className="w-16 h-16 text-Porceli-gray-600 mx-auto mb-4" />
                  <p className="text-Porceli-gray-400">Nenhuma despesa encontrada</p>
                </div>
              );
            }

            return (
              <div className="divide-y divide-white/5">
                {filteredExpenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-6 hover:bg-white/[0.04] transition-all duration-300 group">
                    <div className="w-1/3 min-w-0 pr-6">
                      <h4 className="text-white font-semibold text-lg truncate">{expense.description}</h4>
                      {expense.category && (
                        <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mt-0.5">{expense.category}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-12 flex-1">
                      <div>
                        <p className="text-white/30 text-[10px] uppercase font-black tracking-widest mb-1">Data</p>
                        <p className="text-white/80 font-medium">{formatDateBR(expense.date)}</p>
                      </div>
                      {expense.is_recurring && (
                        <div>
                          <p className="text-white/30 text-[10px] uppercase font-black tracking-widest mb-1">Recorrência</p>
                          <Badge className="bg-white/5 text-white/60 border border-white/10 rounded-lg py-0.5 px-2 text-xs">
                            {expense.recurrence_type === 'monthly' && 'Mensal'}
                            {expense.recurrence_type === 'yearly' && 'Anual'}
                            {expense.recurrence_type === 'quarterly' && 'Trimestral'}
                            {expense.recurrence_type === 'semesterly' && 'Semestral'}
                            {!['monthly', 'yearly', 'quarterly', 'semesterly'].includes(expense.recurrence_type) && expense.recurrence_type?.charAt(0).toUpperCase() + expense.recurrence_type?.slice(1)}
                          </Badge>
                        </div>
                      )}
                      <div>
                        <p className="text-white/30 text-[10px] uppercase font-black tracking-widest mb-1">Valor</p>
                        <p className="text-white font-bold">{formatCurrency(Number(expense.amount))}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {expense.status === 'pending' ? (
                        <Button
                          onClick={() => handlePayExpense(expense.id)}
                          disabled={isPaying}
                          className="btn-success-glass rounded-xl h-9 px-4 font-bold transition-all"
                          size="sm"
                        >
                          Pagar
                        </Button>
                      ) : (
                        <span className="text-green-500/50 font-bold text-sm tracking-tight">Pago</span>
                      )}
                      <Button
                        onClick={() => handleDeleteExpense(expense.id, expense.description)}
                        disabled={isDeleting}
                        className="btn-danger-glass rounded-xl h-9 px-4 font-bold transition-all"
                        size="sm"
                      >
                        Excluir
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center p-6">
                  <span className="text-white/40 font-bold uppercase tracking-widest text-xs">Total de Despesas Pendentes</span>
                  <span className="text-white font-black text-2xl tracking-tighter">{formatCurrency(filteredExpenses.filter(e => e.status === 'pending').reduce((acc, e) => acc + Number(e.amount), 0))}</span>
                </div>
              </div>
            );
          })()}
      </Card>

      <ProjectionChart
        contracts={contractProjections}
        activeContractsCount={activeContractsCount}
        financialEntriesTotal2026={total2026FromEntries}
        monthlyData={monthlyData2026}
      />

      <DeleteExpenseDialog
        open={deleteExpenseDialog.open}
        onOpenChange={(open) => setDeleteExpenseDialog(prev => ({ ...prev, open }))}
        onConfirm={confirmDeleteExpense}
        expenseDescription={deleteExpenseDialog.expenseDescription}
      />

      {renegotiating && (
        <RenegotiationModal
          clientName={renegotiating.clientName}
          clientId={renegotiating.clientId}
          overdueEntries={renegotiating.entries}
          onClose={() => setRenegotiating(null)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["financial-entries"] })}
        />
      )}
    </div>
  );
}

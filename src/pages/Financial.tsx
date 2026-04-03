import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, AlertCircle, TrendingDown, Plus } from "lucide-react";
import { FinancialKPIs } from "@/components/Financial/FinancialKPIs";
import { FinancialHeader } from "@/components/Financial/FinancialHeader";
import { ExpenseModal } from "@/components/Financial/ExpenseModal";
import { ProjectionChart } from "@/components/Financial/ProjectionChart";
import { useClients } from "@/hooks/useClients";
import { useContracts } from "@/hooks/useContracts";
import { useExpenses } from "@/hooks/useExpenses";
import { useFinancialEntries } from "@/hooks/useFinancialEntries";
import { DeleteExpenseDialog } from "@/components/Financial/DeleteExpenseDialog";
import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function Financial() {
  const { data: clients = [] } = useClients();
  const { data: contracts = [], refetch } = useContracts();
  const { expenses, createExpense, payExpense, deleteExpense, isLoading: expensesLoading, isPaying, isDeleting } = useExpenses();
  const { financialEntries, financialEntriesLoading, markAsPaid, isMarkingAsPaid, generateMissingEntries, isGeneratingEntries } = useFinancialEntries();

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

  // Filtros de status
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'currentMonth'>('currentMonth');

  // Filtro de despesas
  const [expenseFilter, setExpenseFilter] = useState<'all' | 'currentMonth'>('currentMonth');

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

  useEffect(() => {
    const onFocus = () => {
      refetch();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refetch]);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in">
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
        <Card className="liquid-glass border-red-500/20 shadow-[0_20px_50px_rgba(239,68,68,0.1)] overflow-hidden">
          <div className="p-6 flex items-center gap-3 border-b border-red-500/10 bg-red-500/[0.02]">
            <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center border border-red-500/10">
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-red-200 tracking-tight">Pagamentos em Atraso</h3>
          </div>
          <div className="p-6 space-y-4">
            {overdueEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-5 rounded-2xl liquid-glass border border-white/5 hover:bg-white/[0.04] transition-all">
                <div className="flex-1 grid grid-cols-5 gap-6 items-center">
                  <div>
                    <h4 className="text-white font-bold mb-1 tracking-tight">{entry.name}</h4>
                  </div>
                  <div className="text-center">
                    <p className="text-white/30 text-[10px] uppercase font-black tracking-widest mb-1">Valor</p>
                    <p className="text-white font-bold text-lg">{formatCurrency(Number(entry.amount))}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-white/30 text-[10px] uppercase font-black tracking-widest mb-1">Referência</p>
                    <p className="text-white/80 font-medium">{entry.reference}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-white/30 text-[10px] uppercase font-black tracking-widest mb-1">Vencimento</p>
                    <p className="text-white/80 font-medium">{formatDateBR(entry.due_date)}</p>
                  </div>
                  <div className="flex justify-center">
                    <motion.div
                      whileHover={{ scale: 1.05, translateY: -2 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                      <Button
                        onClick={() => handleMarkAsPaid(entry.id)}
                        disabled={isMarkingAsPaid}
                        className="liquid-glass text-green-500 hover:bg-white/10 border border-white/5 rounded-xl h-11 px-8 font-bold transition-all"
                        size="sm"
                      >
                        Confirmar
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </div>
            ))}
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
                  onClick={() => setStatusFilter(btn.id as any)}
                  className={cn(
                    "h-10 px-5 rounded-xl transition-all font-bold text-xs tracking-tight w-full",
                    statusFilter === btn.id
                      ? "liquid-glass text-primary border-primary/20 shadow-[0_0_15px_rgba(104,41,192,0.1)]"
                      : "liquid-glass text-white/40 hover:text-white hover:bg-white/5 border-white/5"
                  )}
                  size="sm"
                >
                  {btn.label}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="p-6">
          {financialEntriesLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-goat-purple border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-goat-gray-400">Carregando lançamentos...</p>
            </div>
          ) : normalEntries.length === 0 ? (
            <div className="text-center py-8">
              <TrendingDown className="w-16 h-16 text-goat-gray-600 mx-auto mb-4" />
              <p className="text-goat-gray-400">Nenhum lançamento encontrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {normalEntries.map((entry) => {
                const statusTag = getStatusTag(entry);
                return (
                  <div key={entry.id} className="flex items-center justify-between p-5 rounded-2xl liquid-glass border border-white/5 hover:bg-white/[0.04] transition-all group">
                    <div className="flex-1 grid grid-cols-5 gap-6 items-center">
                      <div>
                        <h4 className="text-white font-bold mb-1 tracking-tight">{entry.name}</h4>
                      </div>
                      <div className="text-center">
                        <p className="text-white/30 text-[10px] uppercase font-black tracking-widest mb-1">Valor</p>
                        <p className="text-white font-bold text-lg">{formatCurrency(Number(entry.amount))}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-white/30 text-[10px] uppercase font-black tracking-widest mb-1">Referência</p>
                        <p className="text-white/80 font-medium">{entry.reference}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-white/30 text-[10px] uppercase font-black tracking-widest mb-1">Vencimento</p>
                        <p className="text-white/80 font-medium">{formatDateBR(entry.due_date)}</p>
                      </div>
                      <div className="flex justify-center">
                        {entry.status === 'pending' ? (
                          <motion.div
                            whileHover={{ scale: 1.05, translateY: -2 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                          >
                            <Button
                              onClick={() => handleMarkAsPaid(entry.id)}
                              disabled={isMarkingAsPaid}
                              className="liquid-glass text-green-500 hover:bg-white/10 border border-white/5 rounded-xl h-11 px-8 font-bold transition-all"
                              size="sm"
                            >
                              Confirmar
                            </Button>
                          </motion.div>
                        ) : (
                          <span className="text-green-500/50 font-bold text-sm tracking-tight">Pago</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
                  onClick={() => setExpenseFilter(btn.id as any)}
                  className={cn(
                    "h-10 px-5 rounded-xl transition-all font-bold text-xs tracking-tight w-full",
                    expenseFilter === btn.id
                      ? "liquid-glass text-primary border-primary/20 shadow-[0_0_15px_rgba(104,41,192,0.1)]"
                      : "liquid-glass text-white/40 hover:text-white hover:bg-white/5 border-white/5"
                  )}
                  size="sm"
                >
                  {btn.label}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="p-6">
          {expensesLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-goat-purple border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-goat-gray-400">Carregando despesas...</p>
            </div>
          ) : (() => {
            // Filtrar despesas conforme o filtro selecionado
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
                  <TrendingDown className="w-16 h-16 text-goat-gray-600 mx-auto mb-4" />
                  <p className="text-goat-gray-400">Nenhuma despesa encontrada</p>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {filteredExpenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-5 rounded-2xl liquid-glass border border-white/5 hover:bg-white/[0.04] transition-all group">
                    <div className="flex-1 grid grid-cols-5 gap-6 items-center">
                      <div>
                        <h4 className="text-white font-bold mb-1 tracking-tight">{expense.description}</h4>
                        <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">{expense.category}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-white/30 text-[10px] uppercase font-black tracking-widest mb-1">Data</p>
                        <p className="text-white font-medium">{formatDateBR(expense.date)}</p>
                      </div>
                      <div className="text-center">
                        {expense.is_recurring ? (
                          <Badge className="bg-white/5 text-white/60 border border-white/10 rounded-lg py-1 px-3">
                            {expense.recurrence_type === 'monthly' && 'Mensal'}
                            {expense.recurrence_type === 'yearly' && 'Anual'}
                            {expense.recurrence_type === 'quarterly' && 'Trimestral'}
                            {expense.recurrence_type === 'semesterly' && 'Semestral'}
                            {!['monthly', 'yearly', 'quarterly', 'semesterly'].includes(expense.recurrence_type) && expense.recurrence_type?.charAt(0).toUpperCase() + expense.recurrence_type?.slice(1)}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="text-center">
                        <p className="text-white font-bold text-xl tracking-tight">{formatCurrency(Number(expense.amount))}</p>
                      </div>
                      <div className="flex justify-center gap-3">
                        {expense.status === 'pending' ? (
                          <motion.div
                            whileHover={{ scale: 1.05, translateY: -2 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                          >
                            <Button
                              onClick={() => handlePayExpense(expense.id)}
                              disabled={isPaying}
                              className="liquid-glass text-green-500 hover:bg-white/10 border border-white/5 rounded-xl h-11 px-6 font-bold transition-all"
                              size="sm"
                            >
                              Pagar
                            </Button>
                          </motion.div>
                        ) : (
                          <span className="text-green-500/50 font-bold text-sm tracking-tight">Pago</span>
                        )}
                        <motion.div
                          whileHover={{ scale: 1.05, translateY: -2 }}
                          whileTap={{ scale: 0.95 }}
                          transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        >
                          <Button
                            onClick={() => handleDeleteExpense(expense.id, expense.description)}
                            disabled={isDeleting}
                            className="liquid-glass text-red-500 hover:bg-white/10 border border-white/5 rounded-xl h-11 px-6 font-bold transition-all"
                            size="sm"
                          >
                            Excluir
                          </Button>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center mt-6 p-6 rounded-2xl liquid-glass border border-white/5">
                  <span className="text-white/40 font-bold uppercase tracking-widest text-xs">Total de Despesas Pendentes:</span>
                  <span className="text-white font-black text-2xl tracking-tighter">{formatCurrency(filteredExpenses.filter(e => e.status === 'pending').reduce((acc, e) => acc + Number(e.amount), 0))}</span>
                </div>
              </div>
            );
          })()}
        </div>
      </Card>

      <ProjectionChart contracts={contractProjections} />

      <DeleteExpenseDialog
        open={deleteExpenseDialog.open}
        onOpenChange={(open) => setDeleteExpenseDialog(prev => ({ ...prev, open }))}
        onConfirm={confirmDeleteExpense}
        expenseDescription={deleteExpenseDialog.expenseDescription}
      />
    </div>
  );
}

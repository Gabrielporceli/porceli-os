import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, CreditCard, Landmark, QrCode, CheckSquare, Square, ToggleLeft, ToggleRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { format, parseISO } from "date-fns";

interface OverdueEntry {
  id: string;
  client_id: string;
  name: string;
  amount: number;
  due_date: string;
  reference: string;
  status: string;
}

interface RenegotiationModalProps {
  clientName: string;
  clientId: string;
  overdueEntries: OverdueEntry[];
  onClose: () => void;
  onSuccess: () => void;
}

const BILLING_OPTIONS = [
  { value: "BOLETO",      label: "Boleto Bancário",  icon: Landmark },
  { value: "PIX",         label: "PIX",              icon: QrCode },
  { value: "CREDIT_CARD", label: "Cartão de Crédito", icon: CreditCard },
] as const;

type BillingType = "BOLETO" | "PIX" | "CREDIT_CARD";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function formatDateBR(iso: string) {
  return iso.split("-").reverse().join("/");
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

// ── Taxas Asaas (conforme painel da conta) ─────────────────────────────────
const ASAAS_FEES = {
  BOLETO:      (n: number) => ({ fixed: 1.99 * n, percent: 0 }),  // R$ 1,99 por boleto
  PIX:         (_n: number) => ({ fixed: 0.99,    percent: 0 }),  // R$ 0,99 por pix
  CREDIT_CARD: (n: number) => {
    const percent = n === 1 ? 2.99 : n <= 6 ? 3.49 : n <= 12 ? 3.99 : 4.29;
    return { fixed: 0.49, percent };
  },
};

function calcGrossAmount(netTotal: number, billing: BillingType, n: number): number {
  const { fixed, percent } = ASAAS_FEES[billing](n);
  if (percent === 0) return netTotal + fixed;
  return (netTotal + fixed) / (1 - percent / 100);
}

function calcFeeAmount(net: number, billing: BillingType, n: number): number {
  return calcGrossAmount(net, billing, n) - net;
}

export function RenegotiationModal({
  clientName,
  clientId,
  overdueEntries,
  onClose,
  onSuccess,
}: RenegotiationModalProps) {
  const { user } = useAuth();

  // Seleção de entradas
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(overdueEntries.map((e) => e.id))
  );

  // Modo
  const today = new Date().toISOString().slice(0, 10);
  const [mode, setMode] = useState<"parcelamento" | "personalizado">("parcelamento");

  // ── Modo Parcelamento ──────────────────────────────────────────────────────
  const [dueDate, setDueDate]           = useState(today);
  const [amountStr, setAmountStr]       = useState("");
  const [installments, setInstallments] = useState(1);
  const [billingType, setBillingType]   = useState<BillingType>("BOLETO");
  const [passFeesToClient, setPassFees] = useState(true);
  const [isLoading, setIsLoading]       = useState(false);

  // Entrada
  const [hasEntrada, setHasEntrada]     = useState(false);
  const [entradaStr, setEntradaStr]     = useState("");
  const [entradaDate, setEntradaDate]   = useState(today);

  // ── Modo Personalizado ─────────────────────────────────────────────────────
  interface CustomPayment {
    id: string;
    amountStr: string;
    dueDate: string;
    billingType: BillingType;
  }
  const [customPayments, setCustomPayments] = useState<CustomPayment[]>([
    { id: crypto.randomUUID(), amountStr: "", dueDate: today, billingType: "PIX" },
  ]);

  function addCustomPayment() {
    setCustomPayments(prev => [...prev, {
      id: crypto.randomUUID(), amountStr: "", dueDate: today, billingType: "PIX",
    }]);
  }

  function removeCustomPayment(id: string) {
    setCustomPayments(prev => prev.filter(p => p.id !== id));
  }

  function updateCustomPayment(id: string, field: keyof CustomPayment, value: string) {
    setCustomPayments(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  }

  const customTotal = useMemo(() => {
    return customPayments.reduce((s, p) => {
      const v = parseInt(p.amountStr || "0", 10) / 100;
      return s + v;
    }, 0);
  }, [customPayments]);

  // Taxa total no modo personalizado (uma taxa por pagamento)
  const customTotalFee = useMemo(() => {
    if (!passFeesToClient) return 0;
    return customPayments.reduce((s, p) => {
      const net = parseInt(p.amountStr || "0", 10) / 100;
      return s + calcFeeAmount(net, p.billingType, 1);
    }, 0);
  }, [customPayments, passFeesToClient]);

  function formatCustomAmount(amountStr: string) {
    if (!amountStr) return "";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
      .format(parseInt(amountStr, 10) / 100);
  }

  // Calcula total das selecionadas
  const selectedTotal = useMemo(() => {
    return overdueEntries
      .filter((e) => selectedIds.has(e.id))
      .reduce((s, e) => s + Number(e.amount), 0);
  }, [overdueEntries, selectedIds]);

  // Pre-preenche o valor quando a seleção muda
  useEffect(() => {
    const cents = Math.round(selectedTotal * 100);
    setAmountStr(cents > 0 ? String(cents) : "");
  }, [selectedTotal]);

  // amountStr guarda apenas os dígitos (centavos)
  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "");
    setAmountStr(digits);
  }

  const parsedAmount = useMemo(() => {
    if (!amountStr) return 0;
    return parseInt(amountStr, 10) / 100;
  }, [amountStr]);

  const formattedAmount = useMemo(() => {
    if (!amountStr) return "";
    const n = parseInt(amountStr, 10) / 100;
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
  }, [amountStr]);

  // Entrada
  const parsedEntrada = useMemo(() => {
    if (!entradaStr) return 0;
    return parseInt(entradaStr, 10) / 100;
  }, [entradaStr]);

  const formattedEntrada = useMemo(() => {
    if (!entradaStr) return "";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseInt(entradaStr, 10) / 100);
  }, [entradaStr]);

  // Valor base para parcelamento (total - entrada)
  const baseForInstallments = Math.max(0, parsedAmount - (hasEntrada ? parsedEntrada : 0));

  // Valor bruto (com taxa repassada) ou líquido — aplica sobre o base de parcelamento
  const grossInstallments = passFeesToClient && baseForInstallments > 0
    ? calcGrossAmount(baseForInstallments, billingType, installments)
    : baseForInstallments;
  const feeAmount = passFeesToClient && baseForInstallments > 0
    ? calcFeeAmount(baseForInstallments, billingType, installments)
    : 0;
  // Para entrada, aplica taxa também se repassar
  const grossEntrada = hasEntrada && passFeesToClient && parsedEntrada > 0
    ? calcGrossAmount(parsedEntrada, billingType, 1)
    : parsedEntrada;

  const installmentValue = installments > 0 ? grossInstallments / installments : 0;
  const totalClientPays  = (hasEntrada ? grossEntrada : 0) + grossInstallments;

  function toggleEntry(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === overdueEntries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(overdueEntries.map((e) => e.id)));
    }
  }

  async function handleConfirm() {
    if (selectedIds.size === 0) {
      toast.error("Selecione ao menos uma cobrança para renegociar.");
      return;
    }

    // Validações modo personalizado
    if (mode === "personalizado") {
      if (customPayments.length === 0) { toast.error("Adicione ao menos um pagamento."); return; }
      if (customPayments.some(p => !p.amountStr || !p.dueDate)) {
        toast.error("Preencha valor e data em todos os pagamentos.");
        return;
      }
    } else {
      if (parsedAmount <= 0) { toast.error("Informe um valor válido."); return; }
      if (hasEntrada && parsedEntrada >= parsedAmount) {
        toast.error("O valor da entrada deve ser menor que o total."); return;
      }
    }
    if (!dueDate) {
      toast.error("Informe a data de vencimento das parcelas.");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Busca CNPJ e dados do cliente
      const { data: clientRow, error: clientErr } = await supabase
        .from("clients")
        .select("cnpj, company, email, phone")
        .eq("id", clientId)
        .single();

      if (clientErr || !clientRow?.cnpj) {
        throw new Error("CNPJ do cliente não encontrado. Verifique o cadastro do cliente.");
      }

      const asaasClientData = {
        cnpj:         clientRow.cnpj,
        company_name: clientRow.company,
        email:        clientRow.email,
        phone:        clientRow.phone,
      };

      const newEntries: any[] = [];

      if (mode === "personalizado") {
        // ── Modo personalizado: uma cobrança Asaas por pagamento ──────────────
        for (const [i, p] of customPayments.entries()) {
          const amount = parseInt(p.amountStr, 10) / 100;
          const { data, error } = await supabase.functions.invoke("asaas-renegotiation", {
            body: { ...asaasClientData, billing_type: p.billingType, total_amount: amount, due_date: p.dueDate, installments: 1, description: `Renegociação Pagamento ${i + 1} — ${clientName}` },
          });
          if (error || !data?.success) throw new Error(data?.error || error?.message || `Erro ao criar pagamento ${i + 1} no Asaas.`);
          newEntries.push({ client_id: clientId, user_id: user!.id, name: clientName, amount, due_date: p.dueDate, reference: `Renegociação — Pagamento ${i + 1}/${customPayments.length}`, status: "pending" });
        }

      } else {
        // ── Modo parcelamento ─────────────────────────────────────────────────
        const asaasBase = { ...asaasClientData, billing_type: billingType };

        if (hasEntrada && grossEntrada > 0) {
          const { data, error } = await supabase.functions.invoke("asaas-renegotiation",
            { body: { ...asaasBase, total_amount: grossEntrada, due_date: entradaDate, installments: 1, description: `Entrada Renegociação — ${clientName}` } });
          if (error || !data?.success) throw new Error(data?.error || error?.message || "Erro ao criar entrada no Asaas.");
          newEntries.push({ client_id: clientId, user_id: user!.id, name: clientName, amount: grossEntrada, due_date: entradaDate, reference: "Renegociação — Entrada", status: "pending" });
        }

        if (grossInstallments > 0) {
          const { data, error } = await supabase.functions.invoke("asaas-renegotiation",
            { body: { ...asaasBase, total_amount: grossInstallments, due_date: dueDate, installments, description: `Renegociação — ${clientName}` } });
          if (error || !data?.success) throw new Error(data?.error || error?.message || "Erro ao criar parcelas no Asaas.");
          Array.from({ length: installments }).forEach((_, i) => {
            newEntries.push({ client_id: clientId, user_id: user!.id, name: clientName, amount: installmentValue, due_date: i === 0 ? dueDate : addMonths(dueDate, i), reference: installments > 1 ? `Renegociação — Parcela ${i + 1}/${installments}` : "Renegociação", status: "pending" });
          });
        }
      }

      // Apaga cobranças em atraso selecionadas
      const { error: delErr } = await supabase.from("financial_entries").delete().in("id", Array.from(selectedIds));
      if (delErr) throw new Error("Erro ao remover cobranças antigas: " + delErr.message);

      // Insere novas entradas
      const { error: insErr } = await supabase.from("financial_entries").insert(newEntries);
      if (insErr) throw new Error("Erro ao criar novas cobranças: " + insErr.message);

      toast.success("Renegociação concluída com sucesso!");
      onSuccess();
      onClose();

    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  const modal = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl"
      >
        <div className="liquid-glass border border-white/10 rounded-2xl overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/5">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Renegociar Pagamentos</h2>
              <p className="text-white/40 text-sm mt-0.5">{clientName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/30 hover:text-white/70 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">

            {/* Seleção de cobranças */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-white/60 text-xs font-black uppercase tracking-widest">
                  Cobranças em Atraso
                </p>
                <button
                  onClick={toggleAll}
                  className="text-white/40 hover:text-primary text-xs transition-colors"
                >
                  {selectedIds.size === overdueEntries.length ? "Desmarcar todas" : "Selecionar todas"}
                </button>
              </div>

              <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden divide-y divide-white/5">
                {overdueEntries.map((entry) => {
                  const selected = selectedIds.has(entry.id);
                  return (
                    <button
                      key={entry.id}
                      onClick={() => toggleEntry(entry.id)}
                      className={cn(
                        "w-full flex items-center gap-4 px-4 py-3 text-left transition-colors",
                        selected ? "bg-white/[0.03]" : "hover:bg-white/[0.03]"
                      )}
                    >
                      {selected
                        ? <CheckSquare className="w-4 h-4 text-white/60 flex-shrink-0" />
                        : <Square className="w-4 h-4 text-white/20 flex-shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-white/70 text-sm truncate">{entry.reference}</p>
                        <p className="text-white/30 text-xs">Venc. {formatDateBR(entry.due_date)}</p>
                      </div>
                      <span className={cn(
                        "text-sm font-bold flex-shrink-0",
                        selected ? "text-red-500" : "text-white/30"
                      )}>
                        {formatCurrency(Number(entry.amount))}
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedIds.size > 0 && (
                <p className="text-white/40 text-xs text-right">
                  {selectedIds.size} selecionada{selectedIds.size !== 1 ? "s" : ""} · Total original: <span className="text-white/60 font-bold">{formatCurrency(selectedTotal)}</span>
                </p>
              )}
            </div>

            {/* Termos da renegociação */}
            <div className="space-y-4">
              {/* Abas de modo */}
              <div className="flex gap-2 p-1 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                {([
                  { value: "parcelamento",  label: "Parcelamento" },
                  { value: "personalizado", label: "Personalizado" },
                ] as const).map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setMode(value)}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                      mode === value
                        ? "bg-primary text-white shadow-[0_0_15px_rgba(104,41,192,0.3)]"
                        : "text-white/40 hover:text-white/70"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {mode === "personalizado" ? (
                /* ── UI Modo Personalizado ─────────────────────────────────── */
                <div className="space-y-2">
                  {customPayments.map((p, i) => (
                    <div key={p.id} className="liquid-glass !rounded-xl overflow-hidden">
                      {/* Header do card */}
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
                        <span className="text-white/50 text-[10px] font-black uppercase tracking-widest">
                          Pagamento {i + 1}
                        </span>
                        {customPayments.length > 1 && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => removeCustomPayment(p.id)}
                            className="text-white/20 hover:text-red-500 transition-colors text-[10px] font-bold uppercase tracking-wider"
                          >
                            Remover
                          </motion.button>
                        )}
                      </div>

                      {/* Campos */}
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-white/30 text-[10px] font-black uppercase tracking-widest">Valor</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={formatCustomAmount(p.amountStr)}
                              onChange={(e) => updateCustomPayment(p.id, "amountStr", e.target.value.replace(/\D/g, ""))}
                              placeholder="R$ 0,00"
                              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white font-semibold text-sm focus:outline-none focus:border-primary/40 transition-colors"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-white/30 text-[10px] font-black uppercase tracking-widest">Vencimento</label>
                            <DatePicker
                              date={p.dueDate ? parseISO(p.dueDate) : undefined}
                              setDate={(d) => updateCustomPayment(p.id, "dueDate", d ? format(d, "yyyy-MM-dd") : "")}
                              className="h-10"
                            />
                          </div>
                        </div>

                        {/* Forma de pagamento */}
                        <div className="flex gap-2">
                          {BILLING_OPTIONS.map(({ value, label, icon: Icon }) => (
                            <button
                              key={value}
                              onClick={() => updateCustomPayment(p.id, "billingType", value)}
                              className={cn(
                                "flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl border text-xs font-bold transition-all",
                                p.billingType === value
                                  ? "bg-primary/15 border-primary/40 text-primary"
                                  : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:bg-white/[0.06] hover:text-white/70"
                              )}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              {label === "Boleto Bancário" ? "Boleto" : label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={addCustomPayment}
                    className="w-full h-10 rounded-xl border border-dashed border-white/10 text-white/30 hover:border-primary/30 hover:text-primary text-xs font-bold uppercase tracking-widest transition-all"
                  >
                    + Adicionar Pagamento
                  </motion.button>

                  {/* Total vs alvo */}
                  <div className={cn(
                    "flex justify-between text-sm px-1",
                    Math.abs(customTotal - parsedAmount) > 0.01 ? "text-yellow-400" : "text-green-400"
                  )}>
                    <span>Total dos pagamentos</span>
                    <span className="font-bold">{formatCurrency(customTotal)}</span>
                  </div>
                </div>
              ) : (
              /* ── UI Modo Parcelamento ───────────────────────────────────── */
              <>
              {/* Valor */}
              <div className="space-y-1.5">
                <label className="text-white/50 text-xs font-medium">Valor Total</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formattedAmount}
                  onChange={handleAmountChange}
                  placeholder="R$ 0,00"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-primary/40 transition-colors"
                />
              </div>

              {/* Entrada */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/[0.05] rounded-xl">
                  <div className="space-y-0.5">
                    <Label className="text-white font-medium cursor-pointer" onClick={() => setHasEntrada(v => !v)}>
                      Cobrar entrada
                    </Label>
                    <p className="text-white/40 text-xs">
                      {hasEntrada ? "Pagamento inicial + restante parcelado." : "Sem entrada, apenas parcelamento."}
                    </p>
                  </div>
                  <Switch
                    checked={hasEntrada}
                    onCheckedChange={setHasEntrada}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>

                {hasEntrada && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-white/50 text-xs font-medium">Valor da Entrada</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formattedEntrada}
                        onChange={(e) => setEntradaStr(e.target.value.replace(/\D/g, ""))}
                        placeholder="R$ 0,00"
                        className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-primary/40 transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-white/50 text-xs font-medium">Vencimento da Entrada</label>
                      <DatePicker
                        date={entradaDate ? parseISO(entradaDate) : undefined}
                        setDate={(d) => setEntradaDate(d ? format(d, "yyyy-MM-dd") : "")}
                      />
                    </div>
                  </div>
                )}

                {hasEntrada && parsedEntrada > 0 && baseForInstallments > 0 && (
                  <p className="text-white/40 text-xs text-right">
                    Restante a parcelar: <span className="text-white/60 font-bold">{formatCurrency(baseForInstallments)}</span>
                  </p>
                )}
              </div>

              {/* Parcelas + Vencimento */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-white/50 text-xs font-medium">Parcelas</label>
                  <Select
                    value={String(installments)}
                    onValueChange={(v) => setInstallments(Number(v))}
                  >
                    <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white rounded-xl h-10 focus:border-primary/40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[99999]">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}x {n > 1 ? `de ${formatCurrency(parsedAmount / n)}` : "à vista"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-white/50 text-xs font-medium">
                    {installments > 1 ? "Vencimento da 1ª parcela" : "Vencimento"}
                  </label>
                  <DatePicker
                    date={dueDate ? parseISO(dueDate) : undefined}
                    setDate={(d) => setDueDate(d ? format(d, "yyyy-MM-dd") : "")}
                  />
                </div>
              </div>

              {/* Forma de pagamento */}
              <div className="space-y-1.5">
                <label className="text-white/50 text-xs font-medium">Forma de Pagamento</label>
                <div className="grid grid-cols-3 gap-2">
                  {BILLING_OPTIONS.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setBillingType(value)}
                      className={cn(
                        "flex flex-col items-center gap-2 py-3 px-2 rounded-xl border text-xs font-medium transition-all",
                        billingType === value
                          ? "bg-primary/15 border-primary/40 text-primary"
                          : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:bg-white/[0.06] hover:text-white/70"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
                {billingType === "CREDIT_CARD" && (
                  <p className="text-white/30 text-xs mt-1">
                    O cliente receberá um link seguro para inserir os dados do cartão.
                  </p>
                )}
              </div>

              {/* Toggle: Repassar taxas ao cliente */}
              <div className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/[0.05] rounded-xl">
                <div className="space-y-0.5">
                  <Label className="text-white font-medium cursor-pointer" onClick={() => setPassFees(v => !v)}>
                    Repassar taxas ao cliente
                  </Label>
                  <p className="text-white/40 text-xs">
                    {passFeesToClient ? "O valor será ajustado para cobrir as taxas do Asaas." : "Você absorve as taxas do Asaas."}
                  </p>
                </div>
                <Switch
                  checked={passFeesToClient}
                  onCheckedChange={setPassFees}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              </> )} {/* fim modo parcelamento */}

              {/* Resumo */}
              {(mode === "parcelamento" ? parsedAmount > 0 : customTotal > 0) && (
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-1.5">
                  <p className="text-white/30 text-xs font-black uppercase tracking-widest mb-2">Resumo</p>

                  {mode === "personalizado" ? (
                    <>
                      {customPayments.map((p, i) => {
                        const net = parseInt(p.amountStr || "0", 10) / 100;
                        const fee = passFeesToClient ? calcFeeAmount(net, p.billingType, 1) : 0;
                        const gross = net + fee;
                        const label = p.billingType === "BOLETO" ? "Boleto" : p.billingType === "PIX" ? "PIX" : "Cartão";
                        return net > 0 ? (
                          <div key={p.id} className="flex justify-between text-sm">
                            <span className="text-white/50">Pag. {i + 1} — {label} ({formatDateBR(p.dueDate)})</span>
                            <span className="text-white font-bold">{formatCurrency(gross)}</span>
                          </div>
                        ) : null;
                      })}
                      {passFeesToClient && customTotalFee > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-white/50">Taxa Asaas (repassada)</span>
                          <span className="text-yellow-400 font-bold">+ {formatCurrency(customTotalFee)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm border-t border-white/5 pt-1.5 mt-1.5">
                        <span className="text-white/70 font-semibold">Total cobrado do cliente</span>
                        <span className="text-white font-black">{formatCurrency(customTotal + customTotalFee)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      {hasEntrada && grossEntrada > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-white/50">Entrada ({formatDateBR(entradaDate)})</span>
                          <span className="text-white font-bold">{formatCurrency(grossEntrada)}</span>
                        </div>
                      )}
                      {grossInstallments > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-white/50">
                            {installments}x de {formatCurrency(installmentValue)}
                            {hasEntrada ? " (restante)" : ""}
                          </span>
                          <span className="text-white font-bold">{formatCurrency(grossInstallments)}</span>
                        </div>
                      )}
                      {passFeesToClient && feeAmount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-white/50">Taxa Asaas (repassada)</span>
                          <span className="text-yellow-400 font-bold">+ {formatCurrency(feeAmount + (hasEntrada && grossEntrada > parsedEntrada ? grossEntrada - parsedEntrada : 0))}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm border-t border-white/5 pt-1.5 mt-1.5">
                        <span className="text-white/70 font-semibold">Total cobrado do cliente</span>
                        <span className="text-white font-black">{formatCurrency(totalClientPays)}</span>
                      </div>
                    </>
                  )}

                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Cobranças removidas</span>
                    <span className="text-red-500 font-bold">{selectedIds.size} entrada{selectedIds.size !== 1 ? "s" : ""}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-6 border-t border-white/5">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 h-11 rounded-xl liquid-glass border border-white/[0.08] text-white/60 hover:text-white font-bold text-sm uppercase tracking-widest transition-colors"
            >
              Cancelar
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleConfirm}
              disabled={isLoading || selectedIds.size === 0 || (mode === "parcelamento" ? parsedAmount <= 0 : customPayments.length === 0)}
              className="flex-[2] h-11 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm uppercase tracking-widest transition-colors shadow-[0_0_20px_rgba(104,41,192,0.3)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
            >
              {isLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</>
                : "Confirmar Renegociação"
              }
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );

  return createPortal(modal, document.body);
}

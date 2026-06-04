"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { useScrollLock } from "@/hooks/useScrollLock";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LiquidGlass } from "@/components/ui/liquid-glass";

interface Contract {
  id: string;
  client?: string;
  monthlyValue: number;
  endDate: string;
}

interface DeleteContractDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onConfirmWithFine: (amount: number, dueDate: string) => void;
  contract: Contract | null;
}

export function DeleteContractDialog({
  isOpen,
  onClose,
  onConfirm,
  onConfirmWithFine,
  contract
}: DeleteContractDialogProps) {
  useScrollLock(isOpen);

  const [step, setStep] = useState<'confirm' | 'fine-form'>('confirm');
  const [fineAmount, setFineAmount] = useState('');
  const [fineDueDate, setFineDueDate] = useState('');

  const handleClose = () => {
    setStep('confirm');
    setFineAmount('');
    setFineDueDate('');
    onClose();
  };

  if (!isOpen || !contract) return null;

  // --- Cálculo de multa ---
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = new Date(new Date(contract.endDate).valueOf() + new Date(contract.endDate).getTimezoneOffset() * 60000);
  const isExpired = today > endDate;

  let monthsRemaining = 0;
  if (!isExpired) {
    const yearDiff = endDate.getFullYear() - today.getFullYear();
    const monthDiff = endDate.getMonth() - today.getMonth();
    monthsRemaining = yearDiff * 12 + monthDiff;
    if (today.getDate() <= endDate.getDate()) monthsRemaining += 1;
    if (monthsRemaining < 0) monthsRemaining = 0;
  }

  const remainingValue = monthsRemaining * contract.monthlyValue;
  const penaltyFee = remainingValue * 0.20;

  const handleOpenFineForm = () => {
    setFineAmount(penaltyFee.toFixed(2));
    // Vencimento padrão: 10 dias a partir de hoje
    const defaultDue = new Date();
    defaultDue.setDate(defaultDue.getDate() + 10);
    setFineDueDate(defaultDue.toISOString().split('T')[0]);
    setStep('fine-form');
  };

  const handleConfirmFine = () => {
    const amount = parseFloat(fineAmount.replace(',', '.'));
    if (!amount || isNaN(amount) || amount <= 0 || !fineDueDate) return;
    onConfirmWithFine(amount, fineDueDate);
    setStep('confirm');
    setFineAmount('');
    setFineDueDate('');
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const isFineValid =
    !!fineAmount && !!fineDueDate && parseFloat(fineAmount.replace(',', '.')) > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="border-white/[0.05] shadow-2xl text-white w-full max-w-lg !p-0 !gap-0 !flex flex-col overflow-hidden !rounded-3xl">
        <LiquidGlass className="h-full w-full flex flex-col !p-0">

          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/[0.05] shrink-0">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-white tracking-tight">
                {step === 'fine-form' ? 'Definir Multa Rescisória' : 'Cancelar Contrato'}
              </DialogTitle>
              <p className="text-white/40 text-sm">
                {step === 'fine-form'
                  ? `Informe os dados da cobrança${contract.client ? ` — ${contract.client}` : ''}`
                  : 'Rescisão e cálculo de multa'}
              </p>
            </DialogHeader>
          </div>

          {/* Content — Step: confirm */}
          {step === 'confirm' && (
            <div className="p-7 space-y-8">
              {isExpired ? (
                <div className="text-center space-y-4">
                  <p className="text-lg text-white font-medium">Este contrato já está vencido.</p>
                  <p className="text-white/40 text-sm leading-relaxed">
                    Deseja remover este contrato do sistema?<br />Esta ação não pode ser desfeita.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <p className="text-lg text-white font-medium text-center">
                    {contract.client
                      ? `Cancelar contrato de ${contract.client}?`
                      : 'Confirmar cancelamento do contrato?'}
                  </p>

                  <div className="text-left bg-white/[0.02] p-6 rounded-2xl border border-white/[0.05] space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-white/30 text-[10px] font-black uppercase tracking-widest">Meses Restantes</span>
                      <span className="text-white font-bold">{monthsRemaining}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/30 text-[10px] font-black uppercase tracking-widest">Valor Restante</span>
                      <span className="text-white font-bold">{formatCurrency(remainingValue)}</span>
                    </div>
                    <div className="pt-4 border-t border-white/[0.05] flex justify-between items-center">
                      <span className="text-red-400/60 text-[10px] font-black uppercase tracking-widest">Multa Rescisória (20%)</span>
                      <span className="text-red-400 font-black text-xl">{formatCurrency(penaltyFee)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Content — Step: fine-form */}
          {step === 'fine-form' && (
            <div className="p-7 space-y-6">
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-white/30 text-[10px] font-black uppercase tracking-widest">
                    Valor da Multa (R$)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={fineAmount}
                    onChange={e => setFineAmount(e.target.value)}
                    className="h-12 bg-white/[0.03] border-white/10 text-white rounded-2xl placeholder:text-white/20 focus:border-primary focus:ring-0 font-bold text-lg"
                    placeholder="0.00"
                  />
                  <p className="text-white/20 text-xs">
                    Sugestão: {formatCurrency(penaltyFee)} (20% do valor restante)
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-white/30 text-[10px] font-black uppercase tracking-widest">
                    Data de Vencimento
                  </label>
                  <Input
                    type="date"
                    value={fineDueDate}
                    onChange={e => setFineDueDate(e.target.value)}
                    className="h-12 bg-white/[0.03] border-white/10 text-white rounded-2xl focus:border-primary focus:ring-0 font-medium"
                  />
                </div>
              </div>

              <p className="text-[11px] text-white/20 italic">
                O contrato será cancelado e uma fatura de multa será gerada nas entradas financeiras.
              </p>
            </div>
          )}

          {/* Footer — Step: confirm */}
          {step === 'confirm' && (
            <div className="flex gap-3 p-6 border-t border-white/[0.05]">
              <motion.div whileHover={{ scale: 1.05, translateY: -2 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
                <Button
                  type="button"
                  onClick={handleClose}
                  variant="ghost"
                  className="liquid-glass h-12 px-6 text-white/70 border border-white/5 rounded-xl transition-all uppercase tracking-widest text-xs font-bold hover:bg-white/10"
                >
                  Voltar
                </Button>
              </motion.div>

              <motion.div className="flex-1" whileHover={{ scale: 1.05, translateY: -2 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
                <Button
                  type="button"
                  onClick={onConfirm}
                  className="w-full h-12 liquid-glass text-red-500 border border-red-500/20 hover:bg-red-500/10 hover:border-red-500/40 rounded-xl transition-all uppercase tracking-widest text-xs font-bold"
                >
                  {isExpired ? 'Remover' : 'Só Cancelar'}
                </Button>
              </motion.div>

              {!isExpired && (
                <motion.div className="flex-1" whileHover={{ scale: 1.05, translateY: -2 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
                  <Button
                    type="button"
                    onClick={handleOpenFineForm}
                    className="w-full h-12 liquid-glass text-red-500 border border-red-500/30 hover:bg-red-500/15 hover:border-red-500/50 rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.15)] transition-all uppercase tracking-widest text-xs font-bold"
                  >
                    Cancelar + Multa
                  </Button>
                </motion.div>
              )}
            </div>
          )}

          {/* Footer — Step: fine-form */}
          {step === 'fine-form' && (
            <div className="flex gap-3 p-6 border-t border-white/[0.05]">
              <motion.div whileHover={{ scale: 1.05, translateY: -2 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
                <Button
                  type="button"
                  onClick={() => setStep('confirm')}
                  variant="ghost"
                  className="liquid-glass h-12 px-6 text-white/70 border border-white/5 rounded-xl transition-all uppercase tracking-widest text-xs font-bold hover:bg-white/10"
                >
                  Voltar
                </Button>
              </motion.div>

              <motion.div className="flex-1" whileHover={{ scale: 1.05, translateY: -2 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
                <Button
                  type="button"
                  onClick={handleConfirmFine}
                  disabled={!isFineValid}
                  className="w-full h-12 liquid-glass text-red-500 border border-red-500/30 hover:bg-red-500/15 hover:border-red-500/50 rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.15)] transition-all uppercase tracking-widest text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  Confirmar e Cancelar
                </Button>
              </motion.div>
            </div>
          )}

        </LiquidGlass>
      </DialogContent>
    </Dialog>
  );
}

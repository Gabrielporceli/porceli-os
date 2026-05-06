"use client";

import { Button } from "@/components/ui/button";
import { X, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { useScrollLock } from "@/hooks/useScrollLock";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { cn } from "@/lib/utils";

interface Contract {
  id: string;
  monthlyValue: number;
  endDate: string;
}

interface DeleteContractDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  contract: Contract | null;
}

export function DeleteContractDialog({
  isOpen,
  onClose,
  onConfirm,
  contract
}: DeleteContractDialogProps) {
  useScrollLock(isOpen);

  if (!isOpen || !contract) return null;

  // --- Lógica de Cálculo ---
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = new Date(new Date(contract.endDate).valueOf() + new Date(contract.endDate).getTimezoneOffset() * 60000);
  const isExpired = today > endDate;

  let monthsRemaining = 0;
  if (!isExpired) {
    const yearDiff = endDate.getFullYear() - today.getFullYear();
    const monthDiff = endDate.getMonth() - today.getMonth();
    monthsRemaining = yearDiff * 12 + monthDiff;
    if (today.getDate() <= endDate.getDate()) {
      monthsRemaining += 1;
    }
    if (monthsRemaining < 0) monthsRemaining = 0;
  }

  const remainingValue = monthsRemaining * contract.monthlyValue;
  const penaltyFee = remainingValue * 0.20;

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-white/[0.05] shadow-2xl text-white w-full max-w-lg !p-0 !gap-0 !flex flex-col overflow-hidden !rounded-3xl">
        <LiquidGlass className="h-full w-full flex flex-col !p-0">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/[0.05] shrink-0">
            <div className="flex items-center gap-3">
              <div>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold text-white tracking-tight">Cancelar Contrato</DialogTitle>
                  <p className="text-white/40 text-sm">Rescisão e cálculo de multa</p>
                </DialogHeader>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-7 text-center space-y-8">
            {isExpired ? (
              <div className="space-y-4">
                <p className="text-lg text-white font-medium">Este contrato já está vencido.</p>
                <p className="text-white/40 text-sm leading-relaxed">
                  Deseja remover este contrato do sistema?<br />Esta ação não pode ser desfeita.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-lg text-white font-medium">Confirmar cancelamento do contrato?</p>
                
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

                <p className="text-[11px] text-white/20 italic">
                  O contrato será marcado como inativo e a multa será registrada financeiramente.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-4 p-6 border-t border-white/[0.05]">
            <motion.div 
              className="flex-1" 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
            >
              <Button
                type="button"
                onClick={onClose}
                variant="ghost"
                className="w-full h-12 bg-white/[0.05] hover:bg-white/10 text-white/70 border border-white/5 rounded-2xl transition-all uppercase tracking-widest text-xs font-bold"
              >
                Voltar
              </Button>
            </motion.div>
            <motion.div 
              className="flex-1" 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
            >
              <Button
                type="button"
                onClick={onConfirm}
                className="w-full h-12 bg-red-600 hover:bg-red-700 text-white rounded-2xl shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all uppercase tracking-widest text-xs font-bold"
              >
                {isExpired ? 'Remover' : 'Cancelar'}
              </Button>
            </motion.div>
          </div>
        </LiquidGlass>
      </DialogContent>
    </Dialog>
  );
}

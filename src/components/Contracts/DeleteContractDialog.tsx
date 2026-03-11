
"use client";

import { Button } from "@/components/ui/button";
import { X, AlertTriangle } from "lucide-react";
import ReactDOM from "react-dom";
import { useScrollLock } from "@/hooks/useScrollLock";

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
  // --- Fim da Lógica de Cálculo ---

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return ReactDOM.createPortal(
    <div
      style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed', zIndex: 999999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      className="flex items-center justify-center animate-fade-in"
      onClick={handleOverlayClick}
    >
      <div
        className="relative liquid-glass rounded-2xl shadow-2xl w-full max-w-lg border border-white/5 animate-scale-in backdrop-blur-3xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-7 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/10">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Cancelar Contrato</h2>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="text-white/20 hover:text-white hover:bg-white/5 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="p-7 text-center space-y-4">
          {isExpired ? (
            <>
              <p className="text-lg text-white font-medium">Este contrato já está vencido.</p>
              <p className="text-white/40 text-sm leading-relaxed">
                Deseja remover este contrato do sistema?<br />Esta ação não pode ser desfeita.
              </p>
            </>
          ) : (
            <>
              <p className="text-lg text-white font-medium">Tem certeza que deseja cancelar este contrato?</p>
              <div className="text-left bg-white/[0.02] p-5 rounded-2xl border border-white/5 space-y-3">
                <div className="flex justify-between items-center"><span className="text-white/30 text-[10px] font-black uppercase tracking-widest">Meses Restantes</span> <span className="text-white font-bold">{monthsRemaining}</span></div>
                <div className="flex justify-between items-center"><span className="text-white/30 text-[10px] font-black uppercase tracking-widest">Valor Restante</span> <span className="text-white font-bold">{formatCurrency(remainingValue)}</span></div>
                <div className="pt-2 border-t border-white/5 flex justify-between items-center"><span className="text-red-400/60 text-[10px] font-black uppercase tracking-widest">Multa (20%)</span> <span className="text-red-400 font-black text-lg">{formatCurrency(penaltyFee)}</span></div>
              </div>
              <p className="text-xs text-white/20 pt-2 italic">
                O contrato será marcado como inativo e a multa será registrada.
              </p>
            </>
          )}
        </div>
        <div className="flex gap-4 p-7 bg-white/[0.01] border-t border-white/5">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="flex-1 h-12 text-white/40 hover:text-white hover:bg-white/5 rounded-xl font-bold transition-all"
          >
            Voltar
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className="flex-1 h-12 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all shadow-[0_10px_20px_rgba(239,68,68,0.15)]"
          >
            {isExpired ? 'Sim, Remover' : 'Sim, Cancelar'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}


import { LiquidGlassButton } from "@/components/ui/liquid-glass-button";
import { useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Danger, Profile2User, Trash } from 'iconsax-react';
import { Lead } from "@/hooks/useLeads";

interface DeleteLeadDialogProps {
  isOpen: boolean;
  lead: Lead | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteLeadDialog({
  isOpen,
  lead,
  onClose,
  onConfirm
}: DeleteLeadDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen && !!lead} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="text-white max-w-md"
        chip={
          <DialogTitle className="truncate text-xl font-black tracking-tight flex items-center gap-2">
            <Trash className="w-4 h-4 text-red-400 shrink-0" />
            Excluir Lead
          </DialogTitle>
        }
      >
        <div className="p-6 space-y-4">
          <div className="bg-red-600/10 border border-red-600/20 rounded-xl p-3">
            <div className="flex items-start gap-3">
              <Danger className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <h3 className="font-semibold text-red-400 text-sm">
                  Atenção: Exclusão Permanente
                </h3>
                <p className="text-red-300 text-xs leading-relaxed opacity-80">
                  Ao confirmar, todos os dados deste lead serão removidos permanentemente do seu CRM.
                </p>
              </div>
            </div>
          </div>

          {lead && (
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">
                Dados do Lead
              </h4>
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-Porceli-purple/10 flex items-center justify-center border border-Porceli-purple/20">
                    <Profile2User className="w-5 h-5 text-Porceli-purple" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-bold text-base truncate">{lead.name}</p>
                    <p className="text-white/40 text-sm truncate">{lead.company}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-1">
                  {lead.phone && (
                    <div>
                      <span className="text-white/20 text-[10px] font-bold uppercase block mb-0.5">Telefone</span>
                      <p className="text-white/70 text-xs truncate">{lead.phone}</p>
                    </div>
                  )}
                  {lead.email && (
                    <div>
                      <span className="text-white/20 text-[10px] font-bold uppercase block mb-0.5">E-mail</span>
                      <p className="text-white/70 text-xs truncate" title={lead.email}>{lead.email}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t border-white/[0.05] shrink-0">
          <motion.div
            className="flex-1"
            whileHover={{ scale: 1.05, translateY: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <LiquidGlassButton
              tint="danger"
              onClick={onClose}
              className="w-full h-11 text-xs font-bold uppercase tracking-widest"
              disabled={isDeleting}
            >
              Cancelar
            </LiquidGlassButton>
          </motion.div>

          <motion.div
            className="flex-1"
            whileHover={{ scale: 1.05, translateY: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <LiquidGlassButton
              tint="danger"
              onClick={handleConfirm}
              disabled={isDeleting}
              className="w-full h-11 text-xs font-bold uppercase tracking-widest"
            >
              {isDeleting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Excluindo...
                </div>
              ) : (
                'Confirmar Exclusão'
              )}
            </LiquidGlassButton>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

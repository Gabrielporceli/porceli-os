"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button";
import { useScrollLock } from "@/hooks/useScrollLock";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  company: string;
  cnpj?: string;
  responsible?: string;
  phone?: string;
  email?: string;
  contractEnd?: string;
  paymentDay?: number;
  tags?: string[];
  address?: string;
  plan?: string;
  startDate?: string;
}

interface DeleteClientDialogProps {
  isOpen: boolean;
  client: Client | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteClientDialog({ 
  isOpen, 
  client, 
  onClose, 
  onConfirm 
}: DeleteClientDialogProps) {
  useScrollLock(isOpen);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen || !client) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-white/[0.05] shadow-2xl text-white w-full max-w-lg !p-0 !gap-0 !flex flex-col overflow-hidden !rounded-3xl">
        <LiquidGlass className="h-full w-full flex flex-col !p-0">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/[0.05] shrink-0">
            <div className="flex items-center gap-3">
              <div>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold text-white tracking-tight">Excluir Cliente</DialogTitle>
                  <p className="text-white/40 text-sm">Esta ação é irreversível</p>
                </DialogHeader>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">
            <style>{`
              .custom-scrollbar::-webkit-scrollbar {
                width: 6px;
              }
              .custom-scrollbar::-webkit-scrollbar-track {
                background: transparent;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb {
                background: rgba(239, 68, 68, 0.2);
                border-radius: 10px;
              }
            `}</style>

            {/* Warning Section */}
            <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-red-500 uppercase tracking-widest">
                    Atenção: Exclusão Permanente
                  </h3>
                  <p className="text-red-400/80 text-sm leading-relaxed">
                    Todos os dados de <strong>{client.company}</strong> serão deletados permanentemente de nossos servidores.
                  </p>
                </div>
              </div>
            </div>

            {/* Client Info Section */}
            <div className="space-y-4">
              <h4 className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em] border-b border-white/[0.05] pb-2 ml-1">
                Dados do Alvo
              </h4>
              
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5 space-y-6">
                <div className="space-y-1">
                  <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">Nome da Empresa</span>
                  <p className="text-white font-bold text-lg tracking-tight">{client.company}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">Responsável</span>
                    <p className="text-white font-medium text-sm">{client.responsible || "Não informado"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">Plano Atual</span>
                    <p className="text-white font-medium text-sm">{client.plan || "Nenhum"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">CNPJ</span>
                    <p className="text-white font-medium text-sm">{client.cnpj || "Não informado"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">Status</span>
                    <p className={cn(
                      "font-bold text-sm",
                      client.tags?.[0] === 'Ativo' ? "text-green-400" : "text-red-400"
                    )}>{client.tags?.[0] || "Indefinido"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-4 p-6 border-t border-white/[0.05]">
            <motion.div
              className="flex-1"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <LiquidGlassButton
                tint="danger"
                onClick={onClose}
                disabled={isDeleting}
                className="w-full h-12 text-xs font-bold uppercase tracking-widest"
              >
                Cancelar
              </LiquidGlassButton>
            </motion.div>
            <motion.div
              className="flex-1"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <LiquidGlassButton
                tint="danger"
                onClick={handleConfirm}
                disabled={isDeleting}
                className="w-full h-12 text-xs font-bold uppercase tracking-widest"
              >
                {isDeleting ? "Processando..." : "Confirmar Exclusão"}
              </LiquidGlassButton>
            </motion.div>
          </div>
        </LiquidGlass>
      </DialogContent>
    </Dialog>
  );
}

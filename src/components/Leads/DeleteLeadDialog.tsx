
"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Trash2, X, AlertTriangle, Users } from "lucide-react";
import ReactDOM from "react-dom";
import { useScrollLock } from "@/hooks/useScrollLock";
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

  if (!isOpen || !lead) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return ReactDOM.createPortal(
    <div 
      style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed', zIndex: 10000000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      className="flex items-center justify-center animate-fade-in"
      onClick={handleOverlayClick}
    >
      <div 
        className="relative liquid-glass rounded-2xl shadow-2xl w-full max-w-md border border-white/[0.05] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes scale-in {
            from { 
              transform: scale(0.95);
              opacity: 0;
            }
            to { 
              transform: scale(1);
              opacity: 1;
            }
          }
          
          .animate-fade-in {
            animation: fade-in 0.2s ease-out;
          }
          
          .animate-scale-in {
            animation: scale-in 0.2s ease-out;
          }
        `}</style>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/[0.05]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Excluir Lead</h2>
              <p className="text-white/40 text-xs mt-0.5">Esta ação não pode ser desfeita</p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="text-white/40 hover:text-white hover:bg-white/10 rounded-lg h-8 w-8 transition-colors"
            disabled={isDeleting}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Warning Section */}
          <div className="bg-red-600/10 border border-red-600/20 rounded-xl p-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
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

          {/* Lead Info Section */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">
              Dados do Lead
            </h4>
            
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-goat-purple/10 flex items-center justify-center border border-goat-purple/20">
                  <Users className="w-5 h-5 text-goat-purple" />
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
                    <p className="text-white/80 text-xs truncate">{lead.phone}</p>
                  </div>
                )}
                {lead.email && (
                  <div>
                    <span className="text-white/20 text-[10px] font-bold uppercase block mb-0.5">E-mail</span>
                    <p className="text-white/80 text-xs truncate" title={lead.email}>{lead.email}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-white/[0.05]">
          <Button
            onClick={onClose}
            className="flex-1 h-11 text-sm font-bold bg-white/[0.05] hover:bg-white/10 text-white/70 border border-white/5 rounded-2xl transition-all duration-200"
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="flex-1 h-11 text-sm font-bold bg-red-500 hover:bg-red-600 text-white rounded-2xl shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all duration-200 disabled:opacity-50"
          >
            {isDeleting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Excluindo...
              </div>
            ) : (
              'Confirmar Exclusão'
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

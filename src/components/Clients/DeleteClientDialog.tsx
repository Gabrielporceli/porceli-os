
"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Trash2, X, AlertTriangle } from "lucide-react";
import ReactDOM from "react-dom";

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
        <div className="flex items-center justify-between p-3 border-b border-white/[0.05]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-center">
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Excluir Cliente</h2>
              <p className="text-white/40 text-xs">Esta ação não pode ser desfeita</p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="text-white/40 hover:text-white hover:bg-white/10 rounded-lg h-7 w-7 transition-colors"
            disabled={isDeleting}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-3 space-y-3">
          {/* Warning Section - Reduced */}
          <div className="bg-red-600/10 border border-red-600/20 rounded-lg p-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <h3 className="font-medium text-red-400 text-xs">
                  Atenção: Exclusão Permanente
                </h3>
                <p className="text-red-300 text-xs leading-tight">
                  Todos os dados serão perdidos permanentemente.
                </p>
              </div>
            </div>
          </div>

          {/* Client Info Section */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-white border-b border-white/[0.05] pb-1">
              Dados do Cliente
            </h4>
            
            <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2 space-y-2">
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <span className="text-white/40 text-xs">Empresa:</span>
                  <p className="text-white font-medium text-sm truncate">{client.company}</p>
                </div>
                
                {client.cnpj && client.responsible && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-white/40 text-xs">CNPJ:</span>
                      <p className="text-white text-xs truncate">{client.cnpj}</p>
                    </div>
                    <div>
                      <span className="text-white/40 text-xs">Responsável:</span>
                      <p className="text-white text-xs truncate">{client.responsible}</p>
                    </div>
                  </div>
                )}

                {client.phone && client.email && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-white/40 text-xs">Telefone:</span>
                      <p className="text-white text-xs truncate">{client.phone}</p>
                    </div>
                    <div>
                      <span className="text-white/40 text-xs">E-mail:</span>
                      <p className="text-white text-xs truncate" title={client.email}>{client.email}</p>
                    </div>
                  </div>
                )}

                {client.plan && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-white/40 text-xs">Plano:</span>
                      <p className="text-white text-xs truncate">{client.plan}</p>
                    </div>
                    {client.tags && client.tags.length > 0 && (
                      <div>
                        <span className="text-white/40 text-xs">Status:</span>
                        <p className={`text-xs truncate ${
                          client.tags[0] === 'Ativo'
                            ? 'text-green-400'
                            : client.tags[0] === 'A vencer'
                            ? 'text-yellow-400'
                            : 'text-red-400'
                        }`}>
                          {client.tags[0]}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-3 border-t border-white/[0.05]">
          <Button
            onClick={onClose}
            className="flex-1 h-9 text-sm font-semibold bg-white/[0.05] hover:bg-white/10 text-white/70 border border-white/5 rounded-xl transition-all duration-200"
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="flex-1 h-9 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Excluindo...
              </div>
            ) : (
              'Excluir Cliente'
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

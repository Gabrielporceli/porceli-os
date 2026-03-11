
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Plus, Phone, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactDOM from "react-dom";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { useScrollLock } from "@/hooks/useScrollLock";

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNewConversation: (client: string, phone: string) => void;
}

export function NewConversationModal({
  isOpen,
  onClose,
  onNewConversation
}: NewConversationModalProps) {
  useScrollLock(isOpen);
  const [client, setClient] = useState("");
  const [phone, setPhone] = useState("");
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!client.trim() || !phone.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha o nome do cliente e telefone",
        variant: "destructive",
      });
      return;
    }

    onNewConversation(client.trim(), phone.trim());
    setClient("");
    setPhone("");
    onClose();

    toast({
      title: "Conversa iniciada",
      description: `Nova conversa criada com ${client}`,
    });
  };

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return ReactDOM.createPortal(
    <>
      {/* Custom Overlay with blur */}
      <div
        style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed', zIndex: 999999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        className="animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 pointer-events-none">
        <LiquidGlass
          className="relative w-full max-w-md shadow-2xl animate-scale-in p-6 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-6 border-b border-white/[0.05]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(104,41,192,0.4)]">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Nova Conversa</h2>
                <p className="text-white/40 text-sm">Preencha os dados para começar</p>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="text-white/40 hover:text-white hover:bg-white/[0.05] rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Conteúdo e Formulário */}
          <div className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="client" className="text-white/70 font-medium text-sm">Nome do Cliente</Label>
                <Input
                  id="client"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  placeholder="Digite o nome do cliente..."
                  className="bg-white/[0.03] border-white/[0.05] text-white placeholder:text-white/30 h-11 rounded-xl focus:border-primary/50 transition-all hover:bg-white/[0.05]"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-white/70 font-medium text-sm">Telefone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/30" />
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+55 11 99999-9999"
                    className="pl-10 bg-white/[0.03] border-white/[0.05] text-white placeholder:text-white/30 h-11 rounded-xl focus:border-primary/50 transition-all hover:bg-white/[0.05]"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-4 justify-end pt-4">
                <Button
                  type="button"
                  onClick={onClose}
                  variant="outline"
                  className="h-11 border-white/[0.05] text-white/70 bg-white/[0.02] hover:bg-white/[0.05] hover:text-white rounded-xl transition-all"
                >
                  Cancelar
                </Button>
                <Button type="submit" className="h-11 bg-primary text-white hover:bg-primary/90 shadow-[0_0_15px_rgba(104,41,192,0.4)] rounded-xl transition-all font-bold px-6">
                  Iniciar Conversa
                </Button>
              </div>
            </form>
          </div>
        </LiquidGlass>
      </div>
    </>,
    document.body
  );
}

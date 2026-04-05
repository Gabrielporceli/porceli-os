"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { X, Edit } from "lucide-react";
import { motion } from "framer-motion";
import ReactDOM from "react-dom";
import { useScrollLock } from "@/hooks/useScrollLock";

interface Client {
  id: string;
  company: string;
  cnpj: string;
  responsible: string;
  phone: string;
  email: string;
  grupoId?: string;
  contractEnd: string;
  paymentDay: number;
  tags: string[];
  address: string;
  plan?: string;
  startDate?: string;
  monthlyValue: string;
}

interface ClientData {
  company: string;
  cnpj: string;
  responsible: string;
  phone: string;
  email: string;
  grupoId?: string;
  contractEnd: string;
  paymentDay: number;
  tags: string[];
  address: string;
  plan?: string;
  startDate?: string;
  monthlyValue?: number;
}

interface EditClientModalProps {
  isOpen: boolean;
  client: Client | null;
  onClose: () => void;
  onSave: (clientData: ClientData) => void;
  onPlanColorChange: (planName: string, color: string) => void;
  planColors: Record<string, string>;
}

export function EditClientModal({
  isOpen,
  client,
  onClose,
  onSave,
  onPlanColorChange,
  planColors,
}: EditClientModalProps) {
  useScrollLock(isOpen);

  const [formData, setFormData] = useState<Client>({
    id: "",
    company: "",
    cnpj: "",
    responsible: "",
    phone: "",
    email: "",
    grupoId: "",
    contractEnd: "",
    paymentDay: 1,
    tags: ["Ativo"],
    address: "",
    plan: "Vendas",
    startDate: "",
    monthlyValue: "0,00",
  });

  useEffect(() => {
    if (client) {
      setFormData({ ...client });
    }
  }, [client]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const clientData: ClientData = {
      ...formData,
      monthlyValue: parseFloat(formData.monthlyValue?.replace(',', '.') || '0'),
    };

    onSave(clientData);
  };

  const handleChange = (field: keyof Client, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };



  if (!isOpen || !client) return null;

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
        <div
          className="relative liquid-glass rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] border border-white/[0.05] animate-scale-in pointer-events-auto"
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
          
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.02);
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #6829c0;
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #6B21D3;
          }
          .custom-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: #6829c0 #404040;
          }
          
            .custom-scrollbar {
              scrollbar-width: thin;
              scrollbar-color: #6829c0 #404040;
            }
          `}</style>

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.05]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-Porceli-purple rounded-lg flex items-center justify-center">
              <Edit className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Editar Cliente</h2>
              <p className="text-white/40 text-sm">Atualize os dados do cliente</p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content with Custom Scrollbar */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)] custom-scrollbar">
          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            {/* Informações Básicas */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white border-b border-white/[0.05] pb-2">
                Informações Básicas
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="company" className="text-white">Nome da Empresa *</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => handleChange("company", e.target.value)}
                    className="bg-white/[0.03] border-white/[0.05] focus:border-primary/50 text-white placeholder:text-white/20 h-11 rounded-xl transition-all"
                    placeholder="Ex: Tech Solutions LTDA"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cnpj" className="text-white">CNPJ *</Label>
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => handleChange("cnpj", e.target.value)}
                    className="bg-white/[0.03] border-white/[0.05] focus:border-primary/50 text-white placeholder:text-white/20 h-11 rounded-xl transition-all"
                    placeholder="00.000.000/0000-00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsible" className="text-white">Responsável *</Label>
                  <Input
                    id="responsible"
                    value={formData.responsible}
                    onChange={(e) => handleChange("responsible", e.target.value)}
                    className="bg-white/[0.03] border-white/[0.05] focus:border-primary/50 text-white placeholder:text-white/20 h-11 rounded-xl transition-all"
                    placeholder="Nome do responsável"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-white">Telefone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className="bg-white/[0.03] border-white/[0.05] focus:border-primary/50 text-white placeholder:text-white/20 h-11 rounded-xl transition-all"
                    placeholder="(11) 99999-9999"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className="bg-white/[0.03] border-white/[0.05] focus:border-primary/50 text-white placeholder:text-white/20 h-11 rounded-xl transition-all"
                    placeholder="cliente@empresa.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="grupoId" className="text-white">Grupo ID</Label>
                  <Input
                    id="grupoId"
                    type="text"
                    value={formData.grupoId || ""}
                    onChange={(e) => handleChange("grupoId", e.target.value)}
                    className="bg-white/[0.03] border-white/[0.05] focus:border-primary/50 text-white placeholder:text-white/20 h-11 rounded-xl transition-all"
                    placeholder="ID do grupo"
                  />
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white border-b border-white/[0.05] pb-2">
                Localização
              </h3>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-white">Endereço</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  className="bg-white/[0.03] border-white/[0.05] focus:border-primary/50 text-white placeholder:text-white/20 rounded-xl transition-all resize-none"
                  rows={3}
                  placeholder="Endereço completo do cliente"
                />
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-4 pt-6 border-t border-white/[0.05]">
              <motion.div 
                className="flex-1" 
                whileHover={{ scale: 1.05, translateY: -2 }} 
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Button
                  type="button"
                  onClick={onClose}
                  className="liquid-glass hover:bg-white/10 text-white/70 border-white/5 w-full h-11 rounded-2xl font-bold transition-all text-base"
                >
                  Cancelar
                </Button>
              </motion.div>
              <motion.div 
                className="flex-1" 
                whileHover={{ scale: 1.05, translateY: -2 }} 
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-white w-full h-11 rounded-2xl shadow-[0_0_20px_rgba(104,41,192,0.3)] font-bold transition-all text-base"
                >
                  Salvar
                </Button>
              </motion.div>
            </div>
          </form>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { Edit } from "lucide-react";
import { motion } from "framer-motion";
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-white/[0.05] shadow-2xl text-white w-full max-w-3xl !p-0 !gap-0 max-h-[85vh] !flex flex-col overflow-hidden">
        <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
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
            scrollbar-color: #6829c0 transparent;
          }
        `}</style>

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.05] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-Porceli-purple rounded-lg flex items-center justify-center">
              <Edit className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-white tracking-tight">Editar Cliente</DialogTitle>
                <p className="text-white/40 text-sm">Atualize os dados do cliente</p>
              </DialogHeader>
            </div>
          </div>
        </div>

        {/* Content with Custom Scrollbar */}
        <div className="overflow-y-auto custom-scrollbar" style={{ maxHeight: '55vh' }}>
          <form id="edit-client-form" onSubmit={handleSubmit} className="p-6 space-y-8">
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

          </form>
          </div>

          {/* Footer fixo */}
          <div className="flex gap-4 p-6 border-t border-white/[0.05] shrink-0">
            <motion.div className="flex-1" whileHover={{ scale: 1.05, translateY: -2 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
              <LiquidGlassButton tint="danger" type="button" onClick={onClose} className="w-full h-11 text-xs font-bold uppercase tracking-widest">
                Cancelar
              </LiquidGlassButton>
            </motion.div>
            <motion.div className="flex-1" whileHover={{ scale: 1.05, translateY: -2 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
              <LiquidGlassButton tint="primary" type="submit" form="edit-client-form" className="w-full h-11 text-xs font-bold uppercase tracking-widest">
                Salvar
              </LiquidGlassButton>
            </motion.div>
          </div>
      </DialogContent>
    </Dialog>
  );
}

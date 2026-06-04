"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateClient } from '@/hooks/useClients';
import { DatePicker } from "@/components/ui/date-picker";
import { parseISO, format } from "date-fns";
import { useScrollLock } from "@/hooks/useScrollLock";
import { X, DollarSign } from "lucide-react";
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
  client: string;
  client_id: string;
  type: string;
  monthlyValue: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'inactive' | 'expiring' | 'concluded';
  payment_day?: number;
  contract_url?: string;
}

interface EditContractModalProps {
  isOpen: boolean;
  contract: Contract | null;
  onClose: () => void;
  onSave: (contractData: Omit<Contract, 'id'>) => void;
}

export function EditContractModal({ isOpen, contract, onClose, onSave }: EditContractModalProps) {
  useScrollLock(isOpen);
  const [formData, setFormData] = useState({
    client: '',
    client_id: '',
    type: '',
    monthlyValue: '0,00',
    startDate: '',
    endDate: '',
    status: 'active' as Contract['status'],
    payment_day: '1',
    contract_url: ''
  });
  const updateClient = useUpdateClient();

  useEffect(() => {
    if (contract) {
      setFormData({
        client: contract.client,
        client_id: contract.client_id,
        type: contract.type,
        monthlyValue: contract.monthlyValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        startDate: contract.startDate,
        endDate: contract.endDate,
        status: contract.status,
        payment_day: (contract.payment_day || 1).toString(),
        contract_url: contract.contract_url || ''
      });
    }
  }, [contract]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.status === 'inactive' && formData.client_id) {
      await updateClient.mutateAsync({
        id: formData.client_id,
        tags: ['Inativo']
      });
    }

    const monthlyValueNumber = parseFloat(formData.monthlyValue.replace('.', '').replace(',', '.')) || 0;

    onSave({
      ...formData,
      monthlyValue: monthlyValueNumber,
      payment_day: parseInt(formData.payment_day) || 1
    });
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleMonthlyValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/[^\d,]/g, '');
    const parts = value.split(',');
    if (parts.length > 2) {
      value = parts[0] + ',' + parts.slice(1).join('');
    }
    if (parts[1] && parts[1].length > 2) {
      value = parts[0] + ',' + parts[1].substring(0, 2);
    }
    handleInputChange('monthlyValue', value);
  };

  const handleMonthlyValueBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (value === '' || value === '0' || value === '0,') {
      handleInputChange('monthlyValue', '0,00');
      return;
    }
    if (!value.includes(',')) {
      value = value + ',00';
    } else {
      const parts = value.split(',');
      if (!parts[1] || parts[1] === '') {
        value = parts[0] + ',00';
      } else if (parts[1].length === 1) {
        value = parts[0] + ',' + parts[1] + '0';
      }
    }
    handleInputChange('monthlyValue', value);
  };

  if (!isOpen || !contract) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-white/[0.05] shadow-2xl text-white w-full max-w-3xl !p-0 !gap-0 max-h-[85vh] overflow-hidden !rounded-3xl flex flex-col">
        <LiquidGlass className="w-full flex flex-col flex-1 min-h-0 !p-0">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-white/[0.05] shrink-0">
            <div className="flex items-center gap-3">
              <div>
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-white tracking-tight">Editar Contrato</DialogTitle>
                  <p className="text-white/40 text-xs">Atualize os dados e condições do contrato</p>
                </DialogHeader>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto custom-scrollbar p-6" style={{ maxHeight: '55vh' }}>
            <style>{`
              .custom-scrollbar::-webkit-scrollbar {
                width: 6px;
              }
              .custom-scrollbar::-webkit-scrollbar-track {
                background: transparent;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb {
                background: rgba(104, 41, 192, 0.2);
                border-radius: 10px;
              }
            `}</style>

            <form id="edit-contract-form" onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="client" className="text-white/50 text-[10px] font-bold uppercase tracking-widest ml-1">Cliente</Label>
                  <Input
                    id="client"
                    value={formData.client}
                    onChange={(e) => handleInputChange('client', e.target.value)}
                    className="bg-white/[0.02] border-white/[0.05] text-white rounded-xl h-10 focus:border-primary/50 transition-all text-sm"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="type" className="text-white/50 text-[10px] font-bold uppercase tracking-widest ml-1">Tipo de Serviço</Label>
                  <Input
                    id="type"
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="bg-white/[0.02] border-white/[0.05] text-white rounded-xl h-10 focus:border-primary/50 transition-all text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="monthlyValue" className="text-white/50 text-[10px] font-bold uppercase tracking-widest ml-1">Valor Mensal (R$)</Label>
                  <div className="relative group">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 group-focus-within:text-primary transition-colors" />
                    <Input
                      id="monthlyValue"
                      type="text"
                      value={formData.monthlyValue}
                      onChange={handleMonthlyValueChange}
                      onBlur={handleMonthlyValueBlur}
                      className="bg-white/[0.02] border-white/[0.05] text-white rounded-xl h-10 pl-9 focus:border-primary/50 transition-all text-sm font-bold"
                      placeholder="0,00"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="payment_day" className="text-white/50 text-[10px] font-bold uppercase tracking-widest ml-1">Dia de Pagamento (1-28) *</Label>
                  <Input
                    id="payment_day"
                    type="number"
                    min="1"
                    max="28"
                    value={formData.payment_day}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val > 28) handleInputChange('payment_day', "28");
                      else if (val < 1 && e.target.value !== "") handleInputChange('payment_day', "1");
                      else handleInputChange('payment_day', e.target.value);
                    }}
                    className="bg-white/[0.02] border-white/[0.05] text-white rounded-xl h-10 focus:border-primary/50 transition-all text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contract_url" className="text-white/50 text-[10px] font-bold uppercase tracking-widest ml-1">Link do Contrato</Label>
                <Input
                  id="contract_url"
                  type="url"
                  placeholder="https://..."
                  value={formData.contract_url}
                  onChange={(e) => handleInputChange('contract_url', e.target.value)}
                  className="bg-white/[0.02] border-white/[0.05] text-white rounded-xl h-10 focus:border-primary/50 transition-all text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-white/50 text-[10px] font-bold uppercase tracking-widest ml-1">Data de Início</Label>
                  <DatePicker
                    date={formData.startDate ? parseISO(formData.startDate) : undefined}
                    setDate={(newDate) => {
                      if (newDate) handleInputChange('startDate', format(newDate, "yyyy-MM-dd"));
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-white/50 text-[10px] font-bold uppercase tracking-widest ml-1">Data de Término</Label>
                  <DatePicker
                    date={formData.endDate ? parseISO(formData.endDate) : undefined}
                    setDate={(newDate) => {
                      if (newDate) handleInputChange('endDate', format(newDate, "yyyy-MM-dd"));
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status" className="text-white/50 text-[10px] font-bold uppercase tracking-widest ml-1">Status do Contrato</Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                  <SelectTrigger className="bg-white/[0.02] border-white/[0.05] h-10 rounded-xl text-white/70 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active" className="cursor-pointer">Ativo</SelectItem>
                    <SelectItem value="expiring" className="cursor-pointer">A vencer</SelectItem>
                    <SelectItem value="concluded" className="cursor-pointer">Concluído</SelectItem>
                    <SelectItem value="inactive" className="cursor-pointer">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            </form>
          </div>

          {/* Footer fixo */}
          <div className="flex gap-3 p-6 border-t border-white/[0.05] shrink-0">
            <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="button"
                onClick={onClose}
                className="w-full h-10 bg-white/[0.03] hover:bg-white/10 text-white/60 border border-white/5 rounded-xl transition-all uppercase tracking-widest text-[10px] font-bold"
              >
                Cancelar
              </Button>
            </motion.div>
            <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="submit"
                form="edit-contract-form"
                className="bg-primary hover:bg-primary/90 text-white w-full h-10 rounded-xl shadow-[0_0_15px_rgba(104,41,192,0.2)] font-bold uppercase tracking-widest text-[10px]"
              >
                Salvar Alterações
              </Button>
            </motion.div>
          </div>
        </LiquidGlass>
      </DialogContent>
    </Dialog>
  );
}

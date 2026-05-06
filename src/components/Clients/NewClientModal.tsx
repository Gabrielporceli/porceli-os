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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { Users, Plus, X, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { ColorPicker } from "./ColorPicker";
import { usePlansContext } from "@/contexts/PlansContext";
import ReactDOM from "react-dom";
import { DatePicker } from "@/components/ui/date-picker";
import { parseISO, format } from "date-fns";
import { useScrollLock } from "@/hooks/useScrollLock";

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (clientData: {
    company: string;
    cnpj: string;
    responsible: string;
    phone: string;
    email: string;
    grupo_id?: string;
    plan: string;
    contract_end: string | null;
    start_date: string | null;
    payment_day: number;
    monthly_value: number;
    address: string;
    tags: string[];
  }) => void;
  onPlanColorChange?: (planName: string, color: string) => void;
  planColors?: Record<string, string>;
}

export function NewClientModal({
  isOpen,
  onClose,
  onSave,
  onPlanColorChange,
  planColors = {}
}: NewClientModalProps) {
  useScrollLock(isOpen);
  const { getPlanNames, createPlan, getPlanByName } = usePlansContext();
  const planOptions = getPlanNames();

  const [formData, setFormData] = useState({
    company: "",
    cnpj: "",
    responsible: "",
    phone: "",
    email: "",
    grupo_id: "",
    plan: planOptions[0] || "Vendas",
    contract_end: "",
    start_date: "",
    payment_day: "1",
    monthly_value: "0,00",
    address: "",
    tags: ["Ativo"],
  });

  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanColor, setNewPlanColor] = useState("bg-purple-600 text-white hover:bg-purple-700");
  const [showAddPlan, setShowAddPlan] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Convert monthlyValue from Brazilian format to number
    const monthlyValueNumber = parseFloat(formData.monthly_value.replace(',', '.')) || 0;

    // Convert empty strings to null for date fields and ensure proper date format
    const formatDateForDatabase = (dateString: string) => {
      if (!dateString || dateString.trim() === '') return null;
      // Ensure the date is in YYYY-MM-DD format
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return null;
      return date.toISOString().split('T')[0];
    };

    const contractEnd = formatDateForDatabase(formData.contract_end);
    const startDate = formatDateForDatabase(formData.start_date);

    const clientData = {
      company: formData.company,
      cnpj: formData.cnpj,
      responsible: formData.responsible,
      phone: formData.phone,
      email: formData.email,
      grupo_id: formData.grupo_id || undefined,
      plan: formData.plan,
      contract_end: contractEnd,
      start_date: startDate,
      payment_day: parseInt(formData.payment_day) || 1,
      monthly_value: monthlyValueNumber,
      address: formData.address,
      tags: formData.tags,
    };

    console.log('DEBUG - Dados do cliente sendo enviados:', clientData);
    console.log('DEBUG - Tipos dos dados:', {
      contract_end: typeof clientData.contract_end,
      start_date: typeof clientData.start_date,
      monthly_value: typeof clientData.monthly_value,
      payment_day: typeof clientData.payment_day
    });
    console.log('DEBUG - Valores dos dados:', {
      contract_end: clientData.contract_end,
      start_date: clientData.start_date,
      monthly_value: clientData.monthly_value,
      payment_day: clientData.payment_day
    });

    onSave(clientData);
    setFormData({
      company: "",
      cnpj: "",
      responsible: "",
      phone: "",
      email: "",
      grupo_id: "",
      plan: planOptions[0] || "Vendas",
      contract_end: "",
      start_date: "",
      payment_day: "1",
      monthly_value: "0,00",
      address: "",
      tags: ["Ativo"],
    });
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleMonthlyValueBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    let value = e.target.value;

    if (value === '' || value === '0' || value === '0,') {
      handleChange("monthly_value", "0,00");
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

    handleChange("monthly_value", value);
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

    handleChange("monthly_value", value);
  };

  const handlePaymentDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    value = value.replace(/\D/g, '');

    const numValue = parseInt(value);

    if (numValue > 31) {
      value = '31';
    } else if (numValue < 1 && value !== '') {
      value = '1';
    }

    handleChange("payment_day", value);
  };

  const handleAddCustomPlan = async () => {
    if (newPlanName.trim() && !planOptions.includes(newPlanName.trim())) {
      try {
        await createPlan({
          name: newPlanName.trim(),
          color: newPlanColor,
        });

        setFormData((prev) => ({ ...prev, plan: newPlanName.trim() }));

        setNewPlanName("");
        setNewPlanColor("bg-purple-600 text-white hover:bg-purple-700");
        setShowAddPlan(false);
      } catch (error) {
        console.error('Error creating plan:', error);
      }
    }
  };

  const getPlanColor = (planName: string) => {
    const plan = getPlanByName(planName);
    return plan?.color || 'bg-purple-600 text-white hover:bg-purple-700';
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-white/[0.05] shadow-2xl text-white w-full max-w-3xl !p-0 !gap-0 h-[90vh] !flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.05] shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-white tracking-tight">Novo Cliente</DialogTitle>
                <p className="text-white/40 text-sm">Preencha os dados do novo cliente</p>
              </DialogHeader>
            </div>
          </div>
        </div>

        {/* Content with Custom Scrollbar */}
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          <style>{`
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
              scrollbar-color: #6829c0 transparent;
            }
          `}</style>

          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            {/* Informações Básicas */}
            <div className="space-y-6">
              <h3 className="text-sm font-black text-white/30 uppercase tracking-[0.2em] border-b border-white/[0.05] pb-2">
                Informações Básicas
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="company" className="text-white/70 text-xs font-bold uppercase tracking-widest">Nome da Empresa *</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => handleChange("company", e.target.value)}
                    className="bg-white/[0.03] border-white/[0.05] text-white focus:border-primary/50 placeholder:text-white/10 h-11 rounded-xl transition-all"
                    placeholder="Ex: Tech Solutions LTDA"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cnpj" className="text-white/70 text-xs font-bold uppercase tracking-widest">CNPJ *</Label>
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => handleChange("cnpj", e.target.value)}
                    className="bg-white/[0.03] border-white/[0.05] text-white focus:border-primary/50 placeholder:text-white/10 h-11 rounded-xl transition-all"
                    placeholder="00.000.000/0000-00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsible" className="text-white/70 text-xs font-bold uppercase tracking-widest">Responsável *</Label>
                  <Input
                    id="responsible"
                    value={formData.responsible}
                    onChange={(e) => handleChange("responsible", e.target.value)}
                    className="bg-white/[0.03] border-white/[0.05] text-white focus:border-primary/50 placeholder:text-white/10 h-11 rounded-xl transition-all"
                    placeholder="Nome do responsável"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-white/70 text-xs font-bold uppercase tracking-widest">Telefone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className="bg-white/[0.03] border-white/[0.05] text-white focus:border-primary/50 placeholder:text-white/10 h-11 rounded-xl transition-all"
                    placeholder="(11) 99999-9999"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white/70 text-xs font-bold uppercase tracking-widest">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className="bg-white/[0.03] border-white/[0.05] text-white focus:border-primary/50 placeholder:text-white/10 h-11 rounded-xl transition-all"
                    placeholder="cliente@empresa.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="grupo_id" className="text-white/70 text-xs font-bold uppercase tracking-widest">Grupo ID</Label>
                  <Input
                    id="grupo_id"
                    type="text"
                    value={formData.grupo_id}
                    onChange={(e) => handleChange("grupo_id", e.target.value)}
                    className="bg-white/[0.03] border-white/[0.05] text-white focus:border-primary/50 placeholder:text-white/10 h-11 rounded-xl transition-all"
                    placeholder="ID do grupo"
                  />
                </div>
              </div>
            </div>

            {/* Plano e Valores */}
            <div className="space-y-6">
              <h3 className="text-sm font-black text-white/30 uppercase tracking-[0.2em] border-b border-white/[0.05] pb-2">
                Plano e Valores
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="flex justify-between text-white/70 text-xs font-bold uppercase tracking-widest">
                    Plano
                    <Button
                      type="button"
                      size="sm"
                      className="bg-primary/20 hover:bg-primary/30 text-primary border-primary/20 h-6 px-2 text-[10px] font-bold uppercase tracking-wider"
                      onClick={() => setShowAddPlan(!showAddPlan)}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Novo
                    </Button>
                  </Label>

                  {showAddPlan && (
                    <div className="space-y-4 p-4 rounded-xl border border-white/[0.05] bg-white/[0.02] animate-in fade-in slide-in-from-top-2">
                      <div className="space-y-2">
                        <Input
                          value={newPlanName}
                          onChange={(e) => setNewPlanName(e.target.value)}
                          placeholder="Nome do novo plano"
                          className="bg-white/[0.03] border-white/[0.05] focus:border-primary/50 text-white placeholder:text-white/10 h-11 rounded-xl transition-all text-sm"
                          onKeyPress={(e) => e.key === "Enter" && handleAddCustomPlan()}
                        />
                      </div>

                      <ColorPicker
                        selectedColor={newPlanColor}
                        onColorChange={setNewPlanColor}
                        label="Cor do Plano"
                      />

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleAddCustomPlan}
                          className="bg-primary hover:bg-primary/90 text-white flex-1 h-9 rounded-lg text-xs font-bold uppercase tracking-wider"
                        >
                          Adicionar Plano
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setShowAddPlan(false)}
                          className="bg-white/[0.05] hover:bg-white/10 text-white/70 border border-white/5 transition-all flex-1 h-9 rounded-lg text-xs font-bold uppercase tracking-wider"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}

                  <Select value={formData.plan} onValueChange={(value) => handleChange("plan", value)}>
                    <SelectTrigger className="bg-white/[0.03] border-white/[0.05] h-11 rounded-xl text-white/70">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {planOptions.map((plan) => (
                        <SelectItem
                          key={plan}
                          value={plan}
                          className="cursor-pointer"
                        >
                          {plan}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthly_value" className="text-white/70 text-xs font-bold uppercase tracking-widest">Valor Mensal (R$)</Label>
                  <Input
                    id="monthly_value"
                    type="text"
                    value={formData.monthly_value}
                    onChange={handleMonthlyValueChange}
                    onBlur={handleMonthlyValueBlur}
                    onFocus={(e) => {
                      if (e.target.value === "0,00") {
                        e.target.value = "";
                        setFormData((prev) => ({ ...prev, monthly_value: "" }));
                      }
                    }}
                    className="bg-white/[0.03] border-white/[0.05] focus:border-primary/50 text-white placeholder:text-white/10 h-11 rounded-xl transition-all"
                    placeholder="0,00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_day" className="text-white/70 text-xs font-bold uppercase tracking-widest">Dia de Pagamento</Label>
                  <Input
                    id="payment_day"
                    type="text"
                    value={formData.payment_day}
                    onChange={handlePaymentDayChange}
                    onFocus={e => {
                      if (e.target.value) {
                        e.target.value = '';
                        setFormData(prev => ({ ...prev, payment_day: '' }));
                      }
                    }}
                    className="bg-white/[0.03] border-white/[0.05] focus:border-primary/50 text-white placeholder:text-white/10 h-11 rounded-xl transition-all"
                    placeholder="1-31"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white/70 text-xs font-bold uppercase tracking-widest">Status</Label>
                  <Select 
                    value={formData.tags[0]} 
                    onValueChange={(value) => handleChange("tags", [value])}
                  >
                    <SelectTrigger className="bg-white/[0.03] border-white/[0.05] h-11 rounded-xl text-white/70">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ativo" className="cursor-pointer">Ativo</SelectItem>
                      <SelectItem value="A vencer" className="cursor-pointer">A vencer</SelectItem>
                      <SelectItem value="Vencido" className="cursor-pointer">Vencido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Datas e Localização */}
            <div className="space-y-6">
              <h3 className="text-sm font-black text-white/30 uppercase tracking-[0.2em] border-b border-white/[0.05] pb-2">
                Datas e Localização
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-white/70 text-xs font-bold uppercase tracking-widest">Data de Início</Label>
                  <DatePicker
                    date={formData.start_date ? parseISO(formData.start_date) : undefined}
                    setDate={(newDate) => {
                      handleChange("start_date", newDate ? format(newDate, "yyyy-MM-dd") : "");
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white/70 text-xs font-bold uppercase tracking-widest">Fim do Contrato</Label>
                  <DatePicker
                    date={formData.contract_end ? parseISO(formData.contract_end) : undefined}
                    setDate={(newDate) => {
                      handleChange("contract_end", newDate ? format(newDate, "yyyy-MM-dd") : "");
                    }}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address" className="text-white/70 text-xs font-bold uppercase tracking-widest">Endereço</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                    className="bg-white/[0.03] border-white/[0.05] focus:border-primary/50 text-white placeholder:text-white/10 rounded-xl transition-all resize-none min-h-[100px]"
                    placeholder="Endereço completo do cliente"
                  />
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-4 pt-6 mt-6 border-t border-white/[0.05]">
              <motion.div 
                className="flex-1" 
                whileHover={{ scale: 1.05, translateY: -2 }} 
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Button
                  type="button"
                  onClick={onClose}
                  className="liquid-glass hover:bg-white/10 text-white/70 border-white/5 w-full h-12 rounded-2xl font-bold transition-all text-sm uppercase tracking-widest"
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
                  className="bg-primary hover:bg-primary/90 text-white w-full h-12 rounded-2xl shadow-[0_0_20px_rgba(104,41,192,0.3)] font-bold transition-all text-sm uppercase tracking-widest"
                >
                  Salvar Cliente
                </Button>
              </motion.div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

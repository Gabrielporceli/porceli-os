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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { Plus, X, ChevronDown } from "lucide-react";
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
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/[0.05]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-goat-purple rounded-lg flex items-center justify-center">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Novo Cliente</h2>
                <p className="text-white/40 text-sm">Preencha os dados do novo cliente</p>
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
              scrollbar-color: #6829c0 #404040;
            }
            
            /* Estilos customizados para dropdowns */
            .dropdown-trigger {
              background-color: rgba(255, 255, 255, 0.03) !important;
              border-color: rgba(255, 255, 255, 0.05) !important;
              color: white !important;
              height: 44px !important;
              border-radius: 12px !important;
            }
            
            .dropdown-trigger:hover {
              background-color: rgba(255, 255, 255, 0.05) !important;
              color: white !important;
            }
            
            .dropdown-content {
              background-color: rgba(20, 20, 20, 0.8) !important;
              backdrop-filter: blur(16px) !important;
              -webkit-backdrop-filter: blur(16px) !important;
              border-color: rgba(255, 255, 255, 0.05) !important;
              min-width: var(--radix-dropdown-menu-trigger-width) !important;
              width: var(--radix-dropdown-menu-trigger-width) !important;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
              position: relative !important;
              left: 0 !important;
              right: auto !important;
              /* margin: 4px 0 0 0 !important; */
              transform: none !important;
              z-index: 9999999 !important;
            }
            
            /* Força posicionamento absoluto correto */
            [data-radix-dropdown-menu-content] {
              position: absolute !important;
              top: calc(100% + 4px) !important;
              left: 0 !important;
              right: auto !important;
              transform: none !important;
              margin: 0 !important;
            }
            
            /* Seletor mais específico para sobrescrever estilos inline */
            div[data-radix-dropdown-menu-content][data-state="open"] {
              left: 0 !important;
              transform: translateX(0px) translateY(0px) !important;
            }
            
            .dropdown-item {
              color: white !important;
              background-color: transparent !important;
              border-radius: 8px !important;
              margin: 2px !important;
            }
            
            .dropdown-item:hover {
              background-color: rgba(255, 255, 255, 0.1) !important;
            }
            
            /* Remove o overlay preto do Radix UI */
            [data-radix-popper-content-wrapper] {
              background: transparent !important;
            }
            
            /* Remove overlay adicional se existir */
            .radix-dropdown-overlay {
              display: none !important;
            }
          `}</style>

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
                    className="bg-white/[0.03] border-white/[0.05] text-white focus:border-goat-purple focus:ring-goat-purple/20 placeholder:text-white/70"
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
                    className="bg-white/[0.03] border-white/[0.05] text-white focus:border-goat-purple focus:ring-goat-purple/20 placeholder:text-white/70"
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
                    className="bg-white/[0.03] border-white/[0.05] text-white focus:border-goat-purple focus:ring-goat-purple/20 placeholder:text-white/70"
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
                    className="bg-white/[0.03] border-white/[0.05] text-white focus:border-goat-purple focus:ring-goat-purple/20 placeholder:text-white/70"
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
                    className="bg-white/[0.03] border-white/[0.05] text-white focus:border-goat-purple focus:ring-goat-purple/20 placeholder:text-white/70"
                    placeholder="cliente@empresa.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="grupo_id" className="text-white">Grupo ID</Label>
                  <Input
                    id="grupo_id"
                    type="text"
                    value={formData.grupo_id}
                    onChange={(e) => handleChange("grupo_id", e.target.value)}
                    className="bg-white/[0.03] border-white/[0.05] text-white focus:border-goat-purple focus:ring-goat-purple/20 placeholder:text-white/70"
                    placeholder="ID do grupo"
                  />
                </div>
              </div>
            </div>

            {/* Plano e Valores */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white border-b border-white/[0.05] pb-2">
                Plano e Valores
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="flex justify-between text-white">
                    Plano
                    <Button
                      type="button"
                      size="sm"
                      className="bg-goat-purple/20 hover:bg-goat-purple/30 text-white border-goat-purple/50 h-6 px-2 text-xs"
                      onClick={() => setShowAddPlan(!showAddPlan)}
                    >
                      <Plus className="w-3 h-3 mr-1" /> <span className="text-white">Novo</span>
                    </Button>
                  </Label>

                  {showAddPlan && (
                    <div className="space-y-4 p-4 rounded-xl border border-white/[0.05] bg-white/[0.02]">
                      <div className="space-y-2">
                        <Input
                          value={newPlanName}
                          onChange={(e) => setNewPlanName(e.target.value)}
                          placeholder="Nome do novo plano"
                          className="bg-white/[0.03] border-white/[0.05] focus:border-primary/50 text-white placeholder:text-white/20 h-11 rounded-xl transition-all text-sm"
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
                          className="bg-goat-purple hover:bg-goat-purple/80 text-white flex-1"
                        >
                          Adicionar Plano
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setShowAddPlan(false)}
                          className="bg-white/[0.05] hover:bg-white/10 text-white/70 border border-white/5 transition-all w-full md:w-auto"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="dropdown-trigger w-full justify-between !mb-0"
                      >
                        {formData.plan}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="dropdown-content mt-0 !mt-0 !mb-0 !p-0">
                      {planOptions.map((plan) => (
                        <DropdownMenuItem
                          key={plan}
                          onClick={() => handleChange("plan", plan)}
                          className="dropdown-item cursor-pointer"
                        >
                          <div className="flex items-center justify-between w-full">
                            <span>{plan}</span>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthly_value" className="text-white">Valor Mensal (R$)</Label>
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
                    className="bg-white/[0.03] border-white/[0.05] focus:border-primary/50 text-white placeholder:text-white/20 h-11 rounded-xl transition-all"
                    placeholder="0,00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_day" className="text-white">Dia de Pagamento</Label>
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
                    className="bg-white/[0.03] border-white/[0.05] focus:border-primary/50 text-white placeholder:text-white/20 h-11 rounded-xl transition-all"
                    placeholder="1-31"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Status</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="dropdown-trigger w-full justify-between"
                      >
                        {formData.tags[0]}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="dropdown-content mt-0 !mt-0 !mb-0 !p-0">
                      <DropdownMenuItem
                        onClick={() => handleChange("tags", ["Ativo"])}
                        className="dropdown-item cursor-pointer"
                      >
                        Ativo
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleChange("tags", ["A vencer"])}
                        className="dropdown-item cursor-pointer"
                      >
                        A vencer
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleChange("tags", ["Vencido"])}
                        className="dropdown-item cursor-pointer"
                      >
                        Vencido
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Datas e Localização */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white border-b border-white/[0.05] pb-2">
                Datas e Localização
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-white">Data de Início</Label>
                  <DatePicker
                    date={formData.start_date ? parseISO(formData.start_date) : undefined}
                    setDate={(newDate) => {
                      handleChange("start_date", newDate ? format(newDate, "yyyy-MM-dd") : "");
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Fim do Contrato</Label>
                  <DatePicker
                    date={formData.contract_end ? parseISO(formData.contract_end) : undefined}
                    setDate={(newDate) => {
                      handleChange("contract_end", newDate ? format(newDate, "yyyy-MM-dd") : "");
                    }}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
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
                  Salvar Cliente
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

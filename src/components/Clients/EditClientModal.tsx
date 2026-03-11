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
import { useState, useEffect } from "react";
import { X, ChevronDown, Edit } from "lucide-react";
import { motion } from "framer-motion";
import { usePlansContext } from "@/contexts/PlansContext";
import ReactDOM from "react-dom";
import { DatePicker } from "@/components/ui/date-picker";
import { parseISO, format } from "date-fns";
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
  const { getPlanNames } = usePlansContext();
  const planOptions = getPlanNames();

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
    plan: planOptions[0] || "Vendas",
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

    // Convert monthlyValue from string to number for the callback
    const monthlyValueNumber = parseFloat(formData.monthlyValue?.replace(',', '.') || '0');

    // Convert empty strings to null for date fields and ensure proper date format
    const formatDateForDatabase = (dateString: string) => {
      if (!dateString || dateString.trim() === '') return null;
      // Ensure the date is in YYYY-MM-DD format
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return null;
      return date.toISOString().split('T')[0];
    };

    const contractEnd = formatDateForDatabase(formData.contractEnd || '');
    const startDate = formatDateForDatabase(formData.startDate || '');

    const clientData: ClientData = {
      company: formData.company,
      cnpj: formData.cnpj,
      responsible: formData.responsible,
      phone: formData.phone,
      email: formData.email,
      grupoId: formData.grupoId,
      contractEnd: contractEnd || '',
      paymentDay: formData.paymentDay,
      tags: formData.tags,
      address: formData.address,
      plan: formData.plan,
      startDate: startDate || '',
      monthlyValue: monthlyValueNumber,
    };

    console.log('DEBUG - Dados do cliente sendo enviados para edição:', clientData);
    console.log('DEBUG - Tipos dos dados:', {
      contractEnd: typeof clientData.contractEnd,
      startDate: typeof clientData.startDate,
      monthlyValue: typeof clientData.monthlyValue,
      paymentDay: typeof clientData.paymentDay
    });
    console.log('DEBUG - Valores dos dados:', {
      contractEnd: clientData.contractEnd,
      startDate: clientData.startDate,
      monthlyValue: clientData.monthlyValue,
      paymentDay: clientData.paymentDay
    });

    onSave(clientData);
  };

  const handleChange = (field: keyof Client, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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

    handleChange("paymentDay", value === '' ? 1 : parseInt(value));
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
    handleChange("monthlyValue", value);
  };

  const handleMonthlyValueBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (value === '' || value === '0' || value === '0,') {
      handleChange("monthlyValue", '0,00');
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
    handleChange("monthlyValue", value);
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
          
          /* Estilos customizados para dropdowns */
          .dropdown-trigger {
            background-color: rgba(255, 255, 255, 0.03) !important;
            border-color: rgba(255, 255, 255, 0.05) !important;
            color: white !important;
            border-radius: 0.75rem !important; /* xl */
            height: 2.75rem !important; /* 11 */
          }
          
          .dropdown-trigger:hover {
            background-color: rgba(255, 255, 255, 0.05) !important;
            color: white !important;
          }
          
          .dropdown-content {
            background-color: rgba(20, 20, 20, 0.9) !important;
            backdrop-filter: blur(16px) !important;
            border-color: rgba(255, 255, 255, 0.05) !important;
            min-width: var(--radix-dropdown-menu-trigger-width) !important;
            width: var(--radix-dropdown-menu-trigger-width) !important;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
            z-index: 9999999 !important;
            border-radius: 0.75rem !important;
          }
          
          .dropdown-item {
            color: white !important;
            background-color: transparent !important;
            border-radius: 0.5rem !important;
            margin: 0.25rem !important;
          }
          
          .dropdown-item:hover {
            background-color: rgba(255, 255, 255, 0.1) !important;
          }
        `}</style>

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.05]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-goat-purple rounded-lg flex items-center justify-center">
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

            {/* Plano e Valores */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white border-b border-white/[0.05] pb-2">
                Plano e Valores
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="plan" className="text-white">Plano</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="dropdown-trigger w-full justify-between"
                      >
                        {formData.plan || "Selecione um plano"}
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
                          {plan}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthlyValue" className="text-white">Valor Mensal (R$)</Label>
                  <Input
                    id="monthlyValue"
                    type="text"
                    value={formData.monthlyValue}
                    onChange={handleMonthlyValueChange}
                    onBlur={handleMonthlyValueBlur}
                    onFocus={(e) => {
                      if (e.target.value === "0,00") {
                        e.target.value = "";
                        setFormData((prev) => ({ ...prev, monthlyValue: "" }));
                      }
                    }}
                    className="bg-white/[0.03] border-white/[0.05] focus:border-primary/50 text-white placeholder:text-white/20 h-11 rounded-xl transition-all"
                    placeholder="0,00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentDay" className="text-white">Dia de Pagamento</Label>
                  <Input
                    id="paymentDay"
                    type="text"
                    value={formData.paymentDay.toString()}
                    onChange={handlePaymentDayChange}
                    onFocus={e => {
                      if (e.target.value) {
                        e.target.value = '';
                        setFormData(prev => ({ ...prev, paymentDay: 0 }));
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
                    date={formData.startDate ? parseISO(formData.startDate) : undefined}
                    setDate={(newDate) => {
                      handleChange("startDate", newDate ? format(newDate, "yyyy-MM-dd") : "");
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Fim do Contrato</Label>
                  <DatePicker
                    date={formData.contractEnd ? parseISO(formData.contractEnd) : undefined}
                    setDate={(newDate) => {
                      handleChange("contractEnd", newDate ? format(newDate, "yyyy-MM-dd") : "");
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
            <div className="flex gap-4 pt-6 border-t border-white/[0.05]">
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
            </div>
          </form>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

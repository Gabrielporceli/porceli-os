import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { useScrollLock } from "@/hooks/useScrollLock";
import ReactDOM from "react-dom";
import { X, FileText, DollarSign } from "lucide-react";
import { useClients } from "@/hooks/useClients";

interface NewContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contractData: {
    client_id: string;
    type: string;
    monthly_value: number;
    start_date: string;
    end_date: string;
    payment_day: number;
    status: string;
    contract_url?: string;
  }) => void;
  isPending?: boolean;
}

export function NewContractModal({ isOpen, onClose, onSave, isPending }: NewContractModalProps) {
  useScrollLock(isOpen);
  const { data: clients = [] } = useClients();
  
  const [formData, setFormData] = useState({
    client_id: '',
    type: '',
    monthly_value: '0,00',
    start_date: format(new Date(), "yyyy-MM-dd"),
    end_date: '',
    payment_day: '1',
    status: 'active',
    contract_url: ''
  });

  const [selectedClientName, setSelectedClientName] = useState('Selecionar Cliente');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert monthly_value from Brazilian format to number
    const monthlyValueNumber = parseFloat(formData.monthly_value.replace('.', '').replace(',', '.')) || 0;

    onSave({
      client_id: formData.client_id,
      type: formData.type,
      monthly_value: monthlyValueNumber,
      start_date: formData.start_date,
      end_date: formData.end_date,
      payment_day: parseInt(formData.payment_day) || 1,
      status: formData.status,
      contract_url: formData.contract_url
    });
  };

  const handleChange = (field: string, value: any) => {
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
    handleChange('monthly_value', value);
  };

  const handleMonthlyValueBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (value === '' || value === '0' || value === '0,') {
      handleChange('monthly_value', '0,00');
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
    handleChange('monthly_value', value);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-white/[0.05] shadow-2xl text-white w-full max-w-3xl !p-0 !gap-0 max-h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.05] shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-white tracking-tight">Novo Contrato</DialogTitle>
                <p className="text-white/40 text-sm">Crie um contrato para um cliente existente</p>
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
            <div className="space-y-6">
              <h3 className="text-sm font-black text-white/30 uppercase tracking-[0.2em] border-b border-white/[0.05] pb-2">
                Dados do Contrato
              </h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white/70 text-xs font-bold uppercase tracking-widest ml-1">Cliente *</Label>
                  <Select 
                    value={formData.client_id} 
                    onValueChange={(value) => {
                      handleChange('client_id', value);
                      const client = clients.find(c => c.id === value);
                      if (client) setSelectedClientName(client.company);
                    }}
                  >
                    <SelectTrigger className="bg-white/[0.03] border-white/[0.05] h-11 rounded-xl text-white/70 font-medium">
                      <SelectValue placeholder="Selecionar Cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.length === 0 ? (
                        <div className="p-2 text-white/40 text-sm text-center">Nenhum cliente encontrado</div>
                      ) : (
                        clients.map((client) => (
                          <SelectItem
                            key={client.id}
                            value={client.id}
                            className="cursor-pointer"
                          >
                            {client.company}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type" className="text-white/70 text-xs font-bold uppercase tracking-widest ml-1">Tipo de Serviço *</Label>
                  <Input
                    id="type"
                    placeholder="Ex: Gestão de Tráfego"
                    value={formData.type}
                    onChange={(e) => handleChange('type', e.target.value)}
                    className="bg-white/[0.03] border-white/[0.05] text-white focus:border-primary/50 placeholder:text-white/10 h-11 rounded-xl transition-all"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="monthly_value" className="text-white/70 text-xs font-bold uppercase tracking-widest ml-1">Valor Mensal (R$) *</Label>
                    <div className="relative group">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                      <Input
                        id="monthly_value"
                        type="text"
                        value={formData.monthly_value}
                        onChange={handleMonthlyValueChange}
                        onBlur={handleMonthlyValueBlur}
                        onFocus={(e) => {
                          if (e.target.value === "0,00") {
                            handleChange('monthly_value', "");
                          }
                        }}
                        className="bg-white/[0.03] border-white/[0.05] text-white focus:border-primary/50 placeholder:text-white/10 h-11 rounded-xl pl-10 transition-all font-bold"
                        placeholder="0,00"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payment_day" className="text-white/70 text-xs font-bold uppercase tracking-widest ml-1">Dia de Pagamento (1-28) *</Label>
                    <Input
                      id="payment_day"
                      type="number"
                      min="1"
                      max="28"
                      value={formData.payment_day}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (val > 28) {
                          handleChange('payment_day', "28");
                        } else if (val < 1 && e.target.value !== "") {
                          handleChange('payment_day', "1");
                        } else {
                          handleChange('payment_day', e.target.value);
                        }
                      }}
                      className="bg-white/[0.03] border-white/[0.05] text-white focus:border-primary/50 placeholder:text-white/10 h-11 rounded-xl transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="Ex: 10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contract_url" className="text-white/70 text-xs font-bold uppercase tracking-widest ml-1">Link do Contrato</Label>
                  <Input
                    id="contract_url"
                    type="url"
                    placeholder="https://..."
                    value={formData.contract_url}
                    onChange={(e) => handleChange('contract_url', e.target.value)}
                    className="bg-white/[0.03] border-white/[0.05] text-white focus:border-primary/50 placeholder:text-white/10 h-11 rounded-xl transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-white/70 text-xs font-bold uppercase tracking-widest ml-1">Data de Início *</Label>
                    <DatePicker
                      date={formData.start_date ? parseISO(formData.start_date) : undefined}
                      setDate={(newDate) => {
                        if (newDate) {
                           handleChange('start_date', format(newDate, "yyyy-MM-dd"));
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white/70 text-xs font-bold uppercase tracking-widest ml-1">Data de Término *</Label>
                    <DatePicker
                    date={formData.end_date ? parseISO(formData.end_date) : undefined}
                    setDate={(newDate) => {
                      if (newDate) {
                        handleChange('end_date', format(newDate, "yyyy-MM-dd"));
                      }
                    }}
                  />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="text-white/70 text-xs font-bold uppercase tracking-widest ml-1">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                    <SelectTrigger className="bg-white/[0.03] border-white/[0.05] h-11 rounded-xl text-white/70 font-medium">
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
                  disabled={isPending || !formData.client_id}
                  className="bg-primary hover:bg-primary/90 text-white w-full h-12 rounded-2xl shadow-[0_0_20px_rgba(104,41,192,0.3)] font-bold transition-all text-sm uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? 'Criando...' : 'Criar Contrato'}
                </Button>
              </motion.div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper to parse dates since parseISO import was missing in some contexts
function parseISO(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

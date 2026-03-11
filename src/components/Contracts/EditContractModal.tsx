
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateClient } from '@/hooks/useClients';
import { DatePicker } from "@/components/ui/date-picker";
import { parseISO, format } from "date-fns";

interface Contract {
  id: string;
  client: string;
  client_id: string;
  type: string;
  monthlyValue: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'inactive' | 'expiring';
}

interface EditContractModalProps {
  isOpen: boolean;
  contract: Contract | null;
  onClose: () => void;
  onSave: (contractData: Omit<Contract, 'id'>) => void;
}

export function EditContractModal({ isOpen, contract, onClose, onSave }: EditContractModalProps) {
  const [formData, setFormData] = useState({
    client: '',
    client_id: '',
    type: '',
    monthlyValue: 0,
    startDate: '',
    endDate: '',
    status: 'active' as Contract['status']
  });
  const updateClient = useUpdateClient();

  useEffect(() => {
    if (contract) {
      setFormData({
        client: contract.client,
        client_id: contract.client_id,
        type: contract.type,
        monthlyValue: contract.monthlyValue,
        startDate: contract.startDate,
        endDate: contract.endDate,
        status: contract.status
      });
    }
  }, [contract]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.status === 'inactive' && formData.client_id) {
      // Update client tags to reflect inactive status
      await updateClient.mutateAsync({
        id: formData.client_id,
        tags: ['Inativo']
      });
    }
    onSave(formData);
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="border-white/5 text-white max-w-md backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <DialogHeader>
          <DialogTitle className="text-white text-2xl tracking-tight">Editar Contrato</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="client" className="text-white/40 text-[10px] font-black uppercase tracking-widest ml-1">Cliente</Label>
            <Input
              id="client"
              value={formData.client}
              onChange={(e) => handleInputChange('client', e.target.value)}
              className="bg-white/5 border-white/10 text-white rounded-xl h-11 focus:border-white/20 transition-all"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type" className="text-white/40 text-[10px] font-black uppercase tracking-widest ml-1">Tipo de Serviço</Label>
            <Input
              id="type"
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
              className="bg-white/5 border-white/10 text-white rounded-xl h-11 focus:border-white/20 transition-all"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthlyValue" className="text-white/40 text-[10px] font-black uppercase tracking-widest ml-1">Valor Mensal (R$)</Label>
            <Input
              id="monthlyValue"
              type="number"
              value={formData.monthlyValue}
              onChange={(e) => handleInputChange('monthlyValue', parseFloat(e.target.value))}
              className="bg-white/5 border-white/10 text-white rounded-xl h-11 focus:border-white/20 transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white/40 text-[10px] font-black uppercase tracking-widest ml-1">Início</Label>
              <DatePicker
                date={formData.startDate ? parseISO(formData.startDate) : undefined}
                setDate={(newDate) => {
                  if (newDate) {
                    handleInputChange('startDate', format(newDate, "yyyy-MM-dd"));
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/40 text-[10px] font-black uppercase tracking-widest ml-1">Término</Label>
              <DatePicker
                date={formData.endDate ? parseISO(formData.endDate) : undefined}
                setDate={(newDate) => {
                  if (newDate) {
                    handleInputChange('endDate', format(newDate, "yyyy-MM-dd"));
                  }
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status" className="text-white/40 text-[10px] font-black uppercase tracking-widest ml-1">Status</Label>
            <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="liquid-glass border-white/10">
                <SelectItem value="active" className="text-white focus:bg-white/10 rounded-lg">Ativo</SelectItem>
                <SelectItem value="expiring" className="text-white focus:bg-white/10 rounded-lg">A vencer</SelectItem>
                <SelectItem value="inactive" className="text-white focus:bg-white/10 rounded-lg">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-white/[0.05]">
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
      </DialogContent>
    </Dialog>
  );
}

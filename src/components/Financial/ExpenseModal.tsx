import { useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { parseISO, format } from "date-fns";

interface ExpenseModalProps {
  onAddExpense: (expense: any) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ExpenseModal({ onAddExpense, open: externalOpen, onOpenChange: externalOnOpenChange }: ExpenseModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;
  const [formData, setFormData] = useState({
    description: '',
    value: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    isRecurring: false,
    recurrence: ''
  });

  const formatCurrencyLocal = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (!numbers) return "";
    const amount = parseInt(numbers) / 100;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amount);
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrencyLocal(e.target.value);
    setFormData({ ...formData, value: formatted });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    console.log('DEBUG - Dados do formulário:', formData);

    if (!formData.description || !formData.value || !formData.category || !formData.date) {
      console.error('Campos obrigatórios não preenchidos:', {
        description: formData.description,
        value: formData.value,
        category: formData.category,
        date: formData.date
      });
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    // Convert value from formatted string to number
    const numericValue = parseFloat(formData.value.replace(/[^\d,.-]/g, '').replace(',', '.'));

    console.log('DEBUG - Valor convertido:', numericValue);

    if (isNaN(numericValue) || numericValue <= 0) {
      console.error('Valor inválido:', numericValue);
      alert('Valor deve ser um número válido maior que zero');
      return;
    }

    const expense = {
      description: formData.description,
      amount: numericValue,
      category: formData.category,
      date: formData.date,
      status: 'pending',
      type: 'expense',
      is_recurring: formData.isRecurring,
      recurrence_type: formData.isRecurring ? formData.recurrence : undefined
    };

    console.log('DEBUG - Despesa a ser criada:', expense);
    onAddExpense(expense);
    setOpen(false);

    // Reset form
    setFormData({
      description: '',
      value: '',
      category: '',
      date: new Date().toISOString().split('T')[0],
      isRecurring: false,
      recurrence: 'monthly'
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {externalOpen === undefined && (
        <DialogTrigger asChild>
          <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Nova Despesa
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="border-white/5 text-white max-w-md shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300 outline-none">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white tracking-tight">Nova Despesa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          <div className="space-y-2">
            <Label htmlFor="description" className="text-white/70 text-sm font-medium ml-1">Descrição *</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-white/[0.03] border-white/[0.05] text-white placeholder:text-white/20 h-12 rounded-xl focus:border-primary/50 focus:ring-0 focus:ring-offset-0 transition-all shadow-inner"
              placeholder="Ex: Aluguel escritório"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="value" className="text-white/70 text-sm font-medium ml-1">Valor (R$) *</Label>
            <Input
              id="value"
              type="text"
              value={formData.value}
              onChange={handleValueChange}
              className="bg-white/[0.03] border-white/[0.05] text-white placeholder:text-white/20 h-12 rounded-xl focus:border-primary/50 transition-all shadow-inner"
              placeholder="R$ 0,00"
              inputMode="decimal"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category" className="text-white/70 text-sm font-medium ml-1">Categoria *</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger className="bg-white/[0.03] border-white/[0.05] h-12 rounded-xl focus:border-primary/50 transition-all shadow-inner">
                <SelectValue placeholder={<span className="text-white/30">Selecione uma categoria</span>}>
                  {formData.category && <span className="text-white/80">{formData.category}</span>}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a]/95 backdrop-blur-xl border-white/10 text-white rounded-xl">
                <SelectItem value="Infraestrutura">Infraestrutura</SelectItem>
                <SelectItem value="Tecnologia">Tecnologia</SelectItem>
                <SelectItem value="Marketing">Marketing</SelectItem>
                <SelectItem value="Recursos Humanos">Recursos Humanos</SelectItem>
                <SelectItem value="Escritório">Escritório</SelectItem>
                <SelectItem value="Outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-white/70 text-sm font-medium ml-1">Data *</Label>
            <DatePicker
              date={formData.date ? parseISO(formData.date) : undefined}
              setDate={(newDate) => {
                if (newDate) {
                  setFormData({ ...formData, date: format(newDate, "yyyy-MM-dd") });
                }
              }}
            />
          </div>

          <div className="flex items-center space-x-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
            <Checkbox
              id="isRecurring"
              checked={formData.isRecurring}
              onCheckedChange={(checked) => setFormData({ ...formData, isRecurring: checked as boolean })}
              className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <Label htmlFor="isRecurring" className="text-sm font-medium text-white/70 cursor-pointer">Despesa recorrente</Label>
          </div>

          {formData.isRecurring && (
            <div className="space-y-2 animate-fade-in">
              <Label htmlFor="recurrence" className="text-white/70 text-sm font-medium ml-1">Recorrência</Label>
              <Select value={formData.recurrence} onValueChange={(value) => setFormData({ ...formData, recurrence: value })}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.05] h-12 rounded-xl focus:border-primary/50 transition-all shadow-inner">
                  <SelectValue placeholder={<span className="text-white/30">Selecione a recorrência</span>}>
                    {formData.recurrence && (
                      <span className="text-white/80">
                        {formData.recurrence === 'weekly' && 'Semanal'}
                        {formData.recurrence === 'monthly' && 'Mensal'}
                        {formData.recurrence === 'quarterly' && 'Trimestral'}
                        {formData.recurrence === 'yearly' && 'Anual'}
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a]/95 backdrop-blur-xl border-white/10 text-white rounded-xl">
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-4 sm:flex-row !justify-stretch border-t border-white/[0.05]">
            <motion.div 
              className="flex-1" 
              whileHover={{ scale: 1.05, translateY: -2 }} 
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Button
                type="button"
                onClick={() => setOpen(false)}
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
                Adicionar
              </Button>
            </motion.div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

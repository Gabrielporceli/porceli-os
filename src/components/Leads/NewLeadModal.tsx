
import { useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Calendar } from "lucide-react";
import { Tag } from "@/hooks/useTags";
import { DatePicker } from "@/components/ui/date-picker";
import { format, parseISO } from "date-fns";

interface Stage {
  id: string;
  name: string;
  color: string;
}

interface NewLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tags: Tag[];
  stages: Stage[];
  onAddLead: (lead: {
    name: string;
    company: string;
    phone: string;
    email?: string;
    stage: string;
    tags?: string[];
    value?: number;
    meeting_date?: string;
  }) => void;
}

export function NewLeadModal({
  open,
  onOpenChange,
  tags,
  stages,
  onAddLead,
}: NewLeadModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    phone: "",
    email: "",
    stage: "",
    tags: [] as string[],
    value: "",
    meeting_date: "",
  });

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.company.trim() || !formData.phone.trim() || !formData.stage) {
      return;
    }

    // Converter valor monetário
    const value = formData.value
      ? parseFloat(formData.value.replace(/[^\d,.-]/g, '').replace(',', '.')) || undefined
      : undefined;

    onAddLead({
      name: formData.name,
      company: formData.company,
      phone: formData.phone,
      email: formData.email || undefined,
      stage: formData.stage,
      tags: formData.tags.length > 0 ? formData.tags : undefined,
      value: value,
      meeting_date: formData.meeting_date || undefined,
    });

    // Reset form
    setFormData({
      name: "",
      company: "",
      phone: "",
      email: "",
      stage: "",
      tags: [],
      value: "",
      meeting_date: "",
    });
    onOpenChange(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (!numbers) return "";
    const amount = parseInt(numbers) / 100;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amount);
  };

  const handleValueChange = (value: string) => {
    const formatted = formatCurrency(value);
    handleInputChange("value", formatted);
  };

  const getStageSelected = () => {
    const selected = stages.find(s => s.id === formData.stage);
    if (!selected) return <span className="text-white">Selecione uma etapa</span>;
    return (
      <span className="flex items-center gap-2">
        <span className={`w-3 h-3 rounded-full ${selected.color}`} />
        {selected.name}
      </span>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/[0.05] shadow-2xl text-white w-full max-w-[500px] !p-0 !gap-0">
        <div className="p-6 border-b border-white/[0.05]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold tracking-tight">Novo Lead</DialogTitle>
            <DialogDescription className="text-white/40">
              Adicione um novo lead ao funil
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="overflow-y-auto max-h-[calc(85vh-100px)] custom-scrollbar p-6 pt-4">
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
              background: #7C3AED;
            }
            .custom-scrollbar {
              scrollbar-width: thin;
              scrollbar-color: #6829c0 transparent;
            }
          `}</style>
          
          <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white/70 text-sm font-medium">Nome *</Label>
            <Input
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Nome do lead"
              className="bg-white/[0.03] border-white/[0.05] focus:border-primary/50 text-white placeholder:text-white/20 h-11 rounded-xl transition-all"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white/70 text-sm font-medium">Empresa *</Label>
            <Input
              value={formData.company}
              onChange={(e) => handleInputChange("company", e.target.value)}
              placeholder="Nome da empresa"
              className="bg-white/[0.03] border-white/[0.05] focus:border-primary/50 text-white placeholder:text-white/20 h-11 rounded-xl transition-all"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white/70 text-sm font-medium">Telefone *</Label>
            <Input
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              placeholder="(11) 99999-9999"
              className="bg-white/[0.03] border-white/[0.05] focus:border-primary/50 text-white placeholder:text-white/20 h-11 rounded-xl transition-all"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white/70 text-sm font-medium">Etapa *</Label>
            <Select value={formData.stage} onValueChange={(value) => handleInputChange("stage", value)}>
              <SelectTrigger className="bg-white/[0.03] border-white/[0.05] h-11 rounded-xl text-white/70">
                <SelectValue>{getStageSelected()}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    <span className="flex items-center gap-3 font-medium">
                      <span className={`w-3 h-3 rounded-full ${stage.color}`} />
                      {stage.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-white/70 text-sm font-medium">Email (Opcional)</Label>
            <Input
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="email@exemplo.com"
              className="bg-white/[0.03] border-white/[0.05] focus:border-primary/50 text-white placeholder:text-white/20 h-11 rounded-xl transition-all"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white/70 text-sm font-medium">Valor (Opcional)</Label>
            <Input
              value={formData.value}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder="R$ 0,00"
              className="bg-white/[0.03] border-white/[0.05] focus:border-primary/50 text-white placeholder:text-white/20 h-11 rounded-xl transition-all"
              inputMode="decimal"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white/70 text-sm font-medium">Tag (Opcional)</Label>
            <Select
              value={formData.tags[0] || ""}
              onValueChange={value => setFormData(prev => ({ ...prev, tags: value ? [value] : [] }))}
            >
              <SelectTrigger className="bg-white/[0.03] border-white/[0.05] h-11 rounded-xl text-white/70">
                <SelectValue>
                  {(() => {
                    const selected = tags.find(t => t.name === formData.tags[0]);
                    if (!selected) return <span className="text-white/30">Selecione uma tag</span>;
                    return (
                      <span className="flex items-center gap-2 font-medium">
                        <span className={`w-2.5 h-2.5 rounded-full ${selected.color}`} />
                        {selected.name}
                      </span>
                    );
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {tags.map(tag => (
                  <SelectItem key={tag.id} value={tag.name}>
                    <span className="flex items-center gap-3 font-medium">
                      <span className={`w-3 h-3 rounded-full ${tag.color}`} />
                      {tag.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-white/70 text-sm font-medium">Data da Reunião (Opcional)</Label>
            <DatePicker
              date={formData.meeting_date ? parseISO(formData.meeting_date) : undefined}
              setDate={(newDate) => {
                setFormData(prev => ({ ...prev, meeting_date: newDate ? format(newDate, "yyyy-MM-dd") : "" }));
              }}
            />
          </div>

          </div>

          <div className="flex gap-3 pt-6 mt-6 border-t border-white/[0.05]">
            <motion.div 
              className="flex-1" 
              whileHover={{ scale: 1.05, translateY: -2 }} 
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Button
                onClick={() => onOpenChange(false)}
                className="liquid-glass hover:bg-white/10 text-white/70 border-white/5 w-full h-12 rounded-2xl font-bold transition-all"
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
              <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90 text-white w-full h-12 rounded-2xl shadow-[0_0_20px_rgba(104,41,192,0.3)] font-bold transition-all">
                <Plus className="w-5 h-5 mr-2" />
                Criar Lead
              </Button>
            </motion.div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, Trash2, CalendarOff } from "lucide-react";
import { Lead } from "@/hooks/useLeads";
import { Tag } from "@/hooks/useTags";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { parseISO, format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { QRCode } from "@/components/ui/qr-code";

interface Stage {
  id: string;
  name: string;
  color: string;
}

interface EditLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  tags: Tag[];
  stages: Stage[];
  onUpdateLead: (lead: Lead) => void;
  onDeleteLead?: (lead: Lead) => void;
}

export function EditLeadModal({
  open,
  onOpenChange,
  lead,
  tags,
  stages,
  onUpdateLead,
  onDeleteLead,
}: EditLeadModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    phone: "",
    email: "",
    stage: "",
    tags: [] as string[],
    value: "",
    notes: "",
    meeting_date: "",
    meeting_time: "",
    reuniao_realizada: false,
  });

  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name || "",
        company: lead.company || "",
        phone: lead.phone || "",
        email: lead.email || "",
        stage: lead.stage || "",
        tags: lead.tags || [],
        value: lead.value ? `R$ ${lead.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "",
        notes: lead.notes || "",
        meeting_date: lead.meeting_date ? format(parseISO(lead.meeting_date), "yyyy-MM-dd") : "",
        meeting_time: lead.meeting_date ? format(parseISO(lead.meeting_date), "HH:mm") : "",
        reuniao_realizada: lead.reuniao_realizada || false,
      });
    }
  }, [lead]);

  const handleSave = () => {
    // Validação básica - apenas Nome e Etapa são obrigatórios
    if (!lead || !formData.name.trim() || !formData.stage) {
      console.log('Validation failed:', { lead, name: formData.name, stage: formData.stage });
      return;
    }

    // Converter valor monetário
    const value = formData.value
      ? parseFloat(formData.value.replace(/[^\d,.-]/g, '').replace(',', '.')) || null
      : null;

    const updatedLead: Lead = {
      ...lead,
      name: formData.name,
      company: formData.company,
      phone: formData.phone,
      email: formData.email || null,
      stage: formData.stage,
      tags: formData.tags.length > 0 ? formData.tags : null,
      value: value,
      notes: formData.notes || null,
      meeting_date: formData.meeting_date && formData.meeting_time 
        ? new Date(`${formData.meeting_date}T${formData.meeting_time}:00`).toISOString()
        : formData.meeting_date || null,
      reuniao_realizada: formData.reuniao_realizada,
      updated_at: new Date().toISOString(),
    };

    onUpdateLead(updatedLead);
    onOpenChange(false);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCancelMeeting = () => {
    setFormData(prev => ({
      ...prev,
      meeting_date: "",
      meeting_time: "",
      reuniao_realizada: false
    }));
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
        {/* QR CODE CONTAINER - VISIBLE ONLY ON DESKTOP E POSICIONADO À DIREITA */}
        {lead?.id && (
          <div className="absolute top-0 -right-[340px] hidden lg:block w-[320px]">
            <div className="liquid-glass rounded-2xl border border-white/[0.05] p-7 shadow-2xl flex flex-col items-center">
              <div className="mb-5 w-full flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-white/40">Acesso Rápido</p>
                  <h3 className="text-xl font-semibold tracking-tight text-white line-clamp-1">{lead.name}</h3>
                </div>
              </div>
              <QRCode
                value={lead.phone ? `https://wa.me/${lead.phone.replace(/\D/g, "")}` : `https://porceli.com/lead/${lead.id}`}
                size={260}
                fgColor="#f8fafc"
                bgColor="#121212"
                className="rounded-xl border border-white/5"
              />
            </div>
          </div>
        )}

        <div className="p-6 border-b border-white/[0.05]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold tracking-tight">Editar Lead</DialogTitle>
            <DialogDescription className="text-white/40">
              Altere as informações do lead
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
            <Label className="text-white/70 text-sm font-medium">Nome</Label>
            <Input
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Nome do lead"
              className="bg-white/[0.03] border-white/[0.05] focus:border-primary/50 text-white placeholder:text-white/20 h-11 rounded-xl transition-all"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white/70 text-sm font-medium">Empresa</Label>
            <Input
              value={formData.company}
              onChange={(e) => handleInputChange("company", e.target.value)}
              placeholder="Nome da empresa"
              className="bg-white/[0.03] border-white/[0.05] focus:border-primary/50 text-white placeholder:text-white/20 h-11 rounded-xl transition-all"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white/70 text-sm font-medium">Telefone</Label>
            <Input
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              placeholder="(11) 99999-9999"
              className="bg-white/[0.03] border-white/[0.05] focus:border-primary/50 text-white placeholder:text-white/20 h-11 rounded-xl transition-all"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white/70 text-sm font-medium">Etapa</Label>
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
              value={formData.email || ""}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="email@exemplo.com"
              className="bg-white/[0.03] border-white/[0.05] focus:border-primary/50 text-white placeholder:text-white/20 h-11 rounded-xl transition-all"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white/70 text-sm font-medium">Valor (Opcional)</Label>
            <Input
              value={formData.value || ""}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder="R$ 0,00"
              className="bg-white/[0.03] border-white/[0.05] focus:border-primary/50 text-white placeholder:text-white/20 h-11 rounded-xl transition-all"
              inputMode="decimal"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tag" className="text-white/70 text-sm font-medium">Tag (opcional)</Label>
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
            <Label className="text-white/70 text-sm font-medium">Observações (Opcional)</Label>
            <Input
              value={formData.notes || ""}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Observações sobre o lead"
              className="bg-white/[0.03] border-white/[0.05] focus:border-primary/50 text-white placeholder:text-white/20 h-11 rounded-xl transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white/70 text-sm font-medium">Data da Reunião</Label>
              <DatePicker
                date={formData.meeting_date ? parseISO(formData.meeting_date) : undefined}
                setDate={(newDate) => {
                  handleInputChange("meeting_date", newDate ? format(newDate, "yyyy-MM-dd") : "");
                }}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/70 text-sm font-medium">Hora da Reunião</Label>
              <TimePicker
                value={formData.meeting_time}
                onChange={(time) => handleInputChange("meeting_time", time)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/[0.05] rounded-xl">
            <div className="space-y-0.5">
              <Label className="text-white font-medium">Reunião Realizada?</Label>
              <p className="text-white/40 text-xs text-balance">
                Marque se a reunião com este lead já aconteceu.
              </p>
            </div>
            <Switch
              checked={formData.reuniao_realizada}
              onCheckedChange={(checked) => handleInputChange("reuniao_realizada", checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/10 rounded-xl">
            <div className="space-y-0.5">
              <Label className="text-red-400 font-medium">Reunião Cancelada?</Label>
              <p className="text-red-400/40 text-xs text-balance">
                Clique para limpar os dados de agendamento.
              </p>
            </div>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={handleCancelMeeting}
              className="border-red-500/30 text-red-500 hover:bg-red-500/20 hover:text-red-400 transition-all rounded-lg gap-2"
            >
              <CalendarOff className="w-3.5 h-3.5" />
              Limpar
            </Button>
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
                className="btn-danger-glass w-full h-12 rounded-xl font-bold transition-all"
              >
                Cancelar
              </Button>
            </motion.div>
            <motion.div 
              className="flex-[2]" 
              whileHover={{ scale: 1.05, translateY: -2 }} 
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-white w-full h-12 rounded-xl shadow-[0_0_20px_rgba(104,41,192,0.3)] font-bold transition-all">
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
            </motion.div>
            {onDeleteLead && (
              <motion.div 
                whileHover={{ scale: 1.05, translateY: -2 }} 
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (lead) {
                      onDeleteLead(lead);
                    }
                  }}
                  className="btn-danger-glass h-12 w-12 rounded-xl transition-all"
                  title="Excluir Lead"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

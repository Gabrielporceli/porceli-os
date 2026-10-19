"use client";

import { useState, useEffect } from "react";
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateClient } from '@/hooks/useClients';
import { DatePicker } from "@/components/ui/date-picker";
import { parseISO, format } from "date-fns";
import { useScrollLock } from "@/hooks/useScrollLock";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DollarCircle } from 'iconsax-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
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
  /** recorrente entra no MRR/churn do Dashboard; pontual e rescisão não. */
  category?: 'recorrente' | 'pontual' | 'rescisao';
}

interface EditContractModalProps {
  isOpen: boolean;
  contract: Contract | null;
  onClose: () => void;
  onSave: (contractData: Omit<Contract, 'id'> & { asaas_remove_ids?: string[] }) => void;
}

/** Boleto do parcelamento anterior, conferido no servidor (asaas-renegotiation). */
interface BoletoAntigo {
  payment_id: string;
  value: number;
  dueDate: string;
  description: string | null;
  ok: boolean;
  motivo?: string;
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = (iso: string) => iso.split('-').reverse().join('/');

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
    contract_url: '',
    category: 'recorrente' as NonNullable<Contract['category']>,
  });
  const updateClient = useUpdateClient();
  // Revisão dos boletos do parcelamento anterior (só quando valor, datas ou
  // dia de pagamento mudam — aí o sistema cria um parcelamento novo no Asaas).
  // null = ainda não revisado; { boletos, semCodigo } = revisado.
  const [revisao, setRevisao] = useState<{ boletos: BoletoAntigo[]; semCodigo: boolean } | null>(null);
  const [conferindo, setConferindo] = useState(false);
  useEffect(() => { setRevisao(null); }, [formData.monthlyValue, formData.startDate, formData.endDate, formData.payment_day, formData.status]);

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
        contract_url: contract.contract_url || '',
        category: contract.category ?? 'recorrente',
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

    // Mudou o que gera cobrança? Então o Asaas vai ganhar um parcelamento novo:
    // primeiro mostra os boletos futuros do parcelamento anterior pra aprovação.
    const mudouCobranca = !!contract && formData.status !== 'inactive' && (
      Math.abs(monthlyValueNumber - Number(contract.monthlyValue)) > 0.001 ||
      formData.startDate !== contract.startDate ||
      formData.endDate !== contract.endDate ||
      (parseInt(formData.payment_day) || 1) !== (contract.payment_day || 1)
    );
    if (mudouCobranca && revisao === null) {
      setConferindo(true);
      try {
        const { data, error } = await supabase.functions.invoke('asaas-renegotiation', {
          body: { action: 'preview_contract_removal', contract_id: contract!.id },
        });
        if (error || !data?.success) {
          toast.error(`Não consegui conferir os boletos no Asaas: ${data?.error || error?.message || 'erro'}. Tente de novo.`);
          return;
        }
        setRevisao({ boletos: (data.boletos ?? []) as BoletoAntigo[], semCodigo: !!data.sem_codigo });
      } finally {
        setConferindo(false);
      }
      return;
    }

    onSave({
      ...formData,
      monthlyValue: monthlyValueNumber,
      payment_day: parseInt(formData.payment_day) || 1,
      asaas_remove_ids: revisao?.boletos.filter((b) => b.ok).map((b) => b.payment_id),
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
      <DialogContent
        className="text-white max-w-3xl h-[85dvh] max-h-[85dvh] !overflow-hidden"
        chip={<DialogTitle className="truncate font-bold tracking-tight">Editar Contrato</DialogTitle>}
      >
          {/* Content */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6">
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
                    className="bg-white/[0.02] border-white/[0.05] text-white rounded-xl h-10 focus:border-white/40 transition-all text-sm"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="type" className="text-white/50 text-[10px] font-bold uppercase tracking-widest ml-1">Tipo de Serviço</Label>
                  <Input
                    id="type"
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="bg-white/[0.02] border-white/[0.05] text-white rounded-xl h-10 focus:border-white/40 transition-all text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="monthlyValue" className="text-white/50 text-[10px] font-bold uppercase tracking-widest ml-1">Valor Mensal (R$)</Label>
                  <div className="relative group">
                    <DollarCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 group-focus-within:text-primary transition-colors" />
                    <Input
                      id="monthlyValue"
                      type="text"
                      value={formData.monthlyValue}
                      onChange={handleMonthlyValueChange}
                      onBlur={handleMonthlyValueBlur}
                      className="bg-white/[0.02] border-white/[0.05] text-white rounded-xl h-10 pl-9 focus:border-white/40 transition-all text-sm font-bold"
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
                    className="bg-white/[0.02] border-white/[0.05] text-white rounded-xl h-10 focus:border-white/40 transition-all text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                  className="bg-white/[0.02] border-white/[0.05] text-white rounded-xl h-10 focus:border-white/40 transition-all text-sm"
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

              <div className="space-y-1.5">
                <Label className="text-white/50 text-[10px] font-bold uppercase tracking-widest ml-1">Tipo de receita</Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                  <SelectTrigger className="bg-white/[0.02] border-white/[0.05] h-10 rounded-xl text-white/70 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recorrente" className="cursor-pointer">Recorrente (mensalidade)</SelectItem>
                    <SelectItem value="pontual" className="cursor-pointer">Pontual (trabalho avulso)</SelectItem>
                    <SelectItem value="rescisao" className="cursor-pointer">Rescisão (distrato / multa)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {revisao !== null && (
                <div className="space-y-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/50">
                    Parcelamento anterior no Asaas
                  </p>
                  <p className="text-[11px] text-white/45">
                    Ao salvar, o sistema cria um parcelamento novo no Asaas. Os boletos futuros do anterior saem para não ficar duplicado.
                  </p>
                  {revisao.semCodigo ? (
                    <p className="text-xs text-amber-300/90">
                      Este contrato é anterior ao controle por código — o sistema não consegue identificar com segurança os boletos dele.
                      Nada será removido: depois de salvar, confira no Asaas e remova manualmente o parcelamento antigo.
                    </p>
                  ) : (
                    revisao.boletos.map((b) => (
                      <div key={b.payment_id} className="flex items-start justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <p className={b.ok ? "text-white/80" : "text-white/50"}>{brl(Number(b.value))} · venc. {dataBR(b.dueDate)}</p>
                          {b.description && <p className="truncate text-white/35">{b.description}</p>}
                          {!b.ok && b.motivo && <p className="text-amber-300/80">{b.motivo}</p>}
                        </div>
                        <span className={b.ok ? "shrink-0 font-bold text-red-400" : "shrink-0 font-bold text-white/40"}>
                          {b.ok ? "Será removido" : "Fica no Asaas"}
                        </span>
                      </div>
                    ))
                  )}
                  <p className="pt-1 text-[11px] text-white/40">Confira e clique em Salvar para concluir.</p>
                </div>
              )}
            </form>
          </div>

          {/* Footer fixo */}
          <div className="flex items-center justify-end gap-6 p-6 border-t border-white/[0.05] shrink-0">
            <motion.div>
              <button type="button" onClick={onClose} className="acao-texto">Cancelar</button>
            </motion.div>
            <motion.div>
              <LiquidGlassButton
                tint="primary"
                type="submit"
                form="edit-contract-form"
                className="h-11 px-8 text-[10px] font-bold uppercase tracking-widest"
              >
                {conferindo ? 'Conferindo...' : revisao === null ? 'Salvar Alterações' : 'Confirmar e Salvar'}
              </LiquidGlassButton>
            </motion.div>
          </div>
      </DialogContent>
    </Dialog>
  );
}

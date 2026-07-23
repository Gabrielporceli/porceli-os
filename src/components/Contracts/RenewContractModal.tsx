"use client";

import { useState, useEffect } from "react";
import { useScrollLock } from "@/hooks/useScrollLock";
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";
import { DatePicker } from "@/components/ui/date-picker";
import { parseISO, format, addDays, differenceInDays } from "date-fns";
import { FileText, DollarSign, AlertCircle } from "lucide-react";
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
    paymentDay?: number;
    payment_day?: number;
    contract_url?: string;
}

interface RenewContractModalProps {
    isOpen: boolean;
    contract: Contract | null;
    onClose: () => void;
    onConfirm: (data: {
        contractId: string;
        type: string;
        monthlyValue: number;
        startDate: string;
        endDate: string;
        paymentDay: number;
        contract_url?: string;
        singlePayment?: boolean;
    }) => void;
    isPending: boolean;
}

export function RenewContractModal({ isOpen, contract, onClose, onConfirm, isPending }: RenewContractModalProps) {
    useScrollLock(isOpen);
    const [singlePayment, setSinglePayment] = useState(false);
    const [formData, setFormData] = useState({
        type: '',
        monthlyValue: '0,00',
        startDate: '',
        endDate: '',
        paymentDay: '1',
        contract_url: '',
    });

    useEffect(() => {
        if (contract) {
            setSinglePayment(false);
            const currentEndDate = parseISO(contract.endDate);
            const newStartDate = addDays(currentEndDate, 1);
            const originalStartDate = parseISO(contract.startDate);
            const originalDuration = differenceInDays(currentEndDate, originalStartDate);
            const newEndDate = addDays(newStartDate, originalDuration);

            setFormData({
                type: contract.type,
                monthlyValue: contract.monthlyValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
                startDate: format(newStartDate, "yyyy-MM-dd"),
                endDate: format(newEndDate, "yyyy-MM-dd"),
                paymentDay: (contract.payment_day || contract.paymentDay || 1).toString(),
                contract_url: '',
            });
        }
    }, [contract]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!contract) return;
        const monthlyValueNumber = parseFloat(formData.monthlyValue.replace('.', '').replace(',', '.')) || 0;
        onConfirm({
            contractId: contract.id,
            ...formData,
            monthlyValue: monthlyValueNumber,
            // Pagamento único não tem "vigência" — a cobrança é só na data de início.
            endDate: singlePayment ? formData.startDate : formData.endDate,
            paymentDay: parseInt(formData.paymentDay) || 1,
            singlePayment,
        });
    };

    const handleInputChange = (field: string, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleMonthlyValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;
        value = value.replace(/[^\d,]/g, '');
        const parts = value.split(',');
        if (parts.length > 2) value = parts[0] + ',' + parts.slice(1).join('');
        if (parts[1] && parts[1].length > 2) value = parts[0] + ',' + parts[1].substring(0, 2);
        handleInputChange('monthlyValue', value);
    };

    const handleMonthlyValueBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        let value = e.target.value;
        if (value === '' || value === '0' || value === '0,') {
            handleInputChange('monthlyValue', '0,00');
            return;
        }
        if (!value.includes(',')) value = value + ',00';
        else {
            const parts = value.split(',');
            if (!parts[1] || parts[1] === '') value = parts[0] + ',00';
            else if (parts[1].length === 1) value = parts[0] + ',' + parts[1] + '0';
        }
        handleInputChange('monthlyValue', value);
    };

    if (!isOpen || !contract) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="border-white/[0.05] shadow-2xl text-white w-full max-w-3xl !p-0 !gap-0 max-h-[95vh] overflow-hidden !rounded-3xl">
                <LiquidGlass className="w-full flex flex-col !p-0">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-white/[0.05] shrink-0">
                        <div>
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-bold text-white tracking-tight">Renovação de Contrato</DialogTitle>
                                <p className="text-white/40 text-sm">
                                    Editando: <span className="text-white/70 font-black uppercase tracking-widest text-[10px] ml-1">{contract.client}</span>
                                </p>
                            </DialogHeader>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="overflow-y-auto custom-scrollbar p-6">
                        <style>{`
                            .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                            .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(234, 179, 8, 0.2); border-radius: 10px; }
                        `}</style>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Current Contract Info */}
                            <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">Contrato Vigente</span>
                                    <FileText className="w-4 h-4 text-white/20" />
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-white/20 uppercase font-black tracking-widest">Plano</p>
                                        <p className="text-sm font-bold text-white">{contract.type}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-white/20 uppercase font-black tracking-widest">Valor</p>
                                        <p className="text-sm font-bold text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contract.monthlyValue)}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-white/20 uppercase font-black tracking-widest">Pagamento</p>
                                        <p className="text-sm font-bold text-white">Dia {contract.payment_day || contract.paymentDay || 1}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-white/20 uppercase font-black tracking-widest">Expiração</p>
                                        <p className="text-sm font-bold text-yellow-500/90">{new Date(contract.endDate).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/[0.05] rounded-xl">
                                <div className="space-y-0.5">
                                    <Label className="text-white font-medium">Pagamento Único</Label>
                                    <p className="text-white/40 text-xs text-balance">
                                        Cobra o valor total de uma vez, na data de início — em vez de mensalmente.
                                    </p>
                                </div>
                                <Switch
                                    checked={singlePayment}
                                    onCheckedChange={setSinglePayment}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="type" className="text-white/70 text-xs font-bold uppercase tracking-widest ml-1">Novo Plano / Serviço</Label>
                                    <Input
                                        id="type"
                                        value={formData.type}
                                        onChange={(e) => handleInputChange('type', e.target.value)}
                                        className="bg-white/[0.03] border-white/[0.05] text-white rounded-xl h-12 focus:border-yellow-500/50 transition-all font-medium"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="monthlyValue" className="text-white/70 text-xs font-bold uppercase tracking-widest ml-1">
                                        {singlePayment ? "Valor Total (R$)" : "Novo Valor Mensal (R$)"}
                                    </Label>
                                    <div className="relative group">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-yellow-500 transition-colors" />
                                        <Input
                                            id="monthlyValue"
                                            type="text"
                                            value={formData.monthlyValue}
                                            onChange={handleMonthlyValueChange}
                                            onBlur={handleMonthlyValueBlur}
                                            className="bg-white/[0.03] border-white/[0.05] text-white rounded-xl h-12 pl-10 focus:border-yellow-500/50 transition-all font-bold"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {!singlePayment && (
                                    <div className="space-y-2">
                                        <Label htmlFor="paymentDay" className="text-white/70 text-xs font-bold uppercase tracking-widest ml-1">Dia de Pagamento (1-28)</Label>
                                        <Input
                                            id="paymentDay"
                                            type="number"
                                            min="1"
                                            max="28"
                                            value={formData.paymentDay}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                if (val > 28) handleInputChange('paymentDay', "28");
                                                else if (val < 1 && e.target.value !== "") handleInputChange('paymentDay', "1");
                                                else handleInputChange('paymentDay', e.target.value);
                                            }}
                                            className="bg-white/[0.03] border-white/[0.05] text-white rounded-xl h-12 focus:border-yellow-500/50 transition-all font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            required
                                        />
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label htmlFor="contract_url" className="text-white/70 text-xs font-bold uppercase tracking-widest ml-1">Link do Contrato</Label>
                                    <Input
                                        id="contract_url"
                                        type="url"
                                        value={formData.contract_url}
                                        onChange={(e) => handleInputChange('contract_url', e.target.value)}
                                        className="bg-white/[0.03] border-white/[0.05] text-white rounded-xl h-12 focus:border-yellow-500/50 transition-all font-medium"
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-white/70 text-xs font-bold uppercase tracking-widest ml-1">
                                        {singlePayment ? "Data de Vencimento" : "Início da Renovação"}
                                    </Label>
                                    <DatePicker
                                        date={formData.startDate ? parseISO(formData.startDate) : undefined}
                                        setDate={(newDate) => {
                                            if (newDate) handleInputChange('startDate', format(newDate, "yyyy-MM-dd"));
                                        }}
                                    />
                                </div>
                                {!singlePayment && (
                                    <div className="space-y-2">
                                        <Label className="text-white/70 text-xs font-bold uppercase tracking-widest ml-1">Término da Renovação</Label>
                                        <DatePicker
                                            date={formData.endDate ? parseISO(formData.endDate) : undefined}
                                            setDate={(newDate) => {
                                                if (newDate) handleInputChange('endDate', format(newDate, "yyyy-MM-dd"));
                                            }}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="flex items-start gap-4 p-5 rounded-2xl bg-yellow-500/5 border border-yellow-500/10">
                                <AlertCircle className="w-5 h-5 text-yellow-500/60 mt-0.5 shrink-0" />
                                <p className="text-[11px] text-white/40 leading-relaxed font-medium">
                                    Esta ação criará um <span className="text-white/70">novo contrato ativo</span>. O contrato anterior <span className="text-white/70">permanecerá ativo</span> até seu término. Novas faturas financeiras serão geradas automaticamente.
                                </p>
                            </div>

                            {/* Footer Buttons */}
                            <div className="flex gap-4 pt-6 border-t border-white/[0.05]">
                                <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                    <LiquidGlassButton
                                        tint="danger"
                                        type="button"
                                        onClick={onClose}
                                        disabled={isPending}
                                        className="w-full h-12 text-xs font-bold uppercase tracking-widest"
                                    >
                                        Cancelar
                                    </LiquidGlassButton>
                                </motion.div>
                                <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                    <LiquidGlassButton
                                        tint="primary"
                                        type="submit"
                                        disabled={isPending}
                                        className="w-full h-12 text-xs font-bold uppercase tracking-widest"
                                    >
                                        {isPending ? 'Processando...' : 'Confirmar Renovação'}
                                    </LiquidGlassButton>
                                </motion.div>
                            </div>
                        </form>
                    </div>
                </LiquidGlass>
            </DialogContent>
        </Dialog>
    );
}

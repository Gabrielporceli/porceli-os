
import { useState, useEffect } from "react";
import { useScrollLock } from "@/hooks/useScrollLock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { DatePicker } from "@/components/ui/date-picker";
import { parseISO, format, addDays, differenceInDays } from "date-fns";
import { Calendar, FileText, DollarSign, AlertCircle, X } from "lucide-react";
import ReactDOM from "react-dom";

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
    }) => void;
    isPending: boolean;
}

export function RenewContractModal({ isOpen, contract, onClose, onConfirm, isPending }: RenewContractModalProps) {
    useScrollLock(isOpen);
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
            // Calculate default renewal dates
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
                contract_url: '', // Default to empty for new contract
            });
        }
    }, [contract]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!contract) return;

        // Convert monthlyValue from Brazilian format to number
        const monthlyValueNumber = parseFloat(formData.monthlyValue.replace('.', '').replace(',', '.')) || 0;

        onConfirm({
            contractId: contract.id,
            ...formData,
            monthlyValue: monthlyValueNumber,
            paymentDay: parseInt(formData.paymentDay) || 1
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

    const handlePaymentDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;
        value = value.replace(/\D/g, '');
        const numValue = parseInt(value);
        if (numValue > 31) {
            value = '31';
        } else if (numValue < 1 && value !== '') {
            value = '1';
        }
        handleInputChange('paymentDay', value);
    };

    if (!isOpen || !contract) return null;

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
                    className="relative liquid-glass rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] border border-white/[0.05] animate-scale-in pointer-events-auto overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-white/[0.05]">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.1)]">
                                <Calendar className="w-6 h-6 text-yellow-500" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white tracking-tight">Renovação de Contrato</h2>
                                <p className="text-white/40 text-xs font-medium uppercase tracking-[0.1em]">
                                    Editando: <span className="text-white/60 font-black">{contract.client}</span>
                                </p>
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
                    <div className="overflow-y-auto max-h-[calc(90vh-140px)] custom-scrollbar p-6">
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
                        `}</style>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-4 shadow-inner relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-3 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                                    <FileText className="w-12 h-12 text-white" />
                                </div>
                                <div className="flex items-center justify-between relative z-10">
                                    <span className="text-white/30 text-[10px] font-black uppercase tracking-widest">Resumo do Contrato Atual</span>
                                </div>
                                <div className="grid grid-cols-4 gap-6 relative z-10">
                                    <div>
                                        <p className="text-[10px] text-white/20 uppercase font-bold mb-1 tracking-tighter">Plano Atual</p>
                                        <p className="text-sm font-bold text-white/90">{contract.type}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-white/20 uppercase font-bold mb-1 tracking-tighter">Valor Mensal</p>
                                        <p className="text-sm font-bold text-white/90">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contract.monthlyValue)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-white/20 uppercase font-bold mb-1 tracking-tighter">Dia do Pagamento</p>
                                        <p className="text-sm font-bold text-white/90">{contract.payment_day || contract.paymentDay || 1}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-white/20 uppercase font-bold mb-1 tracking-tighter">Data de Expiração</p>
                                        <p className="text-sm font-bold text-yellow-500/90">{new Date(contract.endDate).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="type" className="text-white/40 text-[10px] font-black uppercase tracking-widest ml-1">Novo Plano / Serviço</Label>
                                    <div className="relative group">
                                        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-yellow-500 transition-colors" />
                                        <Input
                                            id="type"
                                            value={formData.type}
                                            onChange={(e) => handleInputChange('type', e.target.value)}
                                            className="bg-white/[0.04] border-white/5 text-white rounded-2xl h-14 pl-12 focus:bg-white/[0.06] focus:border-white/20 transition-all text-sm font-medium"
                                            placeholder="Ex: Gestão de Tráfego + CRM"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="monthlyValue" className="text-white/40 text-[10px] font-black uppercase tracking-widest ml-1">Novo Valor Mensal (R$)</Label>
                                        <div className="relative group">
                                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-yellow-500 transition-colors" />
                                            <Input
                                                id="monthlyValue"
                                                type="text"
                                                value={formData.monthlyValue}
                                                onChange={handleMonthlyValueChange}
                                                onBlur={handleMonthlyValueBlur}
                                                onFocus={(e) => {
                                                    if (e.target.value === "0,00") {
                                                        handleInputChange('monthlyValue', "");
                                                    }
                                                }}
                                                className="bg-white/[0.04] border-white/5 text-white rounded-2xl h-14 pl-12 focus:bg-white/[0.06] focus:border-white/20 transition-all text-sm font-bold"
                                                placeholder="0,00"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="paymentDay" className="text-white/40 text-[10px] font-black uppercase tracking-widest ml-1">Novo Dia de Pagamento</Label>
                                        <div className="relative group">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-yellow-500 transition-colors" />
                                            <Input
                                                id="paymentDay"
                                                type="text"
                                                value={formData.paymentDay}
                                                onChange={handlePaymentDayChange}
                                                className="bg-white/[0.04] border-white/5 text-white rounded-2xl h-14 pl-12 focus:bg-white/[0.06] focus:border-white/20 transition-all text-sm font-medium"
                                                placeholder="Ex: 10"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="contract_url" className="text-white/40 text-[10px] font-black uppercase tracking-widest ml-1">Link do Novo Contrato</Label>
                                    <div className="relative group">
                                        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-yellow-500 transition-colors" />
                                        <Input
                                            id="contract_url"
                                            type="url"
                                            value={formData.contract_url}
                                            onChange={(e) => handleInputChange('contract_url', e.target.value)}
                                            className="bg-white/[0.04] border-white/5 text-white rounded-2xl h-14 pl-12 focus:bg-white/[0.06] focus:border-white/20 transition-all text-sm font-medium"
                                            placeholder="https://..."
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-white/40 text-[10px] font-black uppercase tracking-widest ml-1">Início da Renovação</Label>
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
                                        <Label className="text-white/40 text-[10px] font-black uppercase tracking-widest ml-1">Término da Renovação</Label>
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
                            </div>

                            <div className="flex items-start gap-4 p-4 rounded-2xl bg-yellow-500/5 border border-yellow-500/10">
                                <AlertCircle className="w-5 h-5 text-yellow-500/60 mt-1 shrink-0" />
                                <p className="text-[11px] text-white/40 leading-relaxed font-medium">
                                    Esta ação criará um <span className="text-white/70">novo contrato ativo</span>. O contrato anterior <span className="text-white/70">permanecerá ativo</span> até seu término. Novas faturas financeiras serão geradas automaticamente.
                                </p>
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
                                        disabled={isPending}
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
                                        disabled={isPending}
                                        className="bg-primary hover:bg-primary/90 text-white w-full h-11 rounded-2xl shadow-[0_0_20px_rgba(104,41,192,0.3)] font-bold transition-all text-base disabled:opacity-50"
                                    >
                                        {isPending ? 'Processando...' : 'Confirmar Renovação'}
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

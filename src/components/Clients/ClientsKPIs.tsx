
import { Card } from "@/components/ui/card";
import { Building2, Calendar, UserX } from "lucide-react";

interface Client {
  id: string;
  company: string;
  cnpj: string;
  responsible: string;
  phone: string;
  email: string;
  contractEnd: string;
  paymentDay: number;
  tags: string[];
  address: string;
  plan?: string;
  startDate?: string;
}

interface ClientsKPIsProps {
  clients: Client[];
}

export function ClientsKPIs({ clients }: ClientsKPIsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card className="liquid-glass dashboard-glow border-white/5 p-6 animate-premium-in [animation-delay:100ms] overflow-hidden group hover:bg-white/[0.04] transition-all">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Total de Clientes</p>
            <p className="text-2xl font-black text-white tracking-tighter tabular-nums">{clients.length}</p>
          </div>
        </div>
      </Card>

      <Card className="liquid-glass dashboard-glow border-white/5 p-6 animate-premium-in [animation-delay:200ms] overflow-hidden group hover:bg-white/[0.04] transition-all">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center border border-green-500/20">
            <Building2 className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Clientes Ativos</p>
            <p className="text-2xl font-black text-white tracking-tighter tabular-nums">
              {clients.filter(c => c.tags.includes("Ativo")).length}
            </p>
          </div>
        </div>
      </Card>

      <Card className="liquid-glass dashboard-glow border-white/5 p-6 animate-premium-in [animation-delay:300ms] overflow-hidden group hover:bg-white/[0.04] transition-all">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center border border-yellow-500/20">
            <Calendar className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Contratos A Vencer</p>
            <p className="text-2xl font-black text-white tracking-tighter tabular-nums">
              {clients.filter(c => c.tags.includes("A vencer")).length}
            </p>
          </div>
        </div>
      </Card>

      <Card className="liquid-glass dashboard-glow border-white/5 p-6 animate-premium-in [animation-delay:400ms] overflow-hidden group hover:bg-white/[0.04] transition-all">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center border border-red-500/20">
            <UserX className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Clientes Inativos</p>
            <p className="text-2xl font-black text-white tracking-tighter tabular-nums">
              {clients.filter(c => c.tags.includes("Inativo") || c.tags.includes("Vencido")).length}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Phone, Mail, Calendar, Hash, ChevronDown, ChevronRight } from "lucide-react";
import { usePlansContext } from "@/contexts/PlansContext";

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
  planColor?: string;
  monthlyValue?: string;
}

interface ClientItemProps {
  client: Client;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onEdit: () => void;
  onDelete: () => void;
  planColors?: Record<string, string>;
}

export function ClientItem({ client, isExpanded, onToggleExpanded, onEdit, onDelete, planColors = {} }: ClientItemProps) {
  const { getPlanByName } = usePlansContext();

  const getTagColor = (tag: string) => {
    switch (tag.toLowerCase()) {
      case "ativo":
        return "bg-green-600 text-white hover:bg-green-700";
      case "a vencer":
        return "bg-yellow-600 text-white hover:bg-yellow-700";
      case "vencido":
        return "bg-red-600 text-white hover:bg-red-700";
      case "premium":
        return "bg-Porceli-purple text-white hover:bg-Porceli-purple";
      case "gold":
        return "bg-yellow-700 text-white hover:bg-yellow-800";
      case "standard":
        return "bg-Porceli-gray-600 text-white hover:bg-Porceli-gray-700";
      default:
        return "bg-Porceli-gray-600 text-white hover:bg-Porceli-gray-700";
    }
  };

  const getPlanColor = (plan: string) => {
    // First try to get from the plans context (dynamic plans)
    const planFromContext = getPlanByName(plan);
    if (planFromContext && planFromContext.color) {
      return planFromContext.color;
    }

    // Fallback to legacy planColors prop
    if (planColors[plan]) {
      return planColors[plan];
    }
    
    // Default colors for known plans
    switch (plan.toLowerCase()) {
      case "vendas":
        return "bg-blue-600 text-white hover:bg-blue-700";
      case "branding":
        return "bg-pink-600 text-white hover:bg-pink-700";
      case "automação":
        return "bg-purple-600 text-white hover:bg-purple-700";
      case "landing page":
        return "bg-green-600 text-white hover:bg-green-700";
      case "premium":
        return "bg-Porceli-purple text-white hover:bg-Porceli-purple";
      case "gold":
        return "bg-yellow-700 text-white hover:bg-yellow-800";
      case "standard":
        return "bg-Porceli-gray-600 text-white hover:bg-Porceli-gray-700";
      default:
        return "bg-Porceli-gray-600 text-white hover:bg-Porceli-gray-700";
    }
  };

  return (
    <div className="hover:bg-white/[0.04] transition-all duration-300 group">
      <div
        className="p-6 cursor-pointer flex items-center justify-between"
        onClick={onToggleExpanded}
      >
        <div className="flex items-center gap-4 flex-1">
          <div className="flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-white/40 group-hover:text-primary transition-colors" />
            ) : (
              <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-primary transition-colors" />
            )}
          </div>

          <div className="flex items-center gap-3 flex-1">
            <h4 className="text-lg font-semibold text-white">{client.company}</h4>

          </div>

          <div className="flex items-center gap-2 text-white/50">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Pagamento: dia {client.paymentDay}</span>
          </div>
        </div>

        <div className="flex gap-2 ml-6">
          <Button
            size="sm"
            className="liquid-glass text-primary hover:bg-white/10 border border-white/5 rounded-xl h-9 px-4 font-bold transition-all"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            Editar
          </Button>
          <Button
            size="sm"
            className="liquid-glass text-red-500 hover:bg-white/10 border border-white/5 rounded-xl h-9 px-4 font-bold transition-all"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            Excluir
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-6 pb-6 pt-0">
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <span className="text-white/40 text-[10px] uppercase font-black tracking-widest block mb-1">CNPJ</span>
                    <span className="text-white font-medium">{client.cnpj}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                    <Phone className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <span className="text-white/40 text-[10px] uppercase font-black tracking-widest block mb-1">Responsável</span>
                    <span className="text-white font-medium">{client.responsible}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                    <Phone className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <span className="text-white/40 text-[10px] uppercase font-black tracking-widest block mb-1">Telefone</span>
                    <span className="text-white font-medium">{client.phone}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                    <Hash className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <span className="text-white/40 text-[10px] uppercase font-black tracking-widest block mb-1">Grupo ID</span>
                    <span className="text-white font-medium">{client.grupoId || 'Não definido'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <span className="text-white/40 text-[10px] uppercase font-black tracking-widest block mb-1">Email</span>
                    <span className="text-white font-medium">{client.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <span className="text-white/40 text-[10px] uppercase font-black tracking-widest block mb-1">Fim do contrato</span>
                    <span className="text-white font-medium">
                      {client.contractEnd ? (() => {
                        const [ano, mes, dia] = client.contractEnd.split('-');
                        return `${dia}/${mes}/${ano}`;
                      })() : 'Não definido'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <span className="text-white/40 text-[10px] uppercase font-black tracking-widest block mb-1">Início do contrato</span>
                    <span className="text-white font-medium">
                      {client.startDate ? (() => {
                        const [ano, mes, dia] = client.startDate.split('-');
                        return `${dia}/${mes}/${ano}`;
                      })() : 'Não definido'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <span className="text-white/40 text-[10px] uppercase font-black tracking-widest block mb-1">Valor mensal</span>
                    <span className="text-white font-bold tracking-tight text-lg">
                      R$ {client.monthlyValue ? parseFloat(client.monthlyValue).toFixed(2).replace('.', ',') : '0,00'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

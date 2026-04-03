
import { Card } from "@/components/ui/card";
import { FileText, CheckCircle, Clock, XCircle } from "lucide-react";

interface Contract {
  id: number;
  title: string;
  client: string;
  value: number;
  status: string;
  startDate: string;
  endDate: string;
  type: string;
}

interface ContractsKPIsProps {
  contracts: Contract[];
}

export function ContractsKPIs({ contracts }: ContractsKPIsProps) {
  const activeContracts = contracts.filter(c => c.status === "Ativo").length;
  const pendingContracts = contracts.filter(c => c.status === "Pendente").length;
  const expiredContracts = contracts.filter(c => c.status === "Vencido").length;
  const totalValue = contracts.reduce((sum, contract) => sum + contract.value, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card className="bg-goat-gray-800 border-goat-gray-700 p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-goat-purple/20 rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6 text-goat-purple" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{contracts.length}</p>
            <p className="text-goat-gray-400 text-sm">Total de Contratos</p>
          </div>
        </div>
      </Card>

      <Card className="bg-goat-gray-800 border-goat-gray-700 p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{activeContracts}</p>
            <p className="text-goat-gray-400 text-sm">Contratos Ativos</p>
          </div>
        </div>
      </Card>

      <Card className="bg-goat-gray-800 border-goat-gray-700 p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-yellow-600/20 rounded-lg flex items-center justify-center">
            <Clock className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{pendingContracts}</p>
            <p className="text-goat-gray-400 text-sm">Pendentes</p>
          </div>
        </div>
      </Card>

      <Card className="bg-goat-gray-800 border-goat-gray-700 p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">
              R$ {totalValue.toLocaleString('pt-BR')}
            </p>
            <p className="text-goat-gray-400 text-sm">Valor Total</p>
          </div>
        </div>
      </Card>
    </div>
  );
}


import { Card } from "@/components/ui/card";
import { MessageCircle, Users, Clock, CheckCircle } from "lucide-react";

interface Conversation {
  id: number;
  contact: string;
  lastMessage: string;
  timestamp: string;
  status: string;
  unread: number;
}

interface ConversationsKPIsProps {
  conversations: Conversation[];
}

export function ConversationsKPIs({ conversations }: ConversationsKPIsProps) {
  const activeConversations = conversations.filter(c => c.status === 'Ativo').length;
  const pendingConversations = conversations.filter(c => c.status === 'Pendente').length;
  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);
  const resolvedToday = conversations.filter(c => c.status === 'Resolvido').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card className="bg-goat-gray-800 border-goat-gray-700 p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-goat-purple/20 rounded-lg flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-goat-purple" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{conversations.length}</p>
            <p className="text-goat-gray-400 text-sm">Total de Conversas</p>
          </div>
        </div>
      </Card>

      <Card className="bg-goat-gray-800 border-goat-gray-700 p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center">
            <Users className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{activeConversations}</p>
            <p className="text-goat-gray-400 text-sm">Conversas Ativas</p>
          </div>
        </div>
      </Card>

      <Card className="bg-goat-gray-800 border-goat-gray-700 p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-yellow-600/20 rounded-lg flex items-center justify-center">
            <Clock className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{pendingConversations}</p>
            <p className="text-goat-gray-400 text-sm">Aguardando Resposta</p>
          </div>
        </div>
      </Card>

      <Card className="bg-goat-gray-800 border-goat-gray-700 p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-red-600/20 rounded-lg flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{totalUnread}</p>
            <p className="text-goat-gray-400 text-sm">Mensagens Não Lidas</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

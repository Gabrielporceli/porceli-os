import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Search, Send, Phone, MessageCircle, Filter } from "lucide-react";
import { ConversationSidebarFilters } from "@/components/Conversations/ConversationSidebarFilters";
import { WebhookTester } from "@/components/Conversations/WebhookTester";
import { MessageMedia } from "@/components/Conversations/MessageMedia";
import { useToast } from "@/hooks/use-toast";
import { ConversationsHeader } from "@/components/Conversations/ConversationsHeader";
import { NewConversationModal } from "@/components/Conversations/NewConversationModal";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { useConversations, useMessages, useCreateConversation, type Conversation } from "@/hooks/useConversations";
import { useSendMessage } from "@/hooks/useSendMessage";
import { useStages } from "@/hooks/useStages";
import { supabase } from "@/integrations/supabase/client";

export default function Conversations() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isNewConversationModalOpen, setIsNewConversationModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    stages: [] as string[],
    tags: [] as string[],
    direction: [] as string[],
    client: ""
  });
  const { toast } = useToast();

  const { data: conversations = [], isLoading: conversationsLoading, refetch: refetchConversations } = useConversations();
  const { data: messages = [], refetch: refetchMessages } = useMessages(selectedConversation?.id || "");
  const sendMessageMutation = useSendMessage();
  const createConversationMutation = useCreateConversation();
  const { stages } = useStages();

  // Configurar tempo real para conversas
  useEffect(() => {
    const channel = supabase
      .channel('conversations-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        () => {
          refetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchConversations]);

  // Configurar tempo real para mensagens da conversa selecionada
  useEffect(() => {
    if (!selectedConversation?.id) return;

    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`
        },
        () => {
          refetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation?.id, refetchMessages]);

  // Função para marcar conversa como lida
  const markConversationAsRead = async (conversationId: string) => {
    try {
      await supabase
        .from('conversations')
        .update({ unread_count: 0 })
        .eq('id', conversationId);

      // Atualizar a lista de conversas para refletir a mudança
      refetchConversations();
    } catch (error) {
      console.error('Erro ao marcar conversa como lida:', error);
    }
  };

  // Função para selecionar conversa e marcar como lida
  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);

    // Se a conversa tem mensagens não lidas, marcar como lida
    if (conversation.unread_count && conversation.unread_count > 0) {
      markConversationAsRead(conversation.id);
    }
  };

  const handleNewConversation = (client: string, phone: string) => {
    createConversationMutation.mutate(
      { phone, contactName: client },
      {
        onSuccess: (newConversation) => {
          setSelectedConversation(newConversation);
          setIsNewConversationModalOpen(false);
        }
      }
    );
  };

  const handleSendMessage = () => {
    if (newMessage.trim() && selectedConversation) {
      sendMessageMutation.mutate(
        {
          numero: selectedConversation.phone,
          mensagem: newMessage.trim(),
          nome_contato: selectedConversation.contact_name
        },
        {
          onSuccess: () => {
            setNewMessage("");
          }
        }
      );
    }
  };

  const handleFiltersChange = (newFilters: { stages: string[], tags: string[], direction: string[], client: string }) => {
    setFilters(newFilters);
  };

  const filteredConversations = conversations.filter(conversation => {
    const matchesSearch = (conversation.contact_name || conversation.phone).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClient = !filters.client || (conversation.contact_name || "").toLowerCase().includes(filters.client.toLowerCase());
    const matchesStages = filters.stages.length === 0 || filters.stages.includes(conversation.stage || "");
    const matchesTags = filters.tags.length === 0 || filters.tags.includes(conversation.tag || "");
    const matchesDirection = filters.direction.length === 0 || filters.direction.includes(conversation.direction || "");
    return matchesSearch && matchesClient && matchesStages && matchesTags && matchesDirection;
  });

  const hasActiveFilters = filters.stages.length > 0 || filters.tags.length > 0 || filters.direction.length > 0 || filters.client !== "";

  // Função para converter timestamp UTC para horário local brasileiro (UTC-3)
  const formatTime = (dateString?: string) => {
    if (!dateString) return "Agora";
    try {
      // Criar Date do timestamp UTC armazenado no banco
      const dateUtc = new Date(dateString);

      // Converter para horário brasileiro (UTC-3) manualmente
      const brazilTime = new Date(dateUtc.getTime() - (3 * 60 * 60 * 1000));

      // Formatar no padrão brasileiro
      const hours = brazilTime.getUTCHours().toString().padStart(2, '0');
      const minutes = brazilTime.getUTCMinutes().toString().padStart(2, '0');

      return `${hours}:${minutes}`;
    } catch (error) {
      console.warn('Erro ao converter horário:', error, 'DateString:', dateString);
      return "Agora";
    }
  };

  const getStageName = (stageId?: string) => {
    if (!stageId) return "Sem atendimento";
    const stage = stages.find(s => s.id === stageId);
    return stage?.name || "Sem atendimento";
  };

  // Determinar se a mensagem é do usuário usando o campo numero
  const isUserMessage = (message: any) => {
    return message.direcao === true || message.numero === "user";
  };

  if (conversationsLoading) {
    return (
      <div className="relative">
        <ConversationsHeader onNewConversation={() => setIsNewConversationModalOpen(true)} />
        <div className="pt-[122px] w-full pb-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-white/40">Carregando conversas...</div>
          </div>
        </div>
      </div>
    );
  }

  const cardHeightClasses = "h-full";

  return (
    <div className="relative">
      {/* HEADER FIXO - div totalmente separada do conteúdo */}
      <ConversationsHeader onNewConversation={() => setIsNewConversationModalOpen(true)}>
        {/* Busca e Filtros integrados ao Header para simetria perfeita com o Kanban! */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              placeholder="Buscar conversas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 bg-white/[0.03] border-white/[0.05] text-white placeholder:text-white/30 rounded-xl transition-all hover:bg-white/[0.05] focus:bg-white/[0.05] focus:border-primary/50"
            />
          </div>
          <Button
            onClick={() => setIsFiltersOpen(true)}
            variant="outline"
            className="h-11 bg-white/[0.03] border-white/[0.05] text-white hover:bg-white/[0.05] hover:text-white rounded-xl transition-all"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
            {hasActiveFilters && (
              <Badge className="ml-2 bg-white text-goat-purple text-xs">
                {filters.stages.length + filters.tags.length + filters.direction.length + (filters.client ? 1 : 0)}
              </Badge>
            )}
          </Button>
        </div>
      </ConversationsHeader>

      {/* CONTEÚDO DA PÁGINA (Grid de conversas e chat) */}
      <div
        className="w-full flex flex-col"
        style={{ marginTop: '112px', height: 'calc(100vh - 160px)' }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0 relative">
          {/* Lista de Conversas */}
          <div className="lg:col-span-1 relative">
            <LiquidGlass className={`border-white/[0.05] rounded-xl shadow-2xl absolute inset-0`}>
              <div className="absolute inset-0 p-4 flex flex-col min-h-0">
                <div className="flex items-center gap-2 mb-4 flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-white/80" />
                  <h3 className="text-lg font-bold text-white tracking-tight">Conversas ({filteredConversations.length})</h3>
                </div>

                {filteredConversations.length === 0 ? (
                  <div className="text-center py-8 flex-1 flex items-center justify-center">
                    <div>
                      <div className="w-16 h-16 bg-white/[0.03] flex items-center justify-center rounded-2xl mx-auto mb-4 border border-white/5">
                        <MessageSquare className="w-8 h-8 text-white/20" />
                      </div>
                      <p className="text-white/40 mb-4">Nenhuma conversa encontrada</p>
                      <Button
                        onClick={() => setIsNewConversationModalOpen(true)}
                        className="h-11 px-6 text-sm bg-primary hover:bg-primary/90 text-white shadow-[0_0_15px_rgba(104,41,192,0.4)] rounded-xl transition-all font-bold"
                      >
                        Iniciar Nova Conversa
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {filteredConversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        onClick={() => handleSelectConversation(conversation)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedConversation?.id === conversation.id
                          ? 'bg-primary/20 border-primary/50 shadow-[0_0_15px_rgba(104,41,192,0.2)]'
                          : 'bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.04]'
                          }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-medium text-sm truncate">
                              {conversation.contact_name || conversation.phone}
                            </h4>
                            <p className="text-goat-gray-400 text-xs flex items-center gap-1">
                              <Phone className="w-3 h-3 flex-shrink-0" />
                              {conversation.phone}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <Badge
                              variant={conversation.tag === "Cliente" ? "default" : "outline"}
                              className={`text-[10px] px-2 py-0 h-5 font-medium border ${conversation.tag === "Cliente"
                                ? "bg-primary/20 text-white border-primary/30"
                                : "bg-white/[0.03] text-white/40 border-white/5"
                                }`}
                            >
                              {conversation.tag || "Lead"}
                            </Badge>
                            {(conversation.unread_count || 0) > 0 && (
                              <Badge className="bg-red-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center">
                                {conversation.unread_count}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-white/60 text-sm mb-2 line-clamp-2 pr-4 leading-relaxed">
                          {conversation.last_message || "Sem mensagens"}
                        </p>
                        <div className="flex justify-between items-center mt-auto">
                          <div className="flex items-center gap-2">
                            <span className="text-white/30 text-xs font-medium">
                              {formatTime(conversation.updated_at)}
                            </span>
                            <Badge className="bg-white/[0.03] text-white/50 text-[10px] px-2 h-5 border border-white/5 whitespace-nowrap">
                              {getStageName(conversation.stage)}
                            </Badge>
                          </div>
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${conversation.direction === "inbound" ? "bg-green-400" : "bg-blue-400"
                            }`} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </LiquidGlass>
          </div>

          {/* Chat */}
          <div className="lg:col-span-2 relative">
            <LiquidGlass className={`border-white/[0.05] rounded-xl shadow-2xl absolute inset-0`}>
              <div className="absolute inset-0 p-4 flex flex-col min-h-0">
                {selectedConversation ? (
                  <>
                    <div className="border-b border-white/[0.05] pb-4 mb-4 flex-shrink-0">
                      <div className="flex items-center gap-3">
                        <div>
                          <h3 className="text-lg font-bold text-white tracking-tight">
                            {selectedConversation.contact_name || selectedConversation.phone}
                          </h3>
                          <p className="text-white/40 text-sm">{selectedConversation.phone}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
                      {messages.map((message) => (
                        <div key={message.id} className={`flex ${isUserMessage(message) ? "justify-end" : "justify-start"}`}>
                          <div className={`message-bubble flex flex-col relative rounded-2xl w-auto ${message.media_type
                            ? 'p-1.5'
                            : 'px-5 py-3.5'
                            } ${isUserMessage(message)
                              ? "bg-gradient-to-br from-primary to-purple-700 text-white rounded-br-sm shadow-[0_5px_25px_rgba(104,41,192,0.3)] border border-primary/40"
                              : "bg-white/[0.08] backdrop-blur-md border border-white/10 text-white rounded-bl-sm shadow-[0_8px_32px_rgba(0,0,0,0.15)]"
                            }`}
                            style={{
                              minWidth: '80px',
                              maxWidth: message.media_type && message.media_type.startsWith('audio/') ? '340px' : '75%'
                            }}
                          >
                            {(message.text || message.mensagem) &&
                              !["Mídia enviada", "Mensagem de voz", "Audio Message", "Video Message", "Image Message"].includes(message.text || message.mensagem || "") && (
                                <p className={`text-[15px] break-words whitespace-pre-line leading-relaxed ${message.media_type ? 'px-2 pb-1 pt-2' : ''}`}>
                                  {message.text || message.mensagem}
                                </p>
                              )}

                            {/* Renderizar mídia se existir */}
                            {message.media_type && (
                              <MessageMedia
                                mediaType={message.media_type}
                                mediaUrl={message.media_url || ""}
                                mediaFilename={message.media_filename || undefined}
                                mediaSize={message.media_size || undefined}
                                isUserMessage={isUserMessage(message)}
                              />
                            )}

                            <span className={`text-[10.5px] block text-right font-medium tracking-wide ${isUserMessage(message)
                              ? "text-white/80"
                              : "text-white/50"
                              } ${message.media_type ? 'pr-2 pb-1' : 'mt-1'}`}>
                              {formatTime(message.data_hora || message.created_at)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Input
                        placeholder="Digite sua mensagem..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        className="flex-1 h-12 rounded-xl bg-white/[0.03] border-white/[0.05] text-white placeholder:text-white/30 hover:bg-white/[0.05] focus:bg-white/[0.05] focus:border-primary/50 transition-all"
                        disabled={sendMessageMutation.isPending}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || sendMessageMutation.isPending}
                        className="h-12 w-12 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-[0_0_15px_rgba(104,41,192,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-white/[0.03] flex items-center justify-center rounded-2xl mx-auto mb-6 border border-white/5">
                        <MessageSquare className="w-10 h-10 text-white/20" />
                      </div>
                      <h3 className="text-xl font-bold text-white tracking-tight mb-2">Selecione uma conversa</h3>
                      <p className="text-white/40 text-sm">Escolha uma conversa da lista para iniciar e visualizar o chat</p>
                    </div>
                  </div>
                )}
              </div>
            </LiquidGlass>
          </div>
        </div>

        {/* Modal de Filtros */}
        <ConversationSidebarFilters
          isOpen={isFiltersOpen}
          onClose={() => setIsFiltersOpen(false)}
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />

        {/* Modal de Nova Conversa */}
        <NewConversationModal
          isOpen={isNewConversationModalOpen}
          onClose={() => setIsNewConversationModalOpen(false)}
          onNewConversation={handleNewConversation}
        />
      </div>
    </div>
  );
}

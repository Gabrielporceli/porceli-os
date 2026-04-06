import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Search, Send, Phone, MessageCircle, Filter, Users, User, Paperclip, Mic, Square, X, Play } from "lucide-react";
import WaveSurfer from 'wavesurfer.js';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { ConversationSidebarFilters } from "@/components/Conversations/ConversationSidebarFilters";
import { WebhookTester } from "@/components/Conversations/WebhookTester";
import { MessageMedia } from "@/components/Conversations/MessageMedia";
import { useToast } from "@/hooks/use-toast";
import { ConversationsHeader } from "@/components/Conversations/ConversationsHeader";
import { NewConversationModal } from "@/components/Conversations/NewConversationModal";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { useTags } from "@/hooks/useTags";
import { useConversations, useMessages, useCreateConversation, type Conversation } from "@/hooks/useConversations";
import { useSendMessage } from "@/hooks/useSendMessage";
import { useStages } from "@/hooks/useStages";
import { supabase } from "@/integrations/supabase/client";

function AudioWavePreview({ src }: { src: string }) {
  const waveRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!waveRef.current) return;
    const ws = WaveSurfer.create({
      container: waveRef.current,
      waveColor: 'rgba(239,68,68,0.4)',
      progressColor: 'rgba(239,68,68,0.9)',
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      height: 28,
      cursorWidth: 0,
      url: src,
    });
    ws.on('ready', () => setRemaining(ws.getDuration()));
    ws.on('audioprocess', () => setRemaining(ws.getDuration() - ws.getCurrentTime()));
    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => { setIsPlaying(false); ws.seekTo(0); setRemaining(ws.getDuration()); });
    wsRef.current = ws;
    return () => { ws.destroy(); wsRef.current = null; };
  }, [src]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <button onClick={() => wsRef.current?.playPause()}
        className="w-7 h-7 flex items-center justify-center text-red-400 flex-shrink-0 hover:text-red-300 transition-colors">
        {isPlaying
          ? <Square className="w-3.5 h-3.5 fill-current" />
          : <Play className="w-3.5 h-3.5 fill-current" />}
      </button>
      <div ref={waveRef} className="flex-1 min-w-0" />
      <span className="text-white/40 text-xs tabular-nums flex-shrink-0">{fmt(remaining)}</span>
    </div>
  );
}

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
  const [mediaAttachment, setMediaAttachment] = useState<{
    base64: string;
    mimetype: string;
    filename: string;
    type: 'image' | 'video' | 'audio' | 'document';
    preview?: string;
  } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  // Cache de URLs de mídia enviadas nesta sessão (messageId -> url)
  const mediaBlobCache = useRef<Map<string, string>>(new Map());
  const { toast } = useToast();

  const { data: conversations = [], isLoading: conversationsLoading, refetch: refetchConversations } = useConversations();
  const { data: messages = [], refetch: refetchMessages } = useMessages(selectedConversation?.id || "");
  const { tags: formalTags } = useTags();
  const sendMessageMutation = useSendMessage();
  const createConversationMutation = useCreateConversation();
  const { stages } = useStages();
  const [searchParams, setSearchParams] = useSearchParams();

  // Efeito para selecionar conversa via query param (jid ou phone)
  useEffect(() => {
    const jid = searchParams.get('jid');
    const phone = searchParams.get('phone');
    
    if (jid || phone) {
      const target = conversations.find(c => 
        (jid && c.remote_jid === jid) || 
        (phone && c.phone === phone)
      );
      
      if (target && selectedConversation?.id !== target.id) {
        handleSelectConversation(target);
        // Limpar os params para não ficar re-selecionando se o usuário fechar
        searchParams.delete('jid');
        searchParams.delete('phone');
        setSearchParams(searchParams);
      }
    }
  }, [searchParams, conversations]);

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

  // Sincronizar conversa selecionada com a lista (para refletir edições de nome)
  useEffect(() => {
    if (selectedConversation && conversations.length > 0) {
      const updated = conversations.find(c => c.id === selectedConversation.id);
      if (updated && (updated.contact_name !== selectedConversation.contact_name || updated.contact_photo !== selectedConversation.contact_photo)) {
        setSelectedConversation(updated);
      }
    }
  }, [conversations, selectedConversation]);

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
    if (!selectedConversation) return;
    if (!newMessage.trim() && !mediaAttachment) return;

    sendMessageMutation.mutate(
      {
        numero: selectedConversation.phone,
        mensagem: newMessage.trim(),
        nome_contato: selectedConversation.contact_name,
        media_base64: mediaAttachment?.base64,
        media_mimetype: mediaAttachment?.mimetype,
        media_filename: mediaAttachment?.filename,
      },
      {
        onSuccess: (result: any) => {
          // Cachear URL de prévia de qualquer mídia enviada nesta sessão
          if (mediaAttachment?.preview && result?.message_id) {
            mediaBlobCache.current.set(result.message_id, mediaAttachment.preview);
          }
          setNewMessage("");
          setMediaAttachment(null);
        }
      }
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 16 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "O tamanho máximo é 16 MB.", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const type: 'image' | 'video' | 'audio' | 'document' = file.type.startsWith('image/') ? 'image'
        : file.type.startsWith('video/') ? 'video'
        : file.type.startsWith('audio/') ? 'audio'
        : 'document';

      setMediaAttachment({
        base64,
        mimetype: file.type,
        filename: file.name,
        type,
        // preview = base64 para imagens; blob URL para vídeo/áudio; undefined para documentos
        preview: type === 'image' ? base64 : (type === 'video' || type === 'audio') ? URL.createObjectURL(file) : undefined,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Inicia animação do canvas APÓS o React renderizar o elemento (isRecording = true)
  useEffect(() => {
    if (!isRecording || !analyserRef.current) return;

    const drawWave = () => {
      const canvas = waveCanvasRef.current;
      const analyser = analyserRef.current;
      if (!canvas || !analyser) return;

      // Sincronizar buffer do canvas com tamanho real na tela
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width) canvas.width = rect.width || 300;
      if (canvas.height !== rect.height) canvas.height = rect.height || 28;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const bars = data.length;
      const gap = 2;
      const barW = Math.max(1, (canvas.width - gap * (bars - 1)) / bars);

      for (let i = 0; i < bars; i++) {
        const ratio = data[i] / 255;
        const h = Math.max(3, ratio * canvas.height);
        const x = i * (barW + gap);
        const y = (canvas.height - h) / 2;
        ctx.fillStyle = `rgba(239,68,68,${0.4 + ratio * 0.6})`;
        ctx.beginPath();
        ctx.rect(x, y, barW, h);
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(drawWave);
    };

    const id = setTimeout(() => drawWave(), 50); // aguarda o canvas estar no DOM
    return () => {
      clearTimeout(id);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isRecording]);

  const handleStartRecording = async () => {
    try {
      console.log('[REC] Solicitando microfone...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      console.log('[REC] Stream obtido, tracks:', stream.getAudioTracks().length);

      if (stream.getAudioTracks().length === 0) {
        throw new Error('Nenhuma track de áudio encontrada no stream');
      }

      // Escolher mimeType suportado
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg', '']
        .find(t => t === '' || MediaRecorder.isTypeSupported(t)) ?? '';
      console.log('[REC] mimeType escolhido:', mimeType || '(padrão do browser)');

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.onerror = (e) => {
        console.error('[REC] MediaRecorder error:', e);
        toast({ title: "Erro na gravação", description: "Ocorreu um erro durante a gravação.", variant: "destructive" });
      };

      recorder.ondataavailable = (e) => {
        console.log('[REC] ondataavailable, size:', e.data.size);
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        console.log('[REC] onstop, chunks:', audioChunksRef.current.length);
        audioCtxRef.current?.close();
        stream.getTracks().forEach(t => t.stop());
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

        if (audioChunksRef.current.length === 0) {
          toast({ title: "Áudio vazio", description: "Nenhum dado foi capturado. Tente novamente.", variant: "destructive" });
          setRecordingTime(0);
          return;
        }

        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        console.log('[REC] blob size:', blob.size, 'type:', blob.type);
        const previewUrl = URL.createObjectURL(blob);
        const reader = new FileReader();
        reader.onloadend = () => {
          setMediaAttachment({
            base64: reader.result as string,
            mimetype: recorder.mimeType || 'audio/webm',
            filename: 'audio.webm',
            type: 'audio',
            preview: previewUrl,
          });
        };
        reader.readAsDataURL(blob);
        setRecordingTime(0);
      };

      // AnalyserNode para waveform visual (independente da gravação)
      try {
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        analyserRef.current = analyser;
        audioCtxRef.current = audioCtx;
      } catch (vizErr) {
        console.warn('[REC] Waveform visual indisponível:', vizErr);
        // Continua sem waveform visual
      }

      mediaRecorderRef.current = recorder;
      recorder.start(100);
      console.log('[REC] Gravação iniciada, state:', recorder.state);
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (err) {
      console.error('[REC] Erro ao iniciar gravação:', err);
      toast({ title: "Sem acesso ao microfone", description: "Verifique as permissões no navegador e tente novamente.", variant: "destructive" });
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFiltersChange = (newFilters: { stages: string[], tags: string[], direction: string[], client: string }) => {
    setFilters(newFilters);
  };

  const filteredConversations = conversations.filter(conversation => {
    const matchesSearch = (conversation.contact_name || conversation.phone).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClient = !filters.client || (conversation.contact_name || "").toLowerCase().includes(filters.client.toLowerCase());
    const matchesStages = filters.stages.length === 0 || filters.stages.includes(conversation.stage || "");
    
    // Tratamento especial para grupos: se o filtro 'Grupos' ou 'Grupo' estiver ativo, 
    // deve mostrar conversas que são grupos (is_group === true) MESMO que não tenham a tag no banco.
    const hasGroupFilter = filters.tags.includes("Grupos") || filters.tags.includes("Grupo");
    const matchesTags = filters.tags.length === 0 || 
                       filters.tags.includes(conversation.tag || "") || 
                       (hasGroupFilter && conversation.is_group);
                       
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
      <div className="space-y-6 md:space-y-8 animate-fade-in relative flex flex-col h-[calc(100vh-48px)]">
        <ConversationsHeader onNewConversation={() => setIsNewConversationModalOpen(true)} />
        <div className="w-full flex-1 flex items-center justify-center min-h-0">
          <div className="text-white/40">Carregando conversas...</div>
        </div>
      </div>
    );
  }

  const cardHeightClasses = "h-full";

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in relative flex flex-col h-[calc(100vh-48px)]">
      <ConversationsHeader onNewConversation={() => setIsNewConversationModalOpen(true)} />

      {/* CONTEÚDO DA PÁGINA (Grid de conversas e chat) */}
      <div className="w-full flex-1 flex flex-col min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0 relative">
          {/* Lista de Conversas */}
          <div className="lg:col-span-1 relative h-full">
            <LiquidGlass className={`border-white/[0.05] rounded-xl shadow-2xl absolute inset-0`}>
              <div className="absolute inset-0 p-4 flex flex-col min-h-0">
                <div className="flex items-center justify-between gap-2 mb-4 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white tracking-tight">Conversas ({filteredConversations.length})</h3>
                  </div>
                  
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      onClick={() => setIsFiltersOpen(true)}
                      variant="ghost"
                      size="icon"
                      className={`h-9 w-9 rounded-lg border border-white/5 transition-all ${hasActiveFilters ? 'bg-primary text-white border-primary' : 'bg-white/5 text-white/40'}`}
                    >
                      <Filter className="w-4 h-4" />
                    </Button>
                  </motion.div>
                </div>

                <div className="relative mb-3 flex-shrink-0">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                  <Input
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9 bg-white/[0.02] border-white/5 text-white text-xs placeholder:text-white/20 rounded-lg focus:border-primary/30"
                  />
                </div>

                {/* Quick Tags Filter */}
                <div className="flex gap-1.5 mb-4 flex-shrink-0 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {formalTags.map(tag => {
                    const isActive = filters.tags.includes(tag.name);
                    return (
                      <motion.div
                        key={tag.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Badge
                          onClick={() => {
                            setFilters(prev => ({
                              ...prev,
                              tags: isActive 
                                ? prev.tags.filter(t => t !== tag.name)
                                : [...prev.tags, tag.name]
                            }));
                          }}
                          className={`cursor-pointer text-[10px] px-2.5 h-6 rounded-full border transition-all whitespace-nowrap flex items-center justify-center ${
                            isActive 
                              ? 'bg-primary text-white border-primary shadow-[0_0_10px_rgba(104,41,192,0.3)]' 
                              : 'bg-white/5 text-white/40 border-white/5 hover:border-white/10 hover:text-white/60'
                          }`}
                        >
                          <span className="translate-y-[1px] leading-none">{tag.name}</span>
                        </Badge>
                      </motion.div>
                    );
                  })}
                </div>

                {filteredConversations.length === 0 ? (
                  <div className="text-center py-8 flex-1 flex items-center justify-center">
                    <div>
                      <div className="w-16 h-16 bg-white/[0.03] flex items-center justify-center rounded-2xl mx-auto mb-4 border border-white/5">
                        <MessageSquare className="w-8 h-8 text-white/20" />
                      </div>
                      <p className="text-white/40 mb-4">Nenhuma conversa encontrada</p>
                      <motion.div
                        whileHover={{ scale: 1.05, translateY: -2 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      >
                        <Button
                          onClick={() => setIsNewConversationModalOpen(true)}
                          className="h-11 px-6 text-sm bg-primary hover:bg-primary/90 text-white shadow-[0_0_15px_rgba(104,41,192,0.4)] rounded-xl transition-all font-bold"
                        >
                          Iniciar Nova Conversa
                        </Button>
                      </motion.div>
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
                        <div className="flex items-start gap-3 mb-2">
                          <Avatar className="w-10 h-10 border border-white/10">
                            <AvatarImage src={conversation.contact_photo} alt={conversation.contact_name} />
                            <AvatarFallback className="bg-white/[0.05] text-white/40">
                              {conversation.is_group ? <Users className="w-5 h-5" /> : <User className="w-5 h-5" />}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="text-white font-medium text-sm truncate flex items-center gap-1.5">
                                {conversation.is_group && <Users className="w-3 h-3 text-primary" />}
                                {conversation.contact_name || conversation.phone}
                              </h4>
                              {(conversation.unread_count || 0) > 0 && (
                                <Badge className="bg-green-500 text-white text-[10px] min-w-[18px] h-4 flex items-center justify-center p-0">
                                  {conversation.unread_count}
                                </Badge>
                              )}
                            </div>
                            <p className="text-Porceli-gray-400 text-[11px] flex items-center gap-1">
                              {conversation.is_group ? "Grupo" : conversation.phone}
                            </p>
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
                        <Avatar className="w-12 h-12 border border-white/10 shadow-lg">
                          <AvatarImage src={selectedConversation.contact_photo} />
                          <AvatarFallback className="bg-white/[0.05] text-white/40 text-xl">
                            {selectedConversation.is_group ? <Users /> : <User />}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                             {selectedConversation.is_group && <Users className="w-4 h-4 text-primary" />}
                             {selectedConversation.contact_name || selectedConversation.phone}
                          </h3>
                          <p className="text-white/40 text-sm">{selectedConversation.is_group ? "Grupo de WhatsApp" : selectedConversation.phone}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto mb-3 px-2 flex flex-col gap-[3px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      {messages.map((message) => {
                        const isMine = isUserMessage(message);
                        const isAudio = message.media_type?.startsWith('audio/') || message.media_type === 'audioMessage';
                        const isImage = message.media_type?.startsWith('image/') || message.media_type === 'imageMessage';
                        const isVideo = message.media_type?.startsWith('video/');
                        const hasMedia = !!message.media_type;
                        const text = message.text || message.mensagem || '';
                        const showText = !!text
                          && !['Mídia enviada','Mensagem de voz','Audio Message','Video Message','Image Message'].includes(text)
                          && text !== (message.media_filename || '');
                        const time = formatTime(message.data_hora || message.created_at);
                        const bgColor = isMine ? '#6829c0' : 'rgba(255,255,255,0.09)';
                        const radius = isMine ? '12px 12px 3px 12px' : '12px 12px 12px 3px';

                        return (
                          <div key={message.id} className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`relative flex flex-col ${isMine ? 'bubble-sent' : 'bubble-received'}`}
                              style={{
                                maxWidth: isAudio ? '280px' : (isImage || isVideo) ? '240px' : '72%',
                                minWidth: isAudio ? '220px' : '72px',
                                width: (isImage || isVideo) ? 'fit-content' : undefined,
                                borderRadius: (isImage && !showText) ? '12px' : radius,
                                backgroundColor: bgColor,
                                boxShadow: '0 1px 2px rgba(0,0,0,0.35)',
                              }}
                            >
                              {/* Imagem — renderizada diretamente com o mesmo border-radius do bubble */}
                              {isImage && (() => {
                                const imgUrl = message.media_url || mediaBlobCache.current.get(message.id) || '';
                                const imgRadius = showText ? '12px 12px 0 0' : '12px';
                                return imgUrl ? (
                                  <img
                                    src={imgUrl}
                                    alt=""
                                    className="block w-full"
                                    style={{ borderRadius: imgRadius, display: 'block' }}
                                    onClick={() => window.open(imgUrl, '_blank')}
                                  />
                                ) : (
                                  <div className={`flex flex-col items-center justify-center h-32 gap-1 ${isMine ? 'bg-primary/20' : 'bg-white/[0.03]'}`}
                                    style={{ borderRadius: imgRadius }}>
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/30">
                                      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                                    </svg>
                                    <span className="text-white/30 text-xs">Foto arquivada</span>
                                  </div>
                                );
                              })()}

                              {/* Áudio */}
                              {isAudio && (() => {
                                const audioUrl = message.media_url || mediaBlobCache.current.get(message.id) || '';
                                return audioUrl ? (
                                  <div className="px-2 pt-2 pb-0">
                                    <AudioWavePreview src={audioUrl} />
                                  </div>
                                ) : (
                                  /* Áudio antigo sem URL disponível — placeholder estático */
                                  <div className="flex items-center gap-2 px-3 pt-2 pb-0 opacity-50">
                                    <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                        <polygon points="5,3 15,9 5,15" fill="white" />
                                      </svg>
                                    </div>
                                    <div className="flex-1 h-8 flex items-center">
                                      <div className="w-full h-0.5 bg-white/30 rounded-full" />
                                    </div>
                                    <span className="text-white/50 text-xs tabular-nums flex-shrink-0">—</span>
                                  </div>
                                );
                              })()}

                              {/* Vídeo e outros tipos de mídia */}
                              {hasMedia && !isAudio && !isImage && (
                                <div className="px-2 pt-2">
                                  <MessageMedia
                                    mediaType={message.media_type!}
                                    mediaUrl={message.media_url || mediaBlobCache.current.get(message.id) || ''}
                                    mediaFilename={message.media_filename || undefined}
                                    mediaSize={message.media_size || undefined}
                                    isUserMessage={isMine}
                                  />
                                </div>
                              )}

                              {/* Texto + horário em linha (mensagens curtas) ou separado */}
                              {showText ? (
                                <div className="px-3 pt-1.5 pb-1.5">
                                  <p className="text-white text-[14px] leading-[19px] break-words whitespace-pre-wrap">
                                    {text}
                                  </p>
                                  <div className="flex justify-end mt-0.5">
                                    <span className={`text-[11px] leading-none select-none ${isMine ? 'text-white/55' : 'text-white/35'}`}>
                                      {time}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                /* Só mídia — horário flutuante sobre o canto inferior */
                                <div className="flex justify-end px-2 pb-1.5 pt-1">
                                  <span className={`text-[11px] leading-none select-none ${isMine ? 'text-white/55' : 'text-white/35'}`}>
                                    {time}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex-shrink-0 space-y-2">
                      {/* Preview do anexo */}
                      {mediaAttachment && (
                        <div className="flex items-center gap-3 p-2.5 bg-white/[0.05] border border-white/10 rounded-xl">
                          {mediaAttachment.type === 'image' && mediaAttachment.preview && (
                            <img src={mediaAttachment.preview} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                          )}
                          {mediaAttachment.type === 'audio' && mediaAttachment.preview ? (
                            <AudioWavePreview src={mediaAttachment.preview} />
                          ) : (
                            <>
                              {mediaAttachment.type === 'audio' && (
                                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                                  <Mic className="w-5 h-5 text-primary" />
                                </div>
                              )}
                              {(mediaAttachment.type === 'video' || mediaAttachment.type === 'document') && (
                                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                                  <Paperclip className="w-5 h-5 text-white/60" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-xs font-medium truncate">{mediaAttachment.filename}</p>
                                <p className="text-white/40 text-[10px]">{mediaAttachment.mimetype}</p>
                              </div>
                            </>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => setMediaAttachment(null)}
                            className="h-7 w-7 rounded-lg hover:bg-white/10 text-white/40 flex-shrink-0">
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}

                      {/* Caixa de input estilo WhatsApp */}
                      <div
                        className={`flex items-center gap-1 px-2 rounded-2xl border ${isRecording ? 'bg-red-500/10' : 'bg-white/[0.05]'}`}
                        style={{ borderColor: isRecording ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)' }}
                      >
                        {/* Botão + (anexo) */}
                        {!isRecording && (
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={sendMessageMutation.isPending}
                            className="p-2 text-white/40 hover:text-white/80 transition-colors flex-shrink-0"
                          >
                            <Paperclip className="w-5 h-5" />
                          </button>
                        )}

                        {/* Indicador de gravação ou campo de texto */}
                        {isRecording ? (
                          <div className="flex-1 flex items-center gap-2 py-2 px-1">
                            <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
                            <canvas
                              ref={waveCanvasRef}
                              className="flex-1 h-7"
                              style={{ width: '100%' }}
                            />
                            <span className="text-red-400 text-xs tabular-nums flex-shrink-0">
                              {String(Math.floor(recordingTime / 60)).padStart(2, '0')}:{String(recordingTime % 60).padStart(2, '0')}
                            </span>
                          </div>
                        ) : (
                          <input
                            placeholder={mediaAttachment ? "Legenda (opcional)..." : "Digite uma mensagem"}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                            disabled={sendMessageMutation.isPending}
                            className="chat-input flex-1 bg-transparent border-none outline-none ring-0 focus:outline-none focus:ring-0 text-white text-sm placeholder:text-white/30 py-3.5 min-w-0"
                          />
                        )}

                        {/* Microfone (sem texto) ou Enviar (com texto/mídia) ou Parar gravação */}
                        <motion.button
                          key={isRecording ? 'stop' : (newMessage.trim() || mediaAttachment) ? 'send' : 'mic'}
                          initial={{ scale: 0.7, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 20 }}
                          onClick={
                            isRecording ? handleStopRecording
                            : (newMessage.trim() || mediaAttachment) ? handleSendMessage
                            : handleStartRecording
                          }
                          disabled={sendMessageMutation.isPending}
                          className={`p-2.5 rounded-full flex-shrink-0 transition-colors ${
                            isRecording
                              ? 'text-red-400 hover:text-red-300'
                              : (newMessage.trim() || mediaAttachment)
                                ? 'text-primary hover:text-primary/80'
                                : 'text-white/40 hover:text-white/80'
                          }`}
                        >
                          {isRecording
                            ? <Square className="w-5 h-5" />
                            : (newMessage.trim() || mediaAttachment)
                              ? <Send className="w-5 h-5" />
                              : <Mic className="w-5 h-5" />
                          }
                        </motion.button>
                      </div>

                      {/* Input de arquivo oculto */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                        onChange={handleFileSelect}
                      />
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

import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, RefreshCw, ExternalLink, BookOpen, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GoogleEvent {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  htmlLink?: string;
  status?: string;
  colorId?: string;
}

interface NotionTask {
  id: string;
  title: string;
  status?: string;
  dueDate?: string;
  time?: string;
  clients?: string[];
  responsible?: string[];
  url?: string;
  lastEdited?: string;
}

const EVENT_COLORS: Record<string, string> = {
  "1": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "2": "bg-green-500/20 text-green-300 border-green-500/30",
  "3": "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "4": "bg-pink-500/20 text-pink-300 border-pink-500/30",
  "5": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "6": "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "7": "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  default: "bg-primary/20 text-purple-300 border-primary/30",
};

const MONTHS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];
const DAYS_OF_WEEK = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [googleEvents, setGoogleEvents] = useState<GoogleEvent[]>([]);
  const [notionTasks, setNotionTasks] = useState<NotionTask[]>([]);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [notionConnected, setNotionConnected] = useState(false);
  const [notionDatabaseId, setNotionDatabaseId] = useState("");
  const [showNotionInput, setShowNotionInput] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingNotion, setLoadingNotion] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [connectingNotion, setConnectingNotion] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  
  // States para novo evento
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventTime, setNewEventTime] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [createMeetLink, setCreateMeetLink] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);

  const { toast } = useToast();

  const CARD = "liquid-glass dashboard-glow border-white/[0.05]";

  // Verificar params de retorno do OAuth (Google e Notion)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "google") {
      toast({ title: "✅ Google Calendar conectado!" });
      window.history.replaceState({}, "", window.location.pathname);
      fetchGoogleEvents();
    }
    if (params.get("connected") === "notion") {
      toast({ title: "✅ Notion conectado!" });
      window.history.replaceState({}, "", window.location.pathname);
      fetchNotionTasks();
    }
    if (params.get("error")) {
      toast({ title: "Erro ao conectar", description: params.get("error") ?? "", variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const fetchGoogleEvents = useCallback(async () => {
    setLoadingGoogle(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

      const { data, error } = await supabase.functions.invoke("google-calendar-events", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: null,
      });

      if (error) throw error;

      if (data?.connected) {
        setGoogleConnected(true);
        // Filtrar eventos do mês atual
        const monthEvents = (data.events ?? []).filter((e: GoogleEvent) => {
          const d = new Date(e.start);
          return d >= startOfMonth && d <= endOfMonth;
        });
        setGoogleEvents(monthEvents);
      } else {
        setGoogleConnected(false);
      }
    } catch (err: any) {
      console.error("Erro ao buscar eventos:", err);
    } finally {
      setLoadingGoogle(false);
    }
  }, [currentDate]);

  const handleCreateGoogleEvent = async (isGlobal = false) => {
    if (!isGlobal && !selectedDay) return;
    if (isGlobal && !newEventDate) {
      toast({ title: "Selecione uma data", variant: "destructive" });
      return;
    }
    if (!newEventTitle.trim()) return;
    
    setCreatingEvent(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      let startDateTime = "";
      
      if (isGlobal) {
        const timeStr = newEventTime || "12:00"; 
        startDateTime = `${newEventDate}T${timeStr}:00-03:00`;
      } else {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDay).padStart(2, '0');
        const timeStr = newEventTime || "12:00";
        startDateTime = `${year}-${month}-${day}T${timeStr}:00-03:00`;
      }
      
      // Assumindo 1 hora de duração padrão
      const endDate = new Date(new Date(startDateTime).getTime() + 60 * 60 * 1000);
      const endDateTime = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}T${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}:00-03:00`;

      const { error } = await supabase.functions.invoke("google-calendar-events", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          action: "CREATE_EVENT",
          title: newEventTitle,
          start: startDateTime,
          end: endDateTime,
          createMeetLink
        },
      });

      if (error) throw error;

      toast({ title: "Evento criado com sucesso no Google Calendar!" });
      setNewEventTitle("");
      setNewEventTime("");
      setCreateMeetLink(false);
      
      if (isGlobal) {
        setNewEventDate("");
        setIsCreateModalOpen(false);
      }
      
      fetchGoogleEvents(); // Atualiza a lista
    } catch (err: any) {
      toast({ title: "Erro ao criar evento", description: err.message, variant: "destructive" });
    } finally {
      setCreatingEvent(false);
    }
  };

  const fetchNotionTasks = useCallback(async (databaseId?: string) => {
    setLoadingNotion(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("notion-tasks", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        method: databaseId ? "POST" : "GET",
        body: databaseId ? { database_id: databaseId } : null,
      });

      if (error) throw error;

      if (data?.connected) {
        setNotionConnected(true);
        setNotionTasks(data.tasks ?? []);
        if (data.message === 'database_id não configurado' && !databaseId) {
          setShowNotionInput(true);
        }
      } else {
        setNotionConnected(false);
      }
    } catch (err: any) {
      console.error("Erro Notion:", err);
    } finally {
      setLoadingNotion(false);
    }
  }, []);

  const handleConnectNotion = async () => {
    setConnectingNotion(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast({ title: "Faça login primeiro", variant: "destructive" }); return; }

      const { data, error } = await supabase.functions.invoke("notion-auth", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Erro ao conectar Notion", description: err.message, variant: "destructive" });
    } finally {
      setConnectingNotion(false);
    }
  };

  useEffect(() => {
    fetchGoogleEvents();
    fetchNotionTasks();
  }, []);

  useEffect(() => {
    if (googleConnected) fetchGoogleEvents();
  }, [currentDate]);

  const handleConnectGoogle = async () => {
    setConnectingGoogle(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast({ title: "Faça login primeiro", variant: "destructive" }); return; }

      const { data, error } = await supabase.functions.invoke("google-calendar-auth", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Erro ao iniciar autenticação", description: err.message, variant: "destructive" });
    } finally {
      setConnectingGoogle(false);
    }
  };

  const handleSaveNotionDatabase = async () => {
    if (!notionDatabaseId.trim()) {
      toast({ title: "Cole o ID do banco do Notion", variant: "destructive" });
      return;
    }
    // Limpar ID (pode vir como URL completa)
    const cleanId = notionDatabaseId
      .replace("https://www.notion.so/", "")
      .replace("https://notion.so/", "")
      .split("?")[0]
      .split("#")[0]
      .replace(/-/g, "")
      .slice(-32);

    const formattedId = cleanId.length === 32
      ? `${cleanId.slice(0,8)}-${cleanId.slice(8,12)}-${cleanId.slice(12,16)}-${cleanId.slice(16,20)}-${cleanId.slice(20)}`
      : notionDatabaseId;

    await fetchNotionTasks(formattedId);
    setShowNotionInput(false);
  };

  // Helpers do calendário
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDay = (y: number, m: number) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDay = getFirstDay(currentDate.getFullYear(), currentDate.getMonth());

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const getEventsForDay = (day: number) => {
    return googleEvents.filter((e) => {
      const d = new Date(e.start);
      return d.getDate() === day &&
             d.getMonth() === currentDate.getMonth() &&
             d.getFullYear() === currentDate.getFullYear();
    });
  };

  const getNotionTasksForDay = (day: number) => {
    return notionTasks.filter((t) => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate + "T12:00:00");
      return d.getDate() === day &&
             d.getMonth() === currentDate.getMonth() &&
             d.getFullYear() === currentDate.getFullYear();
    });
  };

  const getEventColor = (colorId?: string) =>
    EVENT_COLORS[colorId ?? "default"] ?? EVENT_COLORS.default;

  const formatTime = (isoStr: string) => {
    if (!isoStr.includes("T")) return "Dia inteiro";
    return new Date(isoStr).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const upcomingEvents = googleEvents
    .filter((e) => new Date(e.start) >= new Date())
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 5);

  const pendingTasks = notionTasks.filter((t) =>
    !t.status || !["done", "concluído", "concluido", "completed"].includes(t.status.toLowerCase())
  ).slice(0, 5);

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold text-white tracking-tight">Calendário</h1>
          <p className="text-goat-gray-400">Gerencie seus compromissos e prazos.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Botão Google Calendar */}
          {!googleConnected ? (
            <button
              onClick={handleConnectGoogle}
              disabled={connectingGoogle}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-all duration-300 text-sm disabled:opacity-60"
            >
              {connectingGoogle ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1.086 14.324l-3.456-3.456 1.414-1.414 2.042 2.042 4.292-4.292 1.414 1.414-5.706 5.706z"/>
                </svg>
              )}
              Conectar Google Calendar
            </button>
          ) : (
            <button
              onClick={fetchGoogleEvents}
              disabled={loadingGoogle}
              className="flex items-center gap-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 px-4 py-2 rounded-xl transition-all duration-300 text-sm border border-green-600/30"
            >
              {loadingGoogle ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Google Calendar
            </button>
          )}

          {/* Botão Notion */}
          {!notionConnected ? (
            <button
              onClick={handleConnectNotion}
              disabled={connectingNotion}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white px-4 py-2 rounded-xl transition-all duration-300 text-sm border border-white/20 disabled:opacity-60"
            >
              {connectingNotion ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
              Conectar Notion
            </button>
          ) : (
            <button
              onClick={fetchNotionTasks}
              disabled={loadingNotion}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white px-4 py-2 rounded-xl transition-all duration-300 text-sm border border-white/20"
            >
              {loadingNotion ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Notion
            </button>
          )}

          <button 
             onClick={() => setIsCreateModalOpen(true)}
             className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(104,41,192,0.3)] text-sm"
          >
            <Plus className="w-4 h-4" />
            Novo Evento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Calendário Principal */}
        <Card className={`${CARD} xl:col-span-3 p-6`}>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-semibold text-white">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/60 hover:text-white"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1 text-sm hover:bg-white/5 rounded-lg transition-colors text-white/60 hover:text-white border border-white/10"
              >
                Hoje
              </button>
              <button
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/60 hover:text-white"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {loadingGoogle && (
            <div className="flex items-center justify-center py-4 gap-2 text-goat-gray-400 text-sm mb-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              Sincronizando eventos...
            </div>
          )}

          <div className="grid grid-cols-7 gap-px bg-white/5 rounded-xl overflow-hidden border border-white/5">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="bg-[#1a1a1a] p-4 text-center text-xs font-medium text-goat-gray-400 uppercase tracking-wider">
                {day}
              </div>
            ))}
            {days.map((day, idx) => {
              const dayEvents = day ? getEventsForDay(day) : [];
              const dayTasks = day ? getNotionTasksForDay(day) : [];
              const isToday =
                day === new Date().getDate() &&
                currentDate.getMonth() === new Date().getMonth() &&
                currentDate.getFullYear() === new Date().getFullYear();

              const allItems = [
                ...dayEvents.map(e => ({ type: 'google' as const, id: e.id, title: e.title, time: !e.allDay ? e.start : undefined, color: getEventColor(e.colorId), url: e.htmlLink })),
                ...dayTasks.map(t => ({ type: 'notion' as const, id: t.id, title: t.title, time: undefined, color: 'bg-white/10 text-white/90 border-white/20 hover:bg-white/20', url: t.url }))
              ];

              return (
                <div
                  key={idx}
                  onClick={() => day && setSelectedDay(day)}
                  className={`min-h-[120px] bg-[#121212] p-2 border-t border-white/5 transition-colors hover:bg-white/[0.04] ${day ? "cursor-pointer" : "opacity-20 cursor-default"}`}
                >
                  {day && (
                    <div className="flex flex-col h-full">
                      <span className={`text-sm font-medium ${
                        isToday
                          ? "bg-primary text-white w-7 h-7 flex items-center justify-center rounded-full shadow-[0_0_10px_rgba(104,41,192,0.5)]"
                          : "text-goat-gray-300 p-1"
                      }`}>
                        {day}
                      </span>
                      <div className="mt-2 space-y-1">
                        {allItems.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            title={item.title}
                            className={`text-[10px] p-1.5 rounded-md border truncate cursor-pointer ${item.color} flex items-center gap-1`}
                            onClick={(e) => {
                              if (item.url) {
                                e.stopPropagation();
                                window.open(item.url, "_blank");
                              }
                            }}
                          >
                            {item.type === 'notion' && (
                              <BookOpen className="w-2.5 h-2.5 opacity-70 flex-shrink-0" />
                            )}
                            {item.time && (
                              <span className="opacity-70 mr-0.5">{formatTime(item.time)}</span>
                            )}
                            <span className="truncate">{item.title}</span>
                          </div>
                        ))}
                        {allItems.length > 3 && (
                          <div className="text-[10px] text-goat-gray-400 pl-1 mt-1 font-medium">
                            +{allItems.length - 3} mais
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Próximos Eventos */}
          <Card className={`${CARD} p-5`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Próximos Eventos</h3>
              {googleConnected && (
                <span className="flex items-center gap-1 text-xs text-green-400">
                  <CheckCircle2 className="w-3 h-3" /> Google
                </span>
              )}
            </div>

            {!googleConnected ? (
              <div className="text-center py-4">
                <AlertCircle className="w-8 h-8 text-goat-gray-500 mx-auto mb-2" />
                <p className="text-sm text-goat-gray-400">Conecte o Google Calendar para ver seus eventos</p>
              </div>
            ) : upcomingEvents.length === 0 ? (
              <p className="text-sm text-goat-gray-400 text-center py-4">Nenhum evento próximo</p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className={`p-2 rounded-lg ${getEventColor(event.colorId).split(" ")[0]}`}>
                      <CalendarIcon className="w-4 h-4 text-white/70" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{event.title}</p>
                      <p className="text-xs text-goat-gray-400">
                        {new Date(event.start).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
                        {!event.allDay && `, ${formatTime(event.start)}`}
                      </p>
                    </div>
                    {event.htmlLink && (
                      <a href={event.htmlLink} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3 text-goat-gray-500 hover:text-white transition-colors" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Tarefas Notion */}
          <Card className={`${CARD} p-5`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Tarefas Notion</h3>
              <div className="flex items-center gap-2">
                {notionConnected && (
                  <button onClick={() => fetchNotionTasks()} disabled={loadingNotion}>
                    <RefreshCw className={`w-3 h-3 text-goat-gray-500 hover:text-white transition-colors ${loadingNotion ? "animate-spin" : ""}`} />
                  </button>
                )}
                {notionConnected && (
                  <span className="flex items-center gap-1 text-xs text-white/60">
                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                  </span>
                )}
              </div>
            </div>

            {!notionConnected ? (
              <div className="text-center py-4">
                <BookOpen className="w-8 h-8 text-goat-gray-500 mx-auto mb-2" />
                <p className="text-sm text-goat-gray-400 mb-3">
                  Conecte um banco do Notion para ver suas tarefas
                </p>
                <button
                  onClick={handleConnectNotion}
                  disabled={connectingNotion}
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  {connectingNotion ? "Conectando..." : "Conectar Notion →"}
                </button>
              </div>
            ) : showNotionInput ? (
              <div className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-xs text-white/60">Configure o ID do banco de dados do Notion:</p>
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={notionDatabaseId}
                    onChange={(e) => setNotionDatabaseId(e.target.value)}
                    placeholder="URL ou ID do banco"
                    className="bg-black/20 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-primary/50"
                  />
                  <button
                    onClick={handleSaveNotionDatabase}
                    disabled={loadingNotion}
                    className="bg-primary hover:bg-primary/90 text-white rounded-lg p-2 text-xs font-bold flex items-center justify-center transition-all disabled:opacity-50"
                  >
                    {loadingNotion ? <Loader2 className="w-3 h-3 animate-spin"/> : "Sincronizar"}
                  </button>
                </div>
              </div>
            ) : loadingNotion ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-goat-gray-400" />
              </div>
            ) : pendingTasks.length === 0 ? (
              <p className="text-sm text-goat-gray-400 text-center py-4">Nenhuma tarefa pendente</p>
            ) : (
              <div className="space-y-2">
                {pendingTasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-2 p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      task.status === "Concluído" ? "bg-green-400" :
                      task.status === "Em andamento" ? "bg-blue-400" : "bg-primary"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {task.dueDate && (
                          <span className="text-[10px] text-goat-gray-400">
                            {new Date(task.dueDate + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })}
                            {task.time && ` • ${task.time}`}
                          </span>
                        )}
                        {task.clients && task.clients.length > 0 && (
                          <span className="text-[10px] text-primary/80 truncate">{task.clients[0]}</span>
                        )}
                      </div>
                    </div>
                    {task.url && (
                      <a href={task.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3 text-goat-gray-500 hover:text-white transition-colors flex-shrink-0" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Modal do Dia Selecionado */}
      <Dialog open={selectedDay !== null} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="sm:max-w-[500px] bg-[#121212] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" />
              {selectedDay} de {MONTHS[currentDate.getMonth()]} de {currentDate.getFullYear()}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {selectedDay && (() => {
              const dayEvents = getEventsForDay(selectedDay);
              const dayTasks = getNotionTasksForDay(selectedDay);

              const allItems = [
                ...dayEvents.map(e => ({ 
                   type: 'google' as const, 
                   id: e.id, 
                   title: e.title, 
                   time: !e.allDay ? e.start : undefined, 
                   color: getEventColor(e.colorId).split(' ')[0] || 'bg-primary/20', 
                   url: e.htmlLink,
                   status: undefined 
                })),
                ...dayTasks.map(t => ({ 
                   type: 'notion' as const, 
                   id: t.id, 
                   title: t.title, 
                   time: t.dueDate && t.time && t.time !== '00:00' ? `${t.dueDate}T${t.time}` : undefined, 
                   color: 'bg-white/10', 
                   url: t.url, 
                   status: t.status 
                }))
              ];

              // Ordenar: Com hora primeiro, sem hora por último
              const sortedItems = allItems.sort((a, b) => {
                if (a.time && b.time) {
                  return new Date(a.time).getTime() - new Date(b.time).getTime();
                }
                if (a.time) return -1;
                if (b.time) return 1;
                return 0;
              });

              if (sortedItems.length === 0) {
                return <p className="text-sm text-goat-gray-400 text-center py-6">Nenhum evento neste dia.</p>;
              }

              return sortedItems.map((item) => (
                <div key={item.id} className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5 relative group hover:bg-white/10 transition-colors">
                  <div className={`p-2.5 rounded-xl ${item.color}`}>
                     {item.type === 'notion' ? <BookOpen className="w-5 h-5 text-white/70" /> : <CalendarIcon className="w-5 h-5 text-white/70" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm md:text-base font-medium text-white break-words pr-8">{item.title}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {item.time && (
                         <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-md">
                           {formatTime(item.time)}
                         </span>
                      )}
                      {item.status && (
                          <span className="text-[10px] text-teal-400 font-medium bg-teal-400/10 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            {item.status}
                          </span>
                      )}
                    </div>
                  </div>
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100">
                      <ExternalLink className="w-4 h-4 text-goat-gray-400 hover:text-white" />
                    </a>
                  )}
                </div>
              ));
            })()}
          </div>
          
          {/* Formulário de novo evento dentro do modal */}
          {googleConnected && (
            <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
              <h4 className="text-sm font-medium text-white/80">Adicionar Evento no Google Calendar</h4>
              <div className="flex flex-col sm:flex-row gap-2">
                <input 
                  type="text" 
                  placeholder="Título do evento (ex: Reunião)" 
                  className="flex-1 bg-black/20 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-primary/50"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateGoogleEvent()}
                />
                <input
                  type="time"
                  className="bg-black/20 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-primary/50 w-full sm:w-auto"
                  value={newEventTime}
                  onChange={(e) => setNewEventTime(e.target.value)}
                />
                <button 
                  disabled={creatingEvent || !newEventTitle.trim()}
                  onClick={() => handleCreateGoogleEvent(false)}
                  className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-xl px-4 py-2 text-sm font-bold flex items-center justify-center transition-all shrink-0"
                >
                  {creatingEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : "Adicionar"}
                </button>
              </div>
              <div className="flex items-center pt-1">
                <label className="flex items-center gap-2 text-xs text-goat-gray-400 cursor-pointer hover:text-white transition-colors">
                  <input
                     type="checkbox"
                     className="w-3.5 h-3.5 rounded border-white/20 bg-black/50 text-primary accent-primary focus:ring-primary/50 focus:ring-offset-0"
                     checked={createMeetLink}
                     onChange={(e) => setCreateMeetLink(e.target.checked)}
                  />
                  Gerar link do Google Meet?
                </label>
              </div>
            </div>
          )}
          {!googleConnected && selectedDay !== null && (
            <div className="mt-4 pt-4 border-t border-white/10 text-center">
              <p className="text-xs text-goat-gray-400">Conecte seu Google Calendar para adicionar eventos diretamente por aqui.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Global de Novo Evento */}
      <Dialog open={isCreateModalOpen} onOpenChange={(open) => !open && setIsCreateModalOpen(false)}>
        <DialogContent className="sm:max-w-[450px] bg-[#121212] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
               <Plus className="w-5 h-5 text-primary" />
               Criar Novo Evento
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4 space-y-4">
             {googleConnected ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-goat-gray-300 uppercase tracking-wider">Título do Evento</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Reunião com Cliente" 
                      className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-primary/50"
                      value={newEventTitle}
                      onChange={(e) => setNewEventTitle(e.target.value)}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-goat-gray-300 uppercase tracking-wider">Data</label>
                      <input 
                        type="date" 
                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-primary/50"
                        value={newEventDate}
                        onChange={(e) => setNewEventDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-goat-gray-300 uppercase tracking-wider">Hora</label>
                      <input 
                        type="time" 
                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-primary/50"
                        value={newEventTime}
                        onChange={(e) => setNewEventTime(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="flex items-center gap-2 text-sm text-white cursor-pointer group">
                      <div className="relative flex items-center justify-center w-5 h-5">
                        <input
                           type="checkbox"
                           className="peer absolute w-full h-full opacity-0 cursor-pointer"
                           checked={createMeetLink}
                           onChange={(e) => setCreateMeetLink(e.target.checked)}
                        />
                        <div className="w-full h-full rounded border-2 border-white/20 bg-black/50 peer-checked:bg-primary peer-checked:border-primary transition-all flex items-center justify-center">
                           {createMeetLink && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </div>
                      <span className="group-hover:text-primary transition-colors">Adicionar videoconferência do Google Meet</span>
                    </label>
                  </div>

                  <div className="pt-4 mt-2 border-t border-white/10 flex justify-end gap-3">
                    <button
                      onClick={() => setIsCreateModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-sm font-medium text-white/70 hover:bg-white/5 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      disabled={creatingEvent || !newEventTitle.trim() || !newEventDate}
                      onClick={() => handleCreateGoogleEvent(true)}
                      className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/25 disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                       {creatingEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Evento"}
                    </button>
                  </div>
                </>
             ) : (
                <div className="text-center py-6">
                   <AlertCircle className="w-10 h-10 text-goat-gray-400 mx-auto mb-3" />
                   <p className="text-sm text-white">Você precisa conectar seu Google Calendar</p>
                   <p className="text-xs text-goat-gray-400 mt-1 mb-4">Para criar eventos diretamente por aqui, habilite a integração.</p>
                   <button 
                     onClick={handleConnectGoogle}
                     className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors inline-block"
                   >
                     Conectar agora
                   </button>
                </div>
             )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

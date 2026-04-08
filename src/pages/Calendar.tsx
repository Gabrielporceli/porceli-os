import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  RefreshCw, 
  ExternalLink, 
  BookOpen, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Trash2,
  Edit,
  Clock,
  MoreVertical,
  CheckCircle,
  Save,
  Lock,
  Unlock,
  Repeat,
  Tag
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { parseISO, format } from "date-fns";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GoogleEvent {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  htmlLink?: string;
  hangoutLink?: string;
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
  recurrence?: string;
  url?: string;
  lastEdited?: string;
}

const TASK_COLORS: Record<string, string> = {
  purple: "bg-primary/20 text-purple-300 border-primary/30",
  blue:   "bg-blue-500/20 text-blue-300 border-blue-500/30",
  green:  "bg-green-500/20 text-green-300 border-green-500/30",
  orange: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  pink:   "bg-pink-500/20 text-pink-300 border-pink-500/30",
};

function nextOccurrence(date: string, type: "weekly" | "biweekly" | "monthly"): string {
  const d = new Date(date + "T12:00:00");
  if (type === "weekly") d.setDate(d.getDate() + 7);
  else if (type === "biweekly") d.setDate(d.getDate() + 14);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().split("T")[0];
}

const toDateKey = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

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
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([]);
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
  const [newEventClient, setNewEventClient] = useState("");
  const [recurrenceType, setRecurrenceType] = useState<"" | "single" | "weekly" | "biweekly" | "monthly">("");
  const [taskColor, setTaskColor] = useState("purple");
  const [createAsCRMTask, setCreateAsCRMTask] = useState(false);

  const { toast } = useToast();

  const [isEditActivityModalOpen, setIsEditActivityModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{ id: string; type: 'google' | 'notion' | 'crm'; title: string; time?: string; status?: string; recurrence_type?: string; client?: string; color?: string; description?: string; due_date?: string; due_time?: string } | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [dbStatus, setDbStatus] = useState<"checking" | "ok" | "error">("checking");
  const [dbError, setDbError] = useState("");

  const checkDb = async () => {
    console.log("Checando banco...");
    try {
      const { data, error } = await supabase.from('recurring_tasks').select('id').limit(1);
      if (error) {
        setDbStatus("error");
        setDbError(error.message);
      } else {
        setDbStatus("ok");
      }
    } catch (e: any) {
      setDbStatus("error");
      setDbError(e.message);
    }
  };

  useEffect(() => {
    console.log("Calendário montado com sucesso!");
    checkDb();
  }, []);

  const handleTestInsert = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { error } = await supabase.from('recurring_tasks').insert({
        user_id: session.user.id,
        title: "TESTE RAPIDO",
        due_date: new Date().toISOString().split('T')[0],
        status: 'pending'
      });
      if (!error) fetchRecurringTasks();
    } catch (e: any) {
      console.error(e);
    }
  };
  const [editDate, setEditDate] = useState<Date | undefined>(undefined);
  const [editTime, setEditTime] = useState("");
  const [lockedDays, setLockedDays] = useState<string[]>(() => {
    const saved = localStorage.getItem('locked_days');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('locked_days', JSON.stringify(lockedDays));
  }, [lockedDays]);

  const isDayLocked = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return lockedDays.includes(dateStr);
  };

  const toggleLockDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (lockedDays.includes(dateStr)) {
      setLockedDays(lockedDays.filter(d => d !== dateStr));
    } else {
      setLockedDays([...lockedDays, dateStr]);
    }
  };

  useEffect(() => {
    if (editingItem) {
      setEditTitle(editingItem.title);
      setEditDate(editingItem.time ? new Date(editingItem.time) : undefined);
      setEditTime(editingItem.time ? format(new Date(editingItem.time), "HH:mm") : "");
    }
  }, [editingItem]);

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

  const checkConflicts = (start: string, currentEventId?: string) => {
    const newStart = new Date(start);
    const newEnd = new Date(newStart.getTime() + 60 * 60 * 1000); // 1h duration

    return googleEvents.some(event => {
      if (event.id === currentEventId) return false;
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      return newStart < eventEnd && newEnd > eventStart;
    });
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    if (editingItem.type === 'google' && !editTime) {
      toast({ title: "Selecione um horário", description: "Eventos do Google Calendar precisam de um horário.", variant: "destructive" });
      return;
    }

    const newStart = editDate ? new Date(editDate) : new Date();
    if (editTime) {
      const [h, m] = editTime.split(':');
      newStart.setHours(parseInt(h), parseInt(m));
    }

    if (editingItem.type === 'google') {
      await handleUpdateGoogleEvent(editingItem.id, {
        title: editTitle,
        start: newStart.toISOString(),
      });
    } else if (editingItem.type === 'notion') {
      await handleUpdateNotionTask(editingItem.id, {
        title: editTitle,
        dueDate: editTime ? `${format(newStart, "yyyy-MM-dd")}T${editTime}:00-03:00` : format(newStart, "yyyy-MM-dd"),
      });
    }

    setIsEditActivityModalOpen(false);
    setEditingItem(null);
  };

  const handleDeleteActivity = async () => {
    if (!editingItem) return;
    setIsDeleteDialogOpen(true);
  };



  const confirmDeleteActivity = async () => {
    if (!editingItem) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      if (editingItem.type === 'google') {
        const { error } = await supabase.functions.invoke("google-calendar-events", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: {
            action: 'DELETE_EVENT',
            eventId: editingItem.id,
          },
        });
        if (error) throw error;
        toast({ title: "Evento excluído com sucesso!" });
        fetchGoogleEvents();
      } else if (editingItem.type === 'notion') {
        const { error } = await supabase.functions.invoke("notion-tasks", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: {
            action: "DELETE_TASK",
            task_id: editingItem.id,
          },
        });
        if (error) throw error;
        toast({ title: "Tarefa excluída do Notion!" });
        fetchNotionTasks();
      }

      setIsEditActivityModalOpen(false);
      setIsDeleteDialogOpen(false);
      setEditingItem(null);
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateGoogleEvent = async (eventId: string, updates: { title?: string; start?: string }) => {
    if (updates.start && checkConflicts(updates.start, eventId)) {
      if (!confirm("Já existe um compromisso neste horário. Deseja continuar mesmo assim?")) {
        return;
      }
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase.functions.invoke("google-calendar-events", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          action: 'UPDATE_EVENT',
          eventId,
          ...updates,
        },
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Evento reagendado com sucesso!",
      });
      fetchGoogleEvents();
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o evento.",
        variant: "destructive",
      });
    }
  };

  const handleCreateActivity = async (isGlobal: boolean = false) => {
    console.log("handleCreateActivity disparado!", { isGlobal, selectedDay, newEventTitle, createAsCRMTask });

    if (!isGlobal && selectedDay === null) {
      toast({ title: "Erro de Seleção", description: "Selecione um dia no calendário primeiro.", variant: "destructive" });
      return;
    }
    
    if (isGlobal && !newEventDate) {
      toast({ title: "Data obrigatória", description: "Por favor, selecione uma data.", variant: "destructive" });
      return;
    }

    if (!newEventTitle.trim()) {
      toast({ title: "Título obrigatório", description: "Dê um nome para sua atividade.", variant: "destructive" });
      return;
    }

    const dateToCheck = isGlobal ? newEventDate : `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    if (lockedDays.includes(dateToCheck)) {
      toast({ title: "Dia trancado", description: "Este dia está trancado para novas atividades.", variant: "destructive" });
      return;
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada. Faça login novamente.");

      let year, month, day;
      if (isGlobal) {
        if (!newEventDate) throw new Error("Data é obrigatória.");
        [year, month, day] = newEventDate.split('-').map(Number);
      } else {
        if (selectedDay === null) throw new Error("Dia não selecionado.");
        year = currentDate.getFullYear();
        month = currentDate.getMonth() + 1;
        day = selectedDay!;
      }

      const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const timeStr = newEventTime || "12:00";
      const startDateTime = `${dateStr}T${timeStr}:00-03:00`;

      let meetingLink = "";
      if (createMeetLink) {
        toast({ title: "Gerando link Google Meet..." });
        const googleTask = supabase.functions.invoke("google-calendar-events", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: {
            action: "CREATE_EVENT",
            title: newEventTitle,
            start: startDateTime,
            end: `${dateStr}T13:00:00-03:00`,
            createMeetLink: true
          },
        });

        const googleResponse = await Promise.race([
          googleTask,
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout Google")), 15000))
        ]) as any;

        if (googleResponse.error) throw new Error(`Google: ${googleResponse.error.message}`);
        meetingLink = googleResponse.data?.event?.hangoutLink || "";
      }

      const labels: Record<string, string> = { weekly: 'Semanal', biweekly: 'Quinzenal', monthly: 'Mensal' };
      const recLabel = recurrenceType !== 'none' ? labels[recurrenceType] : undefined;

      toast({ title: "Sincronizando com Notion..." });
      
      const { error: notionError } = await supabase.functions.invoke("notion-tasks", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          action: "CREATE_TASK",
          title: newEventTitle,
          dueDate: dateStr + (newEventTime ? `T${newEventTime}:00-03:00` : ""),
          client: newEventClient,
          recurrence: recLabel
        },
      });

      if (notionError) throw notionError;

      toast({ title: "Tarefa criada no Notion!" });
      fetchNotionTasks();

      setNewEventTitle("");
      setNewEventTime("");
      setNewEventClient("");
      setCreateMeetLink(false);
      setCreateAsCRMTask(false);
      setRecurrenceType("");
      if (isGlobal) {
        setNewEventDate("");
        setIsCreateModalOpen(false);
      }
    } catch (err: any) {
      console.error("Erro na criação:", err);
      toast({ title: "Erro na criação", description: err.message, variant: "destructive" });
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

  const handleUpdateNotionTask = async (taskId: string, updates: { title?: string; status?: string; dueDate?: string }) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("notion-tasks", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          action: "UPDATE_TASK",
          task_id: taskId,
          ...updates
        },
      });

      if (error) throw error;

      toast({ title: "Tarefa atualizada no Notion!" });

      // Se a tarefa foi marcada como Realizado e tem recorrência, cria a próxima
      if (updates.status === 'Realizado' || updates.status === 'done') {
        const task = notionTasks.find(t => t.id === taskId);
        if (task && task.recurrence && task.dueDate) {
          const recType = task.recurrence === 'Semanal' ? 'weekly' : task.recurrence === 'Quinzenal' ? 'biweekly' : task.recurrence === 'Mensal' ? 'monthly' : null;
          
          if (recType) {
            const nextDate = nextOccurrence(task.dueDate.split('T')[0], recType);
            const clientsStr = task.clients && task.clients.length > 0 ? task.clients[0] : "";
            
            await supabase.functions.invoke("notion-tasks", {
              headers: { Authorization: `Bearer ${session.access_token}` },
              body: {
                action: "CREATE_TASK",
                title: task.title,
                dueDate: nextDate + (task.time ? `T${task.time}:00-03:00` : ""),
                client: clientsStr,
                recurrence: task.recurrence
              },
            });
            toast({ title: "Próxima ocorrência criada!", description: `Agendada para ${format(parseISO(nextDate), 'dd/MM/yyyy')}` });
          }
        }
      }

      fetchNotionTasks();
    } catch (err: any) {
      toast({ title: "Erro ao atualizar tarefa", description: err.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchGoogleEvents();
    fetchNotionTasks();
  }, []);

  useEffect(() => {
    if (googleConnected) fetchGoogleEvents();
  }, [currentDate, googleConnected]);

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

  const formatTime = (isoString?: string) => {
    if (!isoString) return "";
    try {
      // Se for apenas HH:mm
      if (/^([01]\d|2[0-3]):[0-5]\d$/.test(isoString)) return isoString;
      
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return "";
      return format(date, "HH:mm");
    } catch (e) {
      return "";
    }
  };

  const googleEventsByDay = useMemo(() => {
    const map = new Map<number, typeof googleEvents>();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    for (const e of googleEvents) {
      const d = new Date(e.start);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
         const day = d.getDate();
         if (!map.has(day)) map.set(day, []);
         map.get(day)!.push(e);
      }
    }
    return map;
  }, [googleEvents, currentDate]);

  const notionTasksByDay = useMemo(() => {
    const map = new Map<number, typeof notionTasks>();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    for (const t of notionTasks) {
      if (!t.dueDate) continue;
      const dateStr = t.dueDate.includes('T') ? t.dueDate : t.dueDate + "T12:00:00";
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) continue;
      
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
         const day = d.getDate();
         if (!map.has(day)) map.set(day, []);
         map.get(day)!.push(t);
      }
    }
    return map;
  }, [notionTasks, currentDate]);

  const getEventsForDay = (day: number) => googleEventsByDay.get(day) || [];
  const getNotionTasksForDay = (day: number) => notionTasksByDay.get(day) || [];


  const getEventColor = (colorId?: string) =>
    EVENT_COLORS[colorId ?? "default"] ?? EVENT_COLORS.default;

  const isSameDay = (d1: Date, d2: Date) => 
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();

  const todayItems = useMemo(() => {
    const today = new Date();
    return [
      ...googleEvents.filter((e) => isSameDay(new Date(e.start), today)).map(e => ({
        ...e, type: 'google' as const, date: new Date(e.start)
      })),
      ...notionTasks.filter((t) => {
        if (!t.dueDate) return false;
        const dateStr = t.dueDate.includes('T') ? t.dueDate : t.dueDate + "T12:00:00";
        return isSameDay(new Date(dateStr), today);
      }).map(t => ({
        ...t, type: 'notion' as const, date: new Date(t.dueDate?.includes('T') ? t.dueDate : t.dueDate + "T12:00:00")
      }))
    ].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [googleEvents, notionTasks]);

  const tomorrowItems = useMemo(() => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    
    return [
      ...googleEvents.filter((e) => isSameDay(new Date(e.start), tomorrow)).map(e => ({
        ...e, type: 'google' as const, date: new Date(e.start)
      })),
      ...notionTasks.filter((t) => {
        if (!t.dueDate) return false;
        const dateStr = t.dueDate.includes('T') ? t.dueDate : t.dueDate + "T12:00:00";
        return isSameDay(new Date(dateStr), tomorrow);
      }).map(t => ({
        ...t, type: 'notion' as const, date: new Date(t.dueDate?.includes('T') ? t.dueDate : t.dueDate + "T12:00:00")
      }))
    ].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [googleEvents, notionTasks]);


  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold text-white tracking-tight">Calendário</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Botão Google Calendar */}
          {!googleConnected ? (
            <button
              onClick={handleConnectGoogle}
              disabled={connectingGoogle}
              className="liquid-glass flex items-center justify-center gap-2 text-white/70 px-6 h-11 !rounded-2xl transition-all duration-300 text-sm disabled:opacity-60 font-medium"
            >
              {connectingGoogle ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1.086 14.324l-3.456-3.456 1.414-1.414 2.042 2.042 4.292-4.292 1.414 1.414-5.706 5.706z"/>
                </svg>
              )}
              Google Calendar
            </button>
          ) : (
            <motion.div
              whileHover={{ scale: 1.05, translateY: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <button
                onClick={fetchGoogleEvents}
                disabled={loadingGoogle}
                className="liquid-glass flex items-center justify-center gap-2 text-white/70 px-6 h-11 !rounded-2xl transition-all duration-300 text-sm font-medium"
              >
                {loadingGoogle ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Google
              </button>
            </motion.div>
          )}

          {/* Botão Notion */}
          {!notionConnected ? (
            <motion.div
              whileHover={{ scale: 1.05, translateY: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <button
                onClick={handleConnectNotion}
                disabled={connectingNotion}
                className="liquid-glass flex items-center justify-center gap-2 text-white/70 px-6 h-11 !rounded-2xl transition-all duration-300 text-sm font-medium"
              >
                {connectingNotion ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
                Conectar Notion
              </button>
            </motion.div>
          ) : (
            <motion.div
              whileHover={{ scale: 1.05, translateY: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <button
                onClick={() => fetchNotionTasks()}
                disabled={loadingNotion}
                className="liquid-glass flex items-center justify-center gap-2 text-white/70 px-6 h-11 !rounded-2xl transition-all duration-300 text-sm font-medium"
              >
                {loadingNotion ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Notion
              </button>
            </motion.div>
          )}

          <motion.div
            whileHover={{ scale: 1.05, translateY: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <button 
               onClick={() => setIsCreateModalOpen(true)}
               className="liquid-glass flex items-center gap-2 !bg-primary hover:!bg-primary/90 !text-white px-6 h-11 !rounded-2xl transition-all duration-300 shadow-[0_0_20px_rgba(104,41,192,0.3)] text-sm whitespace-nowrap font-bold !border-primary/20"
            >
              <Plus className="w-4 h-4" />
              Novo Evento
            </button>
          </motion.div>
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
            <div className="flex items-center justify-center py-4 gap-2 text-Porceli-gray-400 text-sm mb-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              Sincronizando eventos...
            </div>
          )}

          <div className="grid grid-cols-7 gap-px bg-white/5 rounded-xl overflow-hidden border border-white/5">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="bg-black/40 backdrop-blur-md p-4 text-center text-xs font-medium text-Porceli-gray-400 uppercase tracking-wider">
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
                ...dayEvents.map(e => ({ type: 'google' as const, id: e.id, title: e.title, time: !e.allDay ? e.start : undefined, color: getEventColor(e.colorId), url: e.htmlLink, status: e.status })),
                ...dayTasks.map(t => ({ type: 'notion' as const, id: t.id, title: t.title, time: undefined, color: 'bg-white/10 text-white/90 border-white/20 hover:bg-white/20', url: t.url, status: t.status })),
              ];

              return (
                <div
                  key={idx}
                  onClick={() => day && setSelectedDay(day)}
                  className={`min-h-[120px] bg-black/20 p-2 transition-colors relative hover:bg-white/[0.04] ${day ? "cursor-pointer" : "opacity-20 cursor-default"} ${day && isDayLocked(day) ? 'ring-1 ring-inset ring-red-500/50' : ''}`}
                >
                  {day && (
                    <div className="flex flex-col h-full">
                      <span className={`text-sm font-medium relative ${
                        isToday
                          ? "bg-primary text-white w-7 h-7 flex items-center justify-center rounded-full shadow-[0_0_10px_rgba(104,41,192,0.5)]"
                          : "text-Porceli-gray-300 p-1"
                      }`}>
                        {day}
                        {isDayLocked(day) && (
                          <Lock className="w-2.5 h-2.5 text-red-500/70 absolute -top-1 -right-1" />
                        )}
                      </span>
                      <div className="mt-2 space-y-1">
                        {allItems.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            title={item.title}
                            className={`text-[10px] p-1.5 rounded-lg border truncate cursor-pointer liquid-glass transition-all hover:brightness-125
                              ${item.status === 'Realizado' || item.status === 'done' ? '!border-green-500/50 !shadow-[0_0_10px_rgba(34,197,94,0.2)]' : 
                                item.status === 'Em andamento' ? '!border-blue-500/50 !shadow-[0_0_10px_rgba(59,130,246,0.2)]' : 'border-white/10'} 
                              flex items-center gap-1.5`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingItem({
                                id: item.id,
                                type: item.type,
                                title: item.title,
                                time: item.time
                              });
                              setIsEditActivityModalOpen(true);
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
                          <div className="text-[10px] text-Porceli-gray-400 pl-1 mt-1 font-medium">
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
          {/* Atividades de Hoje */}
          <Card className={`${CARD} p-5`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Atividades de Hoje</h3>
            </div>

            {loadingGoogle || loadingNotion ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-Porceli-gray-400" />
              </div>
            ) : todayItems.length === 0 ? (
              <p className="text-sm text-Porceli-gray-400 text-center py-4">Nenhuma atividade hoje</p>
            ) : (
              <div className="space-y-3">
                {todayItems.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => {
                      setEditingItem({
                        id: item.id,
                        type: item.type,
                        title: item.title,
                        time: item.type === 'google' ? (item as any).start : (item as any).time,
                        status: (item as any).status
                      });
                      setIsEditActivityModalOpen(true);
                    }}
                    className={`liquid-glass dashboard-glow flex items-start gap-3 p-3 rounded-xl transition-all group relative overflow-hidden cursor-pointer hover:bg-white/10 ${item.status === 'Realizado' || item.status === 'done' ? '!border-green-500/50 !shadow-[0_0_15px_rgba(34,197,94,0.1)]' : item.status === 'Em andamento' ? '!border-blue-500/50 !shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'border-white/[0.05]'}`}
                  >
                    <div className={`p-2 rounded-lg ${item.type === 'google' ? (getEventColor((item as any).colorId).split(" ")[0]) : 'bg-white/10'}`}>
                      {item.type === 'google' ? <CalendarIcon className="w-4 h-4 text-white/70" /> : <BookOpen className="w-4 h-4 text-white/70" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{item.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.type === 'notion' && (item as any).clients && (item as any).clients.length > 0 && (
                          <span className="text-[11px] text-white font-medium truncate">
                            {(item as any).clients[0]}
                          </span>
                        )}
                        <p className="text-xs text-Porceli-gray-400">
                          {item.type === 'google' ? formatTime((item as any).start) : ((item as any).time || "Tarefa do dia")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Atividades de Amanhã */}
          <Card className={`${CARD} p-5`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Atividades de Amanhã</h3>
            </div>

            {loadingGoogle || loadingNotion ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-Porceli-gray-400" />
              </div>
            ) : tomorrowItems.length === 0 ? (
              <p className="text-sm text-Porceli-gray-400 text-center py-4">Nenhuma atividade para amanhã</p>
            ) : (
              <div className="space-y-3">
                {tomorrowItems.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => {
                      setEditingItem({
                        id: item.id,
                        type: item.type,
                        title: item.title,
                        time: item.type === 'google' ? (item as any).start : (item as any).time,
                        status: (item as any).status
                      });
                      setIsEditActivityModalOpen(true);
                    }}
                    className={`liquid-glass dashboard-glow flex items-start gap-3 p-3 rounded-xl transition-all group relative overflow-hidden cursor-pointer hover:bg-white/10 ${item.status === 'Realizado' ? '!border-green-500/50 !shadow-[0_0_15px_rgba(34,197,94,0.1)]' : item.status === 'Em andamento' ? '!border-blue-500/50 !shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'border-white/[0.05]'}`}
                  >
                    <div className={`p-2 rounded-lg ${item.type === 'google' ? (getEventColor((item as any).colorId).split(" ")[0]) : 'bg-white/10'}`}>
                      {item.type === 'google' ? <CalendarIcon className="w-4 h-4 text-white/70" /> : <BookOpen className="w-4 h-4 text-white/70" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{item.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-Porceli-gray-400">
                          {item.type === 'google' ? formatTime((item as any).start) : ((item as any).time || "Tarefa do dia")}
                        </p>
                        {item.type === 'notion' && (item as any).clients && (item as any).clients.length > 0 && (
                          <span className="text-[10px] text-primary font-bold truncate">
                            • {(item as any).clients[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Modal do Dia Selecionado */}
      <Dialog open={selectedDay !== null} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="sm:max-w-[500px] border-white/[0.05] shadow-2xl text-white !p-0 !gap-0 bg-transparent flex flex-col">
          <div className="p-6 border-b border-white/[0.05] shrink-0">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold tracking-tight">
                {selectedDay} de {MONTHS[currentDate.getMonth()]}
              </DialogTitle>
            </DialogHeader>
          </div>
          
          <div className="overflow-y-auto max-h-[45vh] custom-scrollbar p-6">
            <div className="space-y-3 pr-2">
            {selectedDay && (() => {
              const dayEvents = getEventsForDay(selectedDay);
              const dayTasks = getNotionTasksForDay(selectedDay);

              const allItems = [
                ...dayEvents.map(e => ({ 
                   type: 'google' as const, 
                   id: e.id, 
                   title: e.title, 
                   time: e.start, 
                   isAllDay: e.allDay,
                   color: getEventColor(e.colorId).split(' ')[0] || 'bg-primary/20', 
                   meetLink: e.hangoutLink,
                   status: undefined 
                })),
                ...dayTasks.map(t => {
                   let time = t.dueDate;
                   let isAllDay = !t.time || t.time === '00:00';
                   
                   if (t.dueDate && t.dueDate.includes('T')) {
                     // Se o dueDate já vier com T, ele já tem a hora
                     time = t.dueDate;
                     const parts = t.dueDate.split('T');
                     if (parts[1] && parts[1] !== '00:00' && parts[1] !== '00:00:00' && !parts[1].startsWith('00:00')) {
                       isAllDay = false;
                     }
                   } else if (t.dueDate) {
                     time = t.time ? `${t.dueDate}T${t.time}` : `${t.dueDate}T00:00`;
                   }

                   return { 
                    type: 'notion' as const, 
                    id: t.id, 
                    title: t.title, 
                    time: time, 
                    isAllDay: isAllDay,
                    color: 'bg-white/10', 
                    meetLink: undefined,
                    status: t.status,
                    clients: t.clients
                   };
                })
              ];

              // Ordenar: Com hora primeiro, sem hora por último
              const sortedItems = [...allItems].sort((a, b) => {
                const hasTimeA = a.time && !(a as any).isAllDay;
                const hasTimeB = b.time && !(b as any).isAllDay;

                if (hasTimeA && hasTimeB) {
                  return new Date(a.time!).getTime() - new Date(b.time!).getTime();
                }
                if (hasTimeA) return -1;
                if (hasTimeB) return 1;
                return 0;
              });

              if (sortedItems.length === 0) {
                return <p className="text-sm text-Porceli-gray-400 text-center py-4">Nenhum evento neste dia.</p>;
              }

              return sortedItems.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => {
                    setEditingItem(item);
                    setIsEditActivityModalOpen(true);
                  }}
                  className={`liquid-glass p-3 sm:p-4 rounded-2xl dashboard-glow relative group grid grid-cols-[1fr_90px] items-center gap-2 transition-all hover:bg-white/[0.04] cursor-pointer border 
                    ${item.status === 'Realizado' || item.status === 'done' ? '!border-green-500/50 !shadow-[0_0_20px_rgba(34,197,94,0.15)]' : 
                      item.status === 'Em andamento' ? '!border-blue-500/50 !shadow-[0_0_20px_rgba(59,130,246,0.15)]' : 'border-white/[0.05]'}`}
                >
                  {/* Coluna 1: Info */}
                  <div className="flex items-center min-w-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm sm:text-base font-bold text-white tracking-tight truncate max-w-[85%]">
                          {item.title}
                        </h4>
                        {item.meetLink && (
                          <motion.a 
                            href={item.meetLink} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            whileHover={{ scale: 1.15, color: '#6829c0' }}
                            whileTap={{ scale: 0.9 }}
                            className="text-white/20 hover:text-primary transition-all flex-shrink-0 flex items-center mb-1"
                          >
                             <ExternalLink className="w-3.5 h-3.5" />
                          </motion.a>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {(item as any).clients && (item as any).clients.length > 0 && (
                          <span className="text-[11px] text-white font-medium tracking-tight">
                            {(item as any).clients[0]}
                          </span>
                        )}
                        {item.time && !item.isAllDay && (
                           <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-primary" />
                              <span className="text-[11px] text-primary font-bold">
                                 {formatTime(item.time)}
                              </span>
                           </div>
                        )}
                      </div>
                      {(item.isAllDay || (item.type === 'notion' && !item.time)) && (
                        <div className="flex items-center gap-1.5 mt-1">
                           <Clock className="w-3.5 h-3.5 text-white/20" />
                           <span className="text-[11px] text-white/20 font-bold uppercase tracking-wider">
                              Tarefa do Dia
                           </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Coluna 2: Editar */}
                  <div className="flex justify-end">
                    <button 
                      className="flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-white/5 transition-all group/btn"
                      onClick={() => {
                        setEditingItem(item);
                        setIsEditActivityModalOpen(true);
                      }}
                    >
                       <Edit className="w-4 h-4 text-white/50 group-hover/btn:text-white" />
                       <span className="text-[10px] font-bold text-white/50 group-hover/btn:text-white uppercase">Editar</span>
                    </button>
                  </div>
                </div>
              ));
            })()}
            </div>
          </div>
          
          <div className="p-6 pt-0 shrink-0">
            {/* Formulário de novo evento dentro do modal */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between mb-4 px-1">
                <h4 className="text-sm font-medium text-white/80">
                  {createMeetLink ? "Adicionar Evento no Google Calendar" : "Adicionar Tarefa no Notion"}
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Trancar Dia</span>
                  <Switch 
                    checked={selectedDay ? isDayLocked(selectedDay) : false}
                    onCheckedChange={() => selectedDay && toggleLockDay(selectedDay)}
                    className="scale-75"
                  />
                </div>
              </div>
              
              <div className={`space-y-3 ${selectedDay && isDayLocked(selectedDay) ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
                {selectedDay && isDayLocked(selectedDay) && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 backdrop-blur-[1px] rounded-xl">
                     <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500 bg-red-500/10 px-4 py-2 rounded-full border border-red-500/20 shadow-2xl">Dia Trancado</p>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-2 w-full">
                  <input 
                    type="text" 
                    placeholder="Título da atividade" 
                    className="flex-1 bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 text-white placeholder:text-white/20 h-11 rounded-xl px-3 transition-all outline-none"
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateActivity(false)}
                  />
                  <div className="w-full sm:w-40">
                    <TimePicker
                      value={newEventTime}
                      onChange={(time) => setNewEventTime(time)}
                    />
                  </div>
                </div>

                <div className="flex gap-2 w-full">
                  <input 
                    type="text" 
                    placeholder="Cliente (opcional)" 
                    className="flex-1 bg-white/[0.03] border border-white/[0.05] focus:border-primary/50 text-white placeholder:text-white/20 h-11 rounded-xl px-3 transition-all outline-none"
                    value={newEventClient}
                    onChange={(e) => setNewEventClient(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateActivity(false)}
                  />
                  <motion.div
                    whileHover={!creatingEvent && newEventTitle.trim() ? { scale: 1.05, translateY: -2 } : {}}
                    whileTap={!creatingEvent && newEventTitle.trim() ? { scale: 0.95 } : {}}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    className="shrink-0"
                  >
                    <button 
                      disabled={creatingEvent || !newEventTitle.trim()}
                      onClick={() => handleCreateActivity(false)}
                      className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-2xl px-6 h-11 text-xs font-bold shadow-[0_0_20px_rgba(104,41,192,0.3)] transition-all flex items-center justify-center w-full uppercase tracking-wider"
                    >
                      {creatingEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : "Adicionar"}
                    </button>
                  </motion.div>
                </div>
              </div>

              <div className="space-y-1.5 p-3.5 bg-white/[0.03] border border-white/[0.05] rounded-xl mt-2">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Recorrencia</label>
                <Select
                  value={recurrenceType || "none"}
                  onValueChange={(val) => {
                    const type = val === "none" ? "" : val;
                    setRecurrenceType(type as any);
                  }}
                >
                  <SelectTrigger className="w-full bg-white/[0.03] border-white/[0.08] text-white/80 h-10">
                    <SelectValue placeholder="Selecione a recorrência" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                    <SelectItem value="none">Nunca</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="biweekly">Quinzenal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-white/[0.03] border border-white/[0.05] rounded-xl mt-2 mb-2">
                <div className="space-y-0.5">
                  <Label className="text-white font-medium text-sm cursor-pointer" onClick={() => setCreateMeetLink(!createMeetLink)}>Google Meet / Call</Label>
                  <p className="text-white/40 text-[11px] text-balance">
                    {createMeetLink ? "Gerar evento com Meet." : "Salvar como tarefa no Notion."}
                  </p>
                </div>
                <Switch
                  checked={createMeetLink}
                  onCheckedChange={(checked) => setCreateMeetLink(checked)}
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateModalOpen} onOpenChange={(open) => !open && setIsCreateModalOpen(false)}>
        <DialogContent className="sm:max-w-[450px] border-white/[0.05] shadow-2xl text-white !p-0 !gap-0 bg-[#121212] backdrop-blur-2xl">
          <DialogHeader className="p-6 border-b border-white/[0.05]">
            <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
               <Plus className="w-5 h-5 text-primary" />
               {createMeetLink ? "Novo Evento no Google" : "Nova Tarefa no Notion"}
            </DialogTitle>
            <DialogDescription className="text-white/40">
              Preencha os detalhes da nova atividade
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Título</label>
              <input 
                type="text"
                placeholder="Ex: Reunião com Cliente"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 text-white placeholder:text-white/20 h-12 rounded-2xl px-4 transition-all outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Cliente</label>
              <input 
                type="text"
                placeholder="Nome do cliente"
                value={newEventClient}
                onChange={(e) => setNewEventClient(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 text-white placeholder:text-white/20 h-12 rounded-2xl px-4 transition-all outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Data</label>
                <DatePicker 
                  date={newEventDate ? new Date(newEventDate + 'T12:00:00') : undefined}
                  setDate={(date) => setNewEventDate(date ? format(date, "yyyy-MM-dd") : "")}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Horário</label>
                <TimePicker 
                  value={newEventTime}
                  onChange={setNewEventTime}
                />
              </div>
            </div>

            <div className="space-y-1.5 p-4 bg-white/[0.03] border border-white/[0.05] rounded-xl mt-2">
               <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Recorrencia</label>
               <Select
                 value={recurrenceType || "none"}
                 onValueChange={(val) => {
                   const type = val === "none" ? "" : val;
                   setRecurrenceType(type as any);
                 }}
               >
                 <SelectTrigger className="w-full bg-white/[0.03] border-white/[0.08] text-white/80 h-10">
                   <SelectValue placeholder="Selecione a recorrência" />
                 </SelectTrigger>
                 <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                   <SelectItem value="none">Nunca</SelectItem>
                   <SelectItem value="weekly">Semanal</SelectItem>
                   <SelectItem value="biweekly">Quinzenal</SelectItem>
                   <SelectItem value="monthly">Mensal</SelectItem>
                 </SelectContent>
               </Select>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/[0.05] rounded-xl mt-2">
              <div className="space-y-0.5">
                <Label className="text-white font-medium cursor-pointer" onClick={() => setCreateMeetLink(!createMeetLink)}>Google Meet / Call</Label>
                <p className="text-white/40 text-xs text-balance">
                  {createMeetLink ? "Será criado um evento com Call no Meet." : "Será criada uma linha no Notion."}
                </p>
              </div>
              <Switch
                checked={createMeetLink}
                onCheckedChange={(checked) => setCreateMeetLink(checked)}
              />
            </div>

            <div className="flex gap-3 pt-6 mt-6 border-t border-white/[0.05]">
              <motion.div 
                className="flex-1" 
                whileHover={{ scale: 1.05, translateY: -2 }} 
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="liquid-glass hover:bg-white/10 text-white/70 border-white/5 w-full h-12 rounded-2xl font-bold transition-all"
                >
                  Cancelar
                </Button>
              </motion.div>
              <motion.div 
                className="flex-[2]" 
                whileHover={!creatingEvent && newEventTitle.trim() && newEventDate ? { scale: 1.05, translateY: -2 } : {}}
                whileTap={!creatingEvent && newEventTitle.trim() ? { scale: 0.95 } : {}}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Button
                  disabled={creatingEvent || !newEventTitle.trim() || !newEventDate || (createMeetLink && !newEventTime)}
                  onClick={() => handleCreateActivity(true)}
                  className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white w-full h-12 rounded-2xl shadow-[0_0_20px_rgba(104,41,192,0.3)] font-bold transition-all flex items-center justify-center gap-2"
                >
                   {creatingEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                     <>
                       <Save className="w-4 h-4" />
                       Salvar
                     </>
                   )}
                </Button>
              </motion.div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Atividade */}
      <Dialog open={isEditActivityModalOpen} onOpenChange={(open) => !open && setIsEditActivityModalOpen(false)}>
        <DialogContent className="sm:max-w-[450px] border-white/[0.05] shadow-2xl text-white !p-0 !gap-0 bg-[#121212] backdrop-blur-2xl">
          <div className="p-6 border-b border-white/[0.05]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-tight">
                 Editar {editingItem?.type === 'google' ? 'Evento' : editingItem?.type === 'notion' ? 'Tarefa Notion' : 'Atividade Recorrente'}
              </DialogTitle>
              <DialogDescription className="text-white/40">
                Altere os detalhes desta atividade
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Título</label>
              <input 
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 text-white placeholder:text-white/20 h-12 rounded-2xl px-4 transition-all outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Data</label>
                <DatePicker 
                  date={editDate}
                  setDate={setEditDate}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Horário</label>
                <TimePicker 
                  value={editTime}
                  onChange={setEditTime} 
                />
              </div>
            </div>

            {(editingItem?.type === 'notion' || editingItem?.type === 'crm') && (
               <div className="space-y-3 pt-1">
                 <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Status da Atividade</label>
                 <div className="grid grid-cols-2 gap-3 w-full">
                   <motion.div
                     whileHover={{ scale: 1.05, translateY: -2 }}
                     whileTap={{ scale: 0.95 }}
                     transition={{ type: "spring", stiffness: 400, damping: 17 }}
                     className="w-full"
                   >
                     <button 
                       onClick={() => {
                         if (editingItem?.type === 'notion') {
                           handleUpdateNotionTask(editingItem.id, { status: "Realizado" });
                         } else {
                           handleCompleteCRMTask(editingItem?.id!);
                         }
                         setIsEditActivityModalOpen(false);
                       }}
                       className="w-full liquid-glass hover:bg-white/10 text-white/70 border-white/5 h-12 sm:h-14 px-4 rounded-2xl transition-all flex items-center justify-center gap-2 group cursor-pointer"
                     >
                       <CheckCircle className="w-4 h-4 text-white/40 group-hover:text-green-500 transition-colors" />
                       <span className="text-[11px] font-black uppercase tracking-widest group-hover:text-white transition-colors">Realizado</span>
                     </button>
                   </motion.div>
                   
                   <motion.div
                     whileHover={{ scale: 1.05, translateY: -2 }}
                     whileTap={{ scale: 0.95 }}
                     transition={{ type: "spring", stiffness: 400, damping: 17 }}
                     className="w-full"
                   >
                     <button 
                       onClick={() => {
                         if (editingItem?.type === 'notion') {
                           handleUpdateNotionTask(editingItem.id, { status: "Em andamento" });
                         } else {
                           supabase.from("recurring_tasks").update({ status: "in_progress" }).eq("id", editingItem?.id).then(() => fetchRecurringTasks());
                         }
                         setIsEditActivityModalOpen(false);
                       }}
                       className="w-full liquid-glass hover:bg-white/10 text-white/70 border-white/5 h-12 sm:h-14 px-4 rounded-2xl transition-all flex items-center justify-center gap-2 group cursor-pointer"
                     >
                       <Clock className="w-4 h-4 text-white/40 group-hover:text-blue-500 transition-colors" />
                       <span className="text-[11px] font-black uppercase tracking-widest group-hover:text-white transition-colors">Andamento</span>
                     </button>
                   </motion.div>
                 </div>
               </div>
            )}

            <div className="flex gap-3 pt-6 mt-6 border-t border-white/[0.05]">
              <motion.div 
                className="flex-1" 
                whileHover={{ scale: 1.05, translateY: -2 }} 
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Button
                  onClick={() => setIsEditActivityModalOpen(false)}
                  className="liquid-glass hover:bg-white/10 text-white/70 border-white/5 w-full h-12 rounded-2xl font-bold transition-all"
                >
                  Cancelar
                </Button>
              </motion.div>
              <motion.div 
                className="flex-[2]" 
                whileHover={{ scale: 1.05, translateY: -2 }} 
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Button onClick={handleSaveEdit} className="bg-primary hover:bg-primary/90 text-white w-full h-12 rounded-2xl shadow-[0_0_20px_rgba(104,41,192,0.3)] font-bold transition-all flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" />
                  Salvar
                </Button>
              </motion.div>
              <motion.div 
                whileHover={{ scale: 1.05, translateY: -2 }} 
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleDeleteActivity}
                  className="h-12 w-12 rounded-2xl bg-white/[0.05] hover:bg-white/10 text-red-500 border border-white/5 transition-all shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                  title="Excluir Atividade"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </motion.div>
            </div>
        </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="liquid-glass border-white/10 shadow-2xl bg-[#121212]/90 backdrop-blur-2xl text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Tem certeza que deseja excluir esta {editingItem?.type === 'google' ? 'atividade' : 'tarefa'}? 
              {editingItem?.type === 'google' ? ' Esta ação também removerá o evento do Google Calendar.' : ' Esta ação removerá permanentemente do Notion.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-4">
            <AlertDialogCancel className="liquid-glass hover:bg-white/10 text-white/70 border-white/5 rounded-xl h-11 h-11 px-6 font-bold transition-all">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteActivity}
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl h-11 px-8 font-bold shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all uppercase tracking-wider text-xs"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

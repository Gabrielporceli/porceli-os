import { Card } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/PageLoader";
import { usePageReady } from "@/hooks/usePageReady";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FullScreenCalendar, CalendarEvent, CalendarData } from "@/components/ui/fullscreen-calendar";
import { GitHubCalendar } from "@/components/ui/git-hub-calendar";
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
  LockIcon,
  LockOpenIcon,
  Unlock,
  Repeat,
  Tag,
  GripVertical
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { parseISO, format } from "date-fns";
import { cn } from "@/lib/utils";
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
  const isReady = usePageReady();

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
  const [currentTime, setCurrentTime] = useState(new Date());

  // ── Ordem customizada das atividades por dia (persistida em localStorage) ──
  const ORDER_STORAGE_KEY = "calendar_activity_order";
  const [activityOrder, setActivityOrder] = useState<Record<string, string[]>>(() => {
    try {
      const raw = localStorage.getItem(ORDER_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const dayKey = (day: number) =>
    `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const saveActivityOrder = (key: string, ids: string[]) => {
    setActivityOrder(prev => {
      const next = { ...prev, [key]: ids };
      try { localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000); // atualiza a cada 30 seg
    return () => clearInterval(timer);
  }, []);

  const isOngoing = useCallback((item: any) => {
    // Apenas reuniões do Google Calendar devem ser consideradas em andamento por horário
    if (item.type === 'notion') return false;

    // Para google events o start_time foi mapeado para "start" ou "time" dependendo de onde renderiza
    let timeStr = item.time || item.start;
    let endStr = item.end;

    if (!timeStr) return false;

    // Google provides "all day" flag
    if (item.isAllDay) return false;

    const start = new Date(timeStr);
    if (isNaN(start.getTime())) return false;

    // Se não tiver fim definido (ex: Notion - embora agora retorne false acima), assume 1 h
    const end = endStr ? new Date(endStr) : new Date(start.getTime() + 60 * 60 * 1000);

    return currentTime >= start && currentTime <= end;
  }, [currentTime]);

  // Reunião/meeting que já passou do horário de início → aparece como "realizada" (borda verde)
  const isPastMeeting = useCallback((item: any) => {
    // Só aplica a eventos com horário definido (não all-day) e que sejam meetings
    if (item.isAllDay) return false;
    // Não sobrescreve status explícito do Notion
    if (item.status === 'Realizado' || item.status === 'done') return false;

    const isMeeting = item.isGoogleMeet || item.type === 'google';
    if (!isMeeting) return false;

    const timeStr = item.time || item.start;
    if (!timeStr) return false;

    const start = new Date(timeStr);
    if (isNaN(start.getTime())) return false;

    // Verde quando passou do início da reunião
    return currentTime >= start;
  }, [currentTime]);

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
      if (editingItem.time && /^\d{2}:\d{2}$/.test(editingItem.time)) {
        // Handle "HH:mm" time from Notion
        setEditDate(editingItem.due_date ? new Date(editingItem.due_date.includes('T') ? editingItem.due_date : editingItem.due_date + "T12:00:00") : new Date());
        setEditTime(editingItem.time);
      } else if (editingItem.time) {
        // Handle full ISO date string
        const d = new Date(editingItem.time);
        setEditDate(!isNaN(d.getTime()) ? d : undefined);
        setEditTime(!isNaN(d.getTime()) ? format(d, "HH:mm") : "");
      } else {
        setEditDate(undefined);
        setEditTime("");
      }
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

      // Envia o intervalo do mês sendo exibido para a edge function buscar exatamente esses eventos
      const timeMin = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), 1, 0, 0, 0)).toISOString();
      const timeMax = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59)).toISOString();

      const { data, error } = await supabase.functions.invoke("google-calendar-events", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { action: "FETCH", timeMin, timeMax },
      });

      if (error) throw error;

      if (data?.connected) {
        setGoogleConnected(true);
        setGoogleEvents(data.events ?? []);
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
      
      const itemToDelete = editingItem;

      // Optimistic state updates e Fechamento imediato
      setIsEditActivityModalOpen(false);
      setIsDeleteDialogOpen(false);
      setEditingItem(null);

      if (itemToDelete.type === 'google') {
        setGoogleEvents(prev => prev.filter(e => e.id !== itemToDelete.id));
        const { error } = await supabase.functions.invoke("google-calendar-events", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: {
            action: 'DELETE_EVENT',
            eventId: itemToDelete.id,
          },
        });
        if (error) throw error;
        toast({ title: "Evento excluído com sucesso!" });
      } else if (itemToDelete.type === 'notion') {
        setNotionTasks(prev => prev.filter(t => t.id !== itemToDelete.id));
        const { error } = await supabase.functions.invoke("notion-tasks", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: {
            action: "DELETE_TASK",
            task_id: itemToDelete.id,
          },
        });
        if (error) throw error;
        toast({ title: "Tarefa excluída do Notion!" });
      }
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir.",
        variant: "destructive",
      });
      // Em caso de erro do servidor volta o estado verdadeiro
      fetchGoogleEvents();
      fetchNotionTasks();
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

      // Calcula o fim como start + 1 hora (evita hardcode que quebrava horários após 13:00)
      const [startHour, startMin] = timeStr.split(':').map(Number);
      const endHour = startHour + 1 >= 24 ? 23 : startHour + 1;
      const endTimeStr = `${String(endHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
      const endDateTime = `${dateStr}T${endTimeStr}:00-03:00`;

      let meetingLink = "";
      if (createMeetLink) {
        toast({ title: "Gerando link Google Meet..." });
        const googleTask = supabase.functions.invoke("google-calendar-events", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: {
            action: "CREATE_EVENT",
            title: newEventTitle,
            start: startDateTime,
            end: endDateTime,
            createMeetLink: true
          },
        });

        const googleResponse = await Promise.race([
          googleTask,
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout Google")), 15000))
        ]) as any;

        if (googleResponse.error) throw new Error(`Google: ${googleResponse.error.message}`);
        meetingLink = googleResponse.data?.event?.hangoutLink || "";
        toast({ title: "Evento criado no Google Calendar!" });
        fetchGoogleEvents();
      } else {
        const labels: Record<string, string> = { weekly: 'Semanal', biweekly: 'Quinzenal', monthly: 'Mensal' };
        const recLabel = recurrenceType !== 'none' ? labels[recurrenceType] : undefined;
        const combinedDueDate = dateStr + (newEventTime ? `T${newEventTime}:00-03:00` : "");

        // Criação rápida - UI Otmista
        setNotionTasks(prev => [{
          id: `temp_${Date.now()}`,
          title: newEventTitle,
          dueDate: combinedDueDate,
          time: newEventTime || undefined,
          status: 'Pendente',
          recurrence: recLabel,
          clients: newEventClient ? [newEventClient] : []
        }, ...prev]);

        toast({ title: "Sincronizando com Notion..." });
        
        const { error: notionError } = await supabase.functions.invoke("notion-tasks", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: {
            action: "CREATE_TASK",
            title: newEventTitle,
            dueDate: combinedDueDate,
            client: newEventClient,
            recurrence: recLabel
          },
        });

        if (notionError) throw notionError;

        toast({ title: "Tarefa criada no Notion!" });
        fetchNotionTasks();
      }

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

      // Optimistic Update so it turns green/updates immediately!
      setNotionTasks(prev => prev.map(t => {
        if (t.id === taskId) {
          return { ...t, ...updates };
        }
        return t;
      }));

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
      if (/^([01]\d|2[0-3]):[0-5]\d$/.test(isoString)) {
        return isoString === '00:00' ? "" : isoString;
      }
      
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return "";
      const formatted = format(date, "HH:mm");
      return formatted === '00:00' ? "" : formatted;
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

      let day: number;
      let month: number;
      let year: number;

      // Extrai a data diretamente da string sem conversão de timezone
      // Formato pode ser: "2026-04-15", "2026-04-15T10:00:00-03:00", "2026-04-15T13:00:00Z"
      const datePart = t.dueDate.split('T')[0]; // sempre pega só a parte da data
      if (!datePart || !datePart.includes('-')) continue;

      const parts = datePart.split('-').map(Number);
      if (parts.length !== 3) continue;
      [year, month, day] = parts;
      month = month - 1; // JS months são 0-based

      if (isNaN(year) || isNaN(month) || isNaN(day)) continue;

      if (month === currentMonth && year === currentYear) {
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

  // Helper para extrair data local de uma string sem problema de timezone
  const extractLocalDateParts = (dateStr: string): { year: number; month: number; day: number } | null => {
    const datePart = dateStr.split('T')[0];
    if (!datePart || !datePart.includes('-')) return null;
    const parts = datePart.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    return { year: parts[0], month: parts[1] - 1, day: parts[2] };
  };

  const isSameDayLocal = (dateStr: string, ref: Date): boolean => {
    const parts = extractLocalDateParts(dateStr);
    if (!parts) return false;
    return parts.year === ref.getFullYear() && parts.month === ref.getMonth() && parts.day === ref.getDate();
  };

  const calendarData = useMemo(() => {
    const dataMap = new Map<string, CalendarEvent[]>();

    googleEvents.forEach(e => {
      const parts = extractLocalDateParts(e.start);
      if (!parts) return;
      const dateKey = `${parts.year}-${String(parts.month + 1).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
      if (!dataMap.has(dateKey)) dataMap.set(dateKey, []);
      dataMap.get(dateKey)!.push({
        id: e.id,
        name: e.title,
        time: e.start.includes('T') ? format(new Date(e.start), "HH:mm") : undefined,
        datetime: e.start,
        type: 'google',
        status: e.status
      });
    });

    notionTasks.forEach(t => {
      if (!t.dueDate) return;
      const parts = extractLocalDateParts(t.dueDate);
      if (!parts) return;
      const dateKey = `${parts.year}-${String(parts.month + 1).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
      if (!dataMap.has(dateKey)) dataMap.set(dateKey, []);
      dataMap.get(dateKey)!.push({
        id: t.id,
        name: t.title,
        time: t.dueDate.includes('T') ? format(new Date(t.dueDate), "HH:mm") : undefined,
        datetime: t.dueDate,
        type: 'notion',
        status: t.status,
        clients: t.clients
      });
    });

    return Array.from(dataMap.entries()).map(([dateStr, events]) => ({
      day: new Date(dateStr + 'T12:00:00'),
      events
    })) as CalendarData[];
  }, [googleEvents, notionTasks]);
  const contributionData = useMemo(() => {
    const counts: Record<string, number> = {};

    // Google Calendar — pega só a parte da data (antes do T) para evitar timezone shift
    googleEvents.forEach(event => {
      const datePart = event.start?.split('T')[0];
      if (datePart) counts[datePart] = (counts[datePart] || 0) + 1;
    });

    // Notion tasks — mesma abordagem
    notionTasks.forEach(task => {
      if (!task.dueDate) return;
      const datePart = task.dueDate.split('T')[0];
      if (datePart) counts[datePart] = (counts[datePart] || 0) + 1;
    });

    return Object.entries(counts).map(([date, count]) => ({ date, count }));
  }, [googleEvents, notionTasks]);

  // Atividades de hoje (para o painel lateral), ordenadas por horário
  const todayItems = useMemo(() => {
    const now = new Date();
    const match = calendarData.find(d =>
      d.day.getFullYear() === now.getFullYear() &&
      d.day.getMonth() === now.getMonth() &&
      d.day.getDate() === now.getDate()
    );
    return (match?.events ?? []).slice().sort((a, b) => {
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return 0;
    });
  }, [calendarData]);

  // Abre o modal de edição a partir de um evento do calendário/painel
  const handleEventClick = (event: CalendarEvent) => {
    const googleItem = googleEvents.find(i => i.id === event.id);
    const notionItem = notionTasks.find(i => i.id === event.id);
    if (googleItem) {
      setEditingItem({ ...googleItem, type: 'google' as const });
      setEditTitle(googleItem.title);
      setEditDate(new Date(googleItem.start));
      setEditTime(googleItem.start.includes('T') ? format(new Date(googleItem.start), "HH:mm") : "12:00");
      setIsEditActivityModalOpen(true);
    } else if (notionItem) {
      setEditingItem({ ...notionItem, type: 'notion' as const });
      setEditTitle(notionItem.title);
      const dateStr = notionItem.dueDate!;
      setEditDate(new Date(dateStr));
      setEditTime(dateStr.includes('T') ? format(new Date(dateStr), "HH:mm") : "12:00");
      setIsEditActivityModalOpen(true);
    }
  };

  // Status visual de um evento do painel
  const eventVisualStatus = (event: CalendarEvent): 'done' | 'ongoing' | 'pending' => {
    if (['Realizado', 'REALIZADO', 'done'].includes(event.status ?? '')
      || (event.type === 'google' && event.datetime?.includes('T') && new Date() >= new Date(event.datetime))) return 'done';
    if (['Em andamento', 'EM ANDAMENTO'].includes(event.status ?? '')) return 'ongoing';
    return 'pending';
  };

  if (!isReady) return <PageLoader />;

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in relative pb-10">
      <GitHubCalendar data={contributionData} />

      <div className="h-[calc(100vh-80px)] min-h-[650px] flex gap-4">
      <div className="flex-1 min-w-0 overflow-hidden rounded-3xl flex">
        <FullScreenCalendar
          data={calendarData}
          onDaySelect={(date: Date) => setSelectedDay(date.getDate())}
          onToggleLock={(date: Date) => toggleLockDay(date.getDate())}
          isDayLocked={(date: Date) => isDayLocked(date.getDate())}
          rightActions={
            <div className="flex items-center gap-2">
              {/* Botão Google Calendar */}
              {!googleConnected ? (
                <button
                  onClick={handleConnectGoogle}
                  disabled={connectingGoogle}
                  className="btn-glass flex items-center justify-center gap-2 text-white px-4 h-11 !rounded-xl transition-all duration-300 text-xs disabled:opacity-60 font-bold uppercase tracking-widest"
                >
                  {connectingGoogle ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Google
                </button>
              ) : (
                <motion.div
                  whileHover={{ scale: 1.05, translateY: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <button
                    onClick={fetchGoogleEvents}
                    disabled={loadingGoogle}
                    className="btn-glass flex items-center justify-center gap-2 text-white px-4 h-11 !rounded-xl transition-all duration-300 text-xs font-bold uppercase tracking-widest"
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
                >
                  <button
                    onClick={handleConnectNotion}
                    disabled={connectingNotion}
                    className="btn-glass flex items-center justify-center gap-2 text-white px-4 h-11 !rounded-xl transition-all duration-300 text-xs font-bold uppercase tracking-widest"
                  >
                    {connectingNotion ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Notion
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  whileHover={{ scale: 1.05, translateY: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <button
                    onClick={() => fetchNotionTasks()}
                    disabled={loadingNotion}
                    className="btn-glass flex items-center justify-center gap-2 text-white px-4 h-11 !rounded-xl transition-all duration-300 text-xs font-bold uppercase tracking-widest"
                  >
                    {loadingNotion ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Notion
                  </button>
                </motion.div>
              )}
            </div>
          }
          onAddEvent={(day) => {
            setNewEventDate(format(day, "yyyy-MM-dd"));
            setIsCreateModalOpen(true);
          }}
          onEventClick={handleEventClick}
          onDateChange={(date) => setCurrentDate(date)}
        />
      </div>

      {/* Painel lateral — Atividades de Hoje */}
      <aside className="hidden lg:flex w-[340px] shrink-0 liquid-glass rounded-3xl overflow-hidden flex-col">
        <div className="p-5 border-b border-white/5 shrink-0">
          <h3 className="text-lg font-bold text-white tracking-tight">Atividades de Hoje</h3>
          <p className="text-white/40 text-xs mt-0.5 capitalize">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 min-h-0">
          {todayItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 opacity-30">
              <CalendarIcon className="w-10 h-10" />
              <p className="text-sm text-white text-center">Nenhuma atividade<br />para hoje</p>
            </div>
          ) : (
            todayItems.map((event) => {
              const st = eventVisualStatus(event);
              return (
                <div
                  key={event.id}
                  onClick={() => handleEventClick(event)}
                  className={cn(
                    "liquid-glass !rounded-2xl p-4 cursor-pointer hover:bg-white/[0.05] transition-all border",
                    st === 'done' ? "!border-green-500/30" : st === 'ongoing' ? "!border-blue-500/30" : "!border-white/10"
                  )}
                >
                  <h4 className="text-white font-bold text-sm leading-snug line-clamp-2">{event.name}</h4>
                  {event.clients && event.clients.length > 0 && (
                    <p className="text-white/40 text-xs mt-1 truncate">{event.clients[0]}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-3 text-white/50">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[11px] font-bold">{event.time || 'Dia todo'}</span>
                  </div>
                  <div className="mt-3 h-1 rounded-full bg-white/5 overflow-hidden">
                    <div className={cn(
                      "h-full rounded-full",
                      st === 'done' ? "w-full bg-green-400" : st === 'ongoing' ? "w-1/2 bg-blue-400" : "w-1/4 bg-primary"
                    )} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>
      </div>





      {/* Modal do Dia Selecionado */}
      <Dialog open={selectedDay !== null} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="sm:max-w-[820px] h-[85vh] border-white/[0.05] shadow-2xl text-white !p-0 !gap-0 !flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-white/[0.05] shrink-0">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-tight">
                {selectedDay} de {MONTHS[currentDate.getMonth()]}
              </DialogTitle>
            </DialogHeader>
          </div>

          {/* Body — 2 colunas */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            <style>{`
              .custom-scrollbar::-webkit-scrollbar {
                width: 6px;
              }
              .custom-scrollbar::-webkit-scrollbar-track {
                background: transparent;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb {
                background: rgba(104, 41, 192, 0.2);
                border-radius: 10px;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: rgba(104, 41, 192, 0.4);
              }
            `}</style>

            {/* Esquerda: lista de atividades */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 border-r border-white/[0.05]">
              <div>
            {selectedDay && (() => {
              const dayEvents = getEventsForDay(selectedDay);
              const dayTasks = getNotionTasksForDay(selectedDay);

              const allItems = [
                ...dayEvents.map(e => {
                   let clientName = undefined;
                   if (e.title && e.title.includes(' - ')) {
                       const parts = e.title.split(' - ');
                       clientName = parts[parts.length - 1].trim();
                   }
                   return { 
                     type: 'google' as const, 
                     id: e.id, 
                     title: e.title, 
                     time: e.start, 
                     end: e.end,
                     isAllDay: e.allDay,
                     color: getEventColor(e.colorId).split(' ')[0] || 'bg-primary/20', 
                     meetLink: e.hangoutLink,
                     status: undefined,
                     client: clientName
                   };
                }),
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
                    clients: t.clients,
                    client: (t as any).client
                   };
                })
              ];

              // Ordenação padrão: com hora primeiro, sem hora por último
              const defaultSorted = [...allItems].sort((a, b) => {
                const hasTimeA = a.time && !(a as any).isAllDay;
                const hasTimeB = b.time && !(b as any).isAllDay;

                if (hasTimeA && hasTimeB) {
                  return new Date(a.time!).getTime() - new Date(b.time!).getTime();
                }
                if (hasTimeA) return -1;
                if (hasTimeB) return 1;
                return 0;
              });

              // Aplica ordem customizada salva (se existir), mantendo novos itens no fim
              const key = dayKey(selectedDay);
              const savedOrder = activityOrder[key];
              let sortedItems = defaultSorted;
              if (savedOrder && savedOrder.length > 0) {
                const indexOf = (id: string) => {
                  const i = savedOrder.indexOf(id);
                  return i === -1 ? Number.MAX_SAFE_INTEGER : i;
                };
                sortedItems = [...allItems].sort((a, b) => {
                  const ia = indexOf(a.id), ib = indexOf(b.id);
                  if (ia === ib) {
                    // ambos novos (não salvos): usa ordem padrão por tempo
                    return defaultSorted.indexOf(a) - defaultSorted.indexOf(b);
                  }
                  return ia - ib;
                });
              }

              if (sortedItems.length === 0) {
                return <p className="text-sm text-Porceli-gray-400 text-center py-4">Nenhum evento neste dia.</p>;
              }

              const handleDragEnd = (result: DropResult) => {
                if (!result.destination) return;
                const reordered = [...sortedItems];
                const [moved] = reordered.splice(result.source.index, 1);
                reordered.splice(result.destination.index, 0, moved);
                saveActivityOrder(key, reordered.map(i => i.id));
              };

              return (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="day-activities">
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                        {sortedItems.map((item, index) => (
                          <Draggable key={item.id} draggableId={item.id} index={index}>
                            {(prov, snapshot) => {
                              const cardEl = (
                <div
                  ref={prov.innerRef}
                  {...prov.draggableProps}
                  onClick={() => {
                    setEditingItem(item);
                    setIsEditActivityModalOpen(true);
                  }}
                  className={`liquid-glass p-3 sm:p-4 rounded-2xl dashboard-glow relative group grid grid-cols-[auto_1fr_90px] items-center gap-2 transition-all cursor-pointer border
                    ${snapshot.isDragging ? 'ring-2 ring-primary/40 shadow-xl' : ''}
                    ${item.status === 'Realizado' || item.status === 'done' || isPastMeeting(item)
                      ? '!border-green-500/30 hover:!border-green-500/60'
                      : item.status === 'Em andamento' || isOngoing(item)
                      ? '!border-blue-500/30 hover:!border-blue-500/60'
                      : 'border-white/[0.05] hover:!border-white/[0.15]'}`}
                >
                  {/* Handle de arrastar */}
                  <div
                    {...prov.dragHandleProps}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-center text-white/20 hover:text-white/50 cursor-grab active:cursor-grabbing transition-colors -ml-1"
                    title="Arraste para reordenar"
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>
                  {/* Coluna 1: Info */}
                  <div className="flex items-center min-w-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug">
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
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {item.time && !item.isAllDay && (
                           <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-primary" />
                              <span className="text-[11px] text-primary font-bold">
                                 {formatTime(item.time)}
                              </span>
                           </div>
                        )}
                        {(item.isAllDay || (item.type === 'notion' && !item.time)) && (
                          <div className="flex items-center gap-1.5">
                             <Clock className="w-3.5 h-3.5 text-white/20" />
                             <span className="text-[11px] text-white/20 font-bold uppercase tracking-wider">
                                Tarefa do Dia
                             </span>
                          </div>
                        )}
                        {((item as any).clients?.length > 0 || (item as any).client) ? (
                          <div className="flex items-center gap-1">
                            <Tag className="w-3 h-3 text-primary/60 flex-shrink-0" />
                            <span className="text-[11px] text-primary/80 font-semibold tracking-tight truncate max-w-[160px]">
                              {(item as any).clients?.length > 0
                                ? (item as any).clients.join(', ')
                                : (item as any).client}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Tag className="w-3 h-3 text-white/10 flex-shrink-0" />
                            <span className="text-[11px] text-white/20 font-semibold tracking-tight">
                              Sem cliente
                            </span>
                          </div>
                        )}
                      </div>
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
                              );
                              return snapshot.isDragging ? createPortal(cardEl, document.body) : cardEl;
                            }}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              );
            })()}
            </div>
            </div>

            {/* Direita: formulário + trancar dia */}
            <div className="w-[300px] shrink-0 overflow-y-auto custom-scrollbar p-5 flex flex-col gap-4">

              {/* Trancar dia */}
              <div className={`flex items-center justify-between p-3 rounded-xl border transition-all ${selectedDay && isDayLocked(selectedDay) ? 'bg-red-500/10 border-red-500/30' : 'bg-white/[0.03] border-white/[0.05]'}`}>
                <div className="flex items-center gap-2">
                  {selectedDay && isDayLocked(selectedDay)
                    ? <LockIcon className="w-4 h-4 text-red-400" />
                    : <LockOpenIcon className="w-4 h-4 text-white/30" />}
                  <span className={`text-xs font-bold uppercase tracking-wider ${selectedDay && isDayLocked(selectedDay) ? 'text-red-400' : 'text-white/40'}`}>
                    {selectedDay && isDayLocked(selectedDay) ? 'Dia Trancado' : 'Trancar Dia'}
                  </span>
                </div>
                <Switch
                  checked={selectedDay ? isDayLocked(selectedDay) : false}
                  onCheckedChange={() => selectedDay && toggleLockDay(selectedDay)}
                  className="scale-75"
                />
              </div>

              {/* Formulário */}
              <div className={`space-y-3 ${selectedDay && isDayLocked(selectedDay) ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">
                  {createMeetLink ? "Novo evento no Google" : "Nova tarefa no Notion"}
                </p>

                <input
                  type="text"
                  placeholder="Título da atividade"
                  className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 text-white placeholder:text-white/20 h-10 rounded-xl px-3 transition-all outline-none text-sm"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateActivity(false)}
                />

                <TimePicker value={newEventTime} onChange={(time) => setNewEventTime(time)} />

                <input
                  type="text"
                  placeholder="Cliente (opcional)"
                  className="w-full bg-white/[0.03] border border-white/[0.05] focus:border-primary/50 text-white placeholder:text-white/20 h-10 rounded-xl px-3 transition-all outline-none text-sm"
                  value={newEventClient}
                  onChange={(e) => setNewEventClient(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateActivity(false)}
                />

                <div className="space-y-1.5 p-3 bg-white/[0.03] border border-white/[0.05] rounded-xl">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Recorrência</label>
                  <Select value={recurrenceType || "none"} onValueChange={(val) => setRecurrenceType(val === "none" ? "" as any : val as any)}>
                    <SelectTrigger className="w-full bg-white/[0.03] border-white/[0.08] text-white/80 h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                      <SelectItem value="none">Nunca</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="biweekly">Quinzenal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/[0.05] rounded-xl">
                  <div>
                    <Label className="text-white font-medium text-sm cursor-pointer" onClick={() => setCreateMeetLink(!createMeetLink)}>Google Meet</Label>
                    <p className="text-white/40 text-[11px]">{createMeetLink ? "Evento com link Meet" : "Salvar no Notion"}</p>
                  </div>
                  <Switch checked={createMeetLink} onCheckedChange={setCreateMeetLink} />
                </div>

                <motion.button
                  whileHover={!creatingEvent && newEventTitle.trim() ? { scale: 1.02 } : {}}
                  whileTap={!creatingEvent && newEventTitle.trim() ? { scale: 0.97 } : {}}
                  disabled={creatingEvent || !newEventTitle.trim()}
                  onClick={() => handleCreateActivity(false)}
                  className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-xl h-10 text-xs font-bold transition-all flex items-center justify-center uppercase tracking-wider"
                >
                  {creatingEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : "Adicionar"}
                </motion.button>
              </div>
            </div>

          </div>{/* fim body */}
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateModalOpen} onOpenChange={(open) => !open && setIsCreateModalOpen(false)}>
        <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto border-white/[0.05] shadow-2xl text-white !p-0 !gap-0">
          <DialogHeader className="p-6 border-b border-white/[0.05]">
            <DialogTitle className="text-xl font-bold tracking-tight">
               {createMeetLink ? "Novo Evento no Google" : "Nova Tarefa no Notion"}
            </DialogTitle>
            <DialogDescription className="text-white/40">
              Preencha os detalhes da nova atividade
            </DialogDescription>
          </DialogHeader>
          <div className="p-5 space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Título</label>
              <input 
                type="text"
                placeholder="Ex: Reunião com Cliente"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 text-white placeholder:text-white/20 h-10 rounded-xl px-4 transition-all outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Cliente</label>
              <input 
                type="text"
                placeholder="Nome do cliente"
                value={newEventClient}
                onChange={(e) => setNewEventClient(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 text-white placeholder:text-white/20 h-10 rounded-xl px-4 transition-all outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Data</label>
                <DatePicker 
                  date={newEventDate ? new Date(newEventDate + 'T12:00:00') : undefined}
                  setDate={(date) => setNewEventDate(date ? format(date, "yyyy-MM-dd") : "")}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Horário</label>
                <TimePicker 
                  value={newEventTime}
                  onChange={setNewEventTime}
                />
              </div>
            </div>

            <div className="space-y-1 p-3 bg-white/[0.03] border border-white/[0.05] rounded-xl mt-1">
               <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Recorrencia</label>
               <Select
                 value={recurrenceType || "none"}
                 onValueChange={(val) => {
                   const type = val === "none" ? "" : val;
                   setRecurrenceType(type as any);
                 }}
               >
                 <SelectTrigger className="w-full bg-white/[0.03] border-white/[0.08] text-white/80 h-9">
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

            <div className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/[0.05] rounded-xl mt-1">
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

            <div className="flex gap-3 pt-4 mt-4 border-t border-white/[0.05]">
              <motion.div 
                className="flex-1" 
                whileHover={{ scale: 1.05, translateY: -2 }} 
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn-danger-glass w-full h-10 rounded-xl font-bold transition-all"
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
                  className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white w-full h-10 rounded-xl shadow-[0_0_20px_rgba(104,41,192,0.3)] font-bold transition-all flex items-center justify-center gap-2"
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
        <DialogContent className="sm:max-w-[450px] border-white/[0.05] shadow-2xl text-white !p-0 !gap-0">
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
          
          <div className="p-5 space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Título</label>
              <input 
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 text-white placeholder:text-white/20 h-10 rounded-xl px-4 transition-all outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Data</label>
                <DatePicker 
                  date={editDate}
                  setDate={setEditDate}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Horário</label>
                <TimePicker 
                  value={editTime}
                  onChange={setEditTime} 
                />
              </div>
            </div>

            {(editingItem?.type === 'notion' || editingItem?.type === 'crm') && (
               <div className="space-y-2 pt-1">
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
                           supabase.from("recurring_tasks").update({ status: "completed" }).eq("id", editingItem?.id).then(() => {});
                         }
                         setIsEditActivityModalOpen(false);
                       }}
                       className="w-full liquid-glass hover:bg-white/10 text-white/70 border-white/5 h-10 px-4 rounded-xl transition-all flex items-center justify-center gap-2 group cursor-pointer"
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
                           supabase.from("recurring_tasks").update({ status: "in_progress" }).eq("id", editingItem?.id).then(() => {});
                         }
                         setIsEditActivityModalOpen(false);
                       }}
                       className="w-full liquid-glass hover:bg-white/10 text-white/70 border-white/5 h-10 px-4 rounded-xl transition-all flex items-center justify-center gap-2 group cursor-pointer"
                     >
                       <Clock className="w-4 h-4 text-white/40 group-hover:text-blue-500 transition-colors" />
                       <span className="text-[11px] font-black uppercase tracking-widest group-hover:text-white transition-colors">Andamento</span>
                     </button>
                   </motion.div>
                 </div>
               </div>
            )}

            <div className="flex gap-3 pt-4 mt-4 border-t border-white/[0.05]">
              <motion.div 
                className="flex-1" 
                whileHover={{ scale: 1.05, translateY: -2 }} 
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Button
                  variant="ghost"
                  onClick={() => setIsEditActivityModalOpen(false)}
                  className="btn-danger-glass w-full h-11 rounded-xl font-bold transition-all"
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
                <Button onClick={handleSaveEdit} className="btn-primary-glass !text-white w-full h-11 rounded-xl font-bold transition-all flex items-center justify-center gap-2">
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
                  className="btn-danger-glass h-11 w-11 rounded-xl transition-all !text-white"
                  title="Excluir Atividade"
                >
                  <Trash2 className="w-5 h-5 text-white" />
                </Button>
              </motion.div>
            </div>
        </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="liquid-glass border-white/10 shadow-2xl text-white">
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
              className="btn-danger-glass rounded-xl h-11 px-8 font-bold transition-all uppercase tracking-wider text-xs"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

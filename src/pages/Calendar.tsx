import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Link2,
  Link2Off,
  RefreshCw,
  Settings,
  User,
  XCircle,
} from "lucide-react";

// ─── Ícones inline para Google e Notion ───────────────────────────────────────
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function NotionIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"/>
    </svg>
  );
}

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Integration {
  id: string;
  provider: string;
  is_active: boolean;
  last_sync_at: string | null;
  config: Record<string, string>;
}

interface SdrMeeting {
  id: string;
  scheduled_at: string;
  status: string;
  leads?: { name: string; company: string | null } | null;
}

// ─── Hook: buscar integração ──────────────────────────────────────────────────
function useIntegration(provider: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["integration", provider],
    queryFn: async () => {
      const { data } = await supabase
        .from("integrations")
        .select("*")
        .eq("user_id", user!.id)
        .eq("provider", provider)
        .maybeSingle();
      return data as Integration | null;
    },
    enabled: !!user,
  });
}

// ─── Hook: buscar reuniões ────────────────────────────────────────────────────
function useMeetings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["sdr_meetings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sdr_meetings")
        .select("id, scheduled_at, status, leads(name, company)")
        .eq("leads.user_id", user!.id)
        .order("scheduled_at", { ascending: true });
      return (data ?? []) as SdrMeeting[];
    },
    enabled: !!user,
  });
}

// ─── Componente: Card de integração ───────────────────────────────────────────
interface IntegrationCardProps {
  provider: "google_calendar" | "notion";
  label: string;
  icon: React.ReactNode;
  description: string;
  integration: Integration | null | undefined;
  isLoading: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onSync: () => void;
  isSyncing: boolean;
  children?: React.ReactNode;
}

function IntegrationCard({
  label,
  icon,
  description,
  integration,
  isLoading,
  onConnect,
  onDisconnect,
  onSync,
  isSyncing,
  children,
}: IntegrationCardProps) {
  const connected = integration?.is_active;

  return (
    <Card className="bg-white/5 border-white/10 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-medium">{label}</span>
              {connected ? (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                  Conectado
                </Badge>
              ) : (
                <Badge className="bg-white/10 text-white/40 border-white/10 text-xs">
                  Desconectado
                </Badge>
              )}
            </div>
            <p className="text-white/40 text-xs mt-0.5">{description}</p>
          </div>
        </div>

        {connected ? (
          <button
            onClick={onDisconnect}
            className="text-white/30 hover:text-red-400 transition-colors"
            title="Desconectar"
          >
            <Link2Off className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      {connected && integration?.last_sync_at && (
        <p className="text-white/30 text-xs flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          Última sync:{" "}
          {new Date(integration.last_sync_at).toLocaleString("pt-BR")}
        </p>
      )}

      {children}

      <div className="flex gap-2 pt-1">
        {connected ? (
          <Button
            size="sm"
            variant="outline"
            className="border-white/10 text-white/70 hover:text-white hover:bg-white/5 gap-2"
            onClick={onSync}
            disabled={isSyncing}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Sincronizando..." : "Sincronizar agora"}
          </Button>
        ) : (
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 text-white gap-2"
            onClick={onConnect}
            disabled={isLoading}
          >
            <Link2 className="w-3.5 h-3.5" />
            Conectar {label}
          </Button>
        )}
      </div>
    </Card>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function CalendarPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: gcalIntegration, isLoading: gcalLoading } = useIntegration("google_calendar");
  const { data: notionIntegration, isLoading: notionLoading } = useIntegration("notion");
  const { data: meetings = [] } = useMeetings();

  const [notionToken, setNotionToken] = useState("");
  const [notionDbId, setNotionDbId] = useState("");
  const [syncingGcal, setSyncingGcal] = useState(false);
  const [syncingNotion, setSyncingNotion] = useState(false);

  // Pré-preenche campos do Notion se já existe integração
  useEffect(() => {
    if (notionIntegration?.config) {
      setNotionToken(notionIntegration.config.notion_token ?? "");
      setNotionDbId(notionIntegration.config.database_id ?? "");
    }
  }, [notionIntegration]);

  // Detecta retorno do OAuth do Google (/calendar?code=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      handleGoogleOAuthCode(code);
      // Limpa a URL
      window.history.replaceState({}, "", "/calendar");
    }
  }, []);

  // ── Google: inicia OAuth ───────────────────────────────────────────────────
  const handleConnectGoogle = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      toast.error("Configure VITE_GOOGLE_CLIENT_ID nas variáveis de ambiente.");
      return;
    }
    const redirectUri = `${window.location.origin}/calendar`;
    const scope = [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.readonly",
    ].join(" ");

    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", scope);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");

    window.location.href = url.toString();
  };

  // ── Google: troca code por tokens via Edge Function ────────────────────────
  const handleGoogleOAuthCode = async (code: string) => {
    try {
      toast.loading("Conectando com Google Calendar...");
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await supabase.functions.invoke("google-oauth-exchange", {
        body: {
          code,
          redirect_uri: `${window.location.origin}/calendar`,
        },
      });

      if (res.error) throw new Error(res.error.message);
      toast.dismiss();
      toast.success("Google Calendar conectado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["integration", "google_calendar"] });
    } catch (err: unknown) {
      toast.dismiss();
      toast.error("Erro ao conectar Google Calendar: " + (err as Error).message);
    }
  };

  // ── Google: sync ────────────────────────────────────────────────────────────
  const handleSyncGcal = async () => {
    setSyncingGcal(true);
    try {
      const res = await supabase.functions.invoke("google-calendar-sync", {
        body: { meetings },
      });
      if (res.error) throw new Error(res.error.message);
      toast.success(`${res.data?.synced ?? 0} reunião(ões) sincronizada(s) com Google Calendar.`);
      queryClient.invalidateQueries({ queryKey: ["integration", "google_calendar"] });
    } catch (err: unknown) {
      toast.error("Erro ao sincronizar: " + (err as Error).message);
    } finally {
      setSyncingGcal(false);
    }
  };

  // ── Google: desconectar ────────────────────────────────────────────────────
  const handleDisconnectGoogle = async () => {
    await supabase
      .from("integrations")
      .update({ is_active: false, access_token: null, refresh_token: null })
      .eq("user_id", user!.id)
      .eq("provider", "google_calendar");
    queryClient.invalidateQueries({ queryKey: ["integration", "google_calendar"] });
    toast.success("Google Calendar desconectado.");
  };

  // ── Notion: salvar token ───────────────────────────────────────────────────
  const handleConnectNotion = async () => {
    if (!notionToken.trim() || !notionDbId.trim()) {
      toast.error("Preencha o Token e o ID do banco de dados do Notion.");
      return;
    }

    const { error } = await supabase
      .from("integrations")
      .upsert(
        {
          user_id: user!.id,
          provider: "notion",
          is_active: true,
          config: { notion_token: notionToken.trim(), database_id: notionDbId.trim() },
        },
        { onConflict: "user_id,provider" }
      );

    if (error) {
      toast.error("Erro ao salvar integração Notion: " + error.message);
    } else {
      toast.success("Notion conectado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["integration", "notion"] });
    }
  };

  // ── Notion: sync ────────────────────────────────────────────────────────────
  const handleSyncNotion = async () => {
    setSyncingNotion(true);
    try {
      const res = await supabase.functions.invoke("notion-sync", {
        body: { meetings },
      });
      if (res.error) throw new Error(res.error.message);
      toast.success(`${res.data?.synced ?? 0} reunião(ões) enviada(s) para o Notion.`);
      queryClient.invalidateQueries({ queryKey: ["integration", "notion"] });
    } catch (err: unknown) {
      toast.error("Erro ao sincronizar Notion: " + (err as Error).message);
    } finally {
      setSyncingNotion(false);
    }
  };

  // ── Notion: desconectar ────────────────────────────────────────────────────
  const handleDisconnectNotion = async () => {
    await supabase
      .from("integrations")
      .update({ is_active: false, access_token: null })
      .eq("user_id", user!.id)
      .eq("provider", "notion");
    queryClient.invalidateQueries({ queryKey: ["integration", "notion"] });
    toast.success("Notion desconectado.");
  };

  // ── Agrupamento de reuniões por data ───────────────────────────────────────
  const grouped = meetings.reduce<Record<string, SdrMeeting[]>>((acc, m) => {
    const date = new Date(m.scheduled_at).toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });
    (acc[date] ??= []).push(m);
    return acc;
  }, {});

  const statusColor: Record<string, string> = {
    scheduled: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    confirmed: "bg-green-500/20 text-green-400 border-green-500/30",
    done: "bg-white/10 text-white/40 border-white/10",
    no_show: "bg-red-500/20 text-red-400 border-red-500/30",
    cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  const statusLabel: Record<string, string> = {
    scheduled: "Agendado",
    confirmed: "Confirmado",
    done: "Realizado",
    no_show: "No-show",
    cancelled: "Cancelado",
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 min-h-screen">
      {/* ── Coluna: reuniões ─────────────────────────────────────────────────── */}
      <div className="flex-1 space-y-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-white">Calendário de Reuniões</h1>
        </div>

        {meetings.length === 0 ? (
          <Card className="bg-white/5 border-white/10 p-12 text-center">
            <Calendar className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/40">Nenhuma reunião agendada ainda.</p>
            <p className="text-white/20 text-sm mt-1">
              As reuniões criadas pelo Agente SDR aparecem aqui.
            </p>
          </Card>
        ) : (
          Object.entries(grouped).map(([date, dayMeetings]) => (
            <motion.div
              key={date}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <h2 className="text-white/50 text-sm font-medium capitalize border-b border-white/10 pb-2">
                {date}
              </h2>
              {dayMeetings.map((m) => (
                <Card
                  key={m.id}
                  className="bg-white/5 border-white/10 p-4 flex items-center gap-4 hover:bg-white/8 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">
                      {m.leads?.name ?? "Lead não encontrado"}
                    </p>
                    {m.leads?.company && (
                      <p className="text-white/40 text-sm truncate">{m.leads.company}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className="text-white/60 text-sm">
                      {new Date(m.scheduled_at).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <Badge
                      className={`text-xs ${statusColor[m.status] ?? "bg-white/10 text-white/40"}`}
                    >
                      {statusLabel[m.status] ?? m.status}
                    </Badge>
                  </div>
                </Card>
              ))}
            </motion.div>
          ))
        )}
      </div>

      {/* ── Coluna: integrações ───────────────────────────────────────────────── */}
      <div className="w-full lg:w-80 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="w-4 h-4 text-white/40" />
          <span className="text-white/60 text-sm font-medium">Integrações</span>
        </div>

        {/* Google Calendar */}
        <IntegrationCard
          provider="google_calendar"
          label="Google Calendar"
          icon={<GoogleIcon />}
          description="Sincronize reuniões automaticamente com seu Google Calendar."
          integration={gcalIntegration}
          isLoading={gcalLoading}
          onConnect={handleConnectGoogle}
          onDisconnect={handleDisconnectGoogle}
          onSync={handleSyncGcal}
          isSyncing={syncingGcal}
        />

        {/* Notion */}
        <IntegrationCard
          provider="notion"
          label="Notion"
          icon={<NotionIcon />}
          description="Envie reuniões e leads para um banco de dados no Notion."
          integration={notionIntegration}
          isLoading={notionLoading}
          onConnect={handleConnectNotion}
          onDisconnect={handleDisconnectNotion}
          onSync={handleSyncNotion}
          isSyncing={syncingNotion}
        >
          {/* Campos de config do Notion */}
          {!notionIntegration?.is_active && (
            <div className="space-y-3 border-t border-white/10 pt-4">
              <div className="space-y-1.5">
                <Label className="text-white/60 text-xs">Integration Token</Label>
                <Input
                  type="password"
                  placeholder="secret_xxxxxxxxxxxxxxxx"
                  value={notionToken}
                  onChange={(e) => setNotionToken(e.target.value)}
                  className="bg-white/5 border-white/10 text-white text-sm h-8"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/60 text-xs">ID do Banco de Dados</Label>
                <Input
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={notionDbId}
                  onChange={(e) => setNotionDbId(e.target.value)}
                  className="bg-white/5 border-white/10 text-white text-sm h-8"
                />
                <p className="text-white/25 text-xs">
                  Encontre na URL da página do Notion após o nome do workspace.
                </p>
              </div>
            </div>
          )}
        </IntegrationCard>

        {/* Dica */}
        <Card className="bg-white/3 border-white/5 p-4">
          <p className="text-white/30 text-xs leading-relaxed">
            As reuniões são criadas automaticamente pelo Agente SDR. Use as integrações para
            manter seu calendário e base de dados sempre atualizados.
          </p>
        </Card>
      </div>
    </div>
  );
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export type RecipientType = "responsible" | "group" | "custom";
export type MessageStatus  = "pending" | "sent" | "failed" | "cancelled";

export interface ScheduledMessage {
  id:             string;
  user_id:        string;
  client_id:      string | null;
  client_name:    string | null;
  recipient_type: RecipientType;
  phone:          string;
  message:        string;
  scheduled_at:   string;
  status:         MessageStatus;
  sent_at:        string | null;
  error_message:  string | null;
  created_at:     string;
}

export interface CreateScheduledMessagePayload {
  client_id?:     string;
  client_name?:   string;
  recipient_type: RecipientType;
  phone:          string;
  message:        string;
  scheduled_at:   string; // ISO UTC
}

export function useScheduledMessages() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: messages = [], isLoading } = useQuery<ScheduledMessage[]>({
    queryKey: ["scheduled-messages", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scheduled_messages")
        .select("*")
        .eq("user_id", user!.id)
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ScheduledMessage[];
    },
    enabled: !!user?.id,
  });

  const createMessage = useMutation({
    mutationFn: async (payload: CreateScheduledMessagePayload) => {
      const { error } = await supabase
        .from("scheduled_messages")
        .insert({ ...payload, user_id: user!.id, status: "pending" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scheduled-messages"] });
      toast.success("Mensagem agendada com sucesso!");
    },
    onError: (err: Error) => toast.error("Erro ao agendar mensagem: " + err.message),
  });

  const cancelMessage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("scheduled_messages")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scheduled-messages"] });
      toast.success("Mensagem cancelada.");
    },
    onError: (err: Error) => toast.error("Erro ao cancelar: " + err.message),
  });

  return {
    messages,
    isLoading,
    createMessage:  createMessage.mutate,
    isCreating:     createMessage.isPending,
    cancelMessage:  cancelMessage.mutate,
    isCancelling:   cancelMessage.isPending,
  };
}

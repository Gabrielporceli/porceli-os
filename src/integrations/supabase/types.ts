export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      "Clientes Mensagem": {
        Row: {
          created_at: string
          id: number
          Nome: string | null
          Numero: string | null
        }
        Insert: {
          created_at?: string
          id: number
          Nome?: string | null
          Numero?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          Nome?: string | null
          Numero?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          cnpj: string
          company: string
          contract_end: string | null
          created_at: string | null
          email: string
          group_id: string | null
          id: string
          monthly_value: number | null
          payment_day: number | null
          phone: string
          plan: string | null
          responsible: string
          start_date: string | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          cnpj: string
          company: string
          contract_end?: string | null
          created_at?: string | null
          email: string
          group_id?: string | null
          id?: string
          monthly_value?: number | null
          payment_day?: number | null
          phone: string
          plan?: string | null
          responsible: string
          start_date?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          cnpj?: string
          company?: string
          contract_end?: string | null
          created_at?: string | null
          email?: string
          group_id?: string | null
          id?: string
          monthly_value?: number | null
          payment_day?: number | null
          phone?: string
          plan?: string | null
          responsible?: string
          start_date?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      contatos: {
        Row: {
          created_at: string
          id: string
          nome: string | null
          numero: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome?: string | null
          numero: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string | null
          numero?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          client_id: string
          created_at: string | null
          end_date: string
          id: string
          monthly_value: number
          start_date: string
          status: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          end_date: string
          id?: string
          monthly_value: number
          start_date: string
          status?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          end_date?: string
          id?: string
          monthly_value?: number
          start_date?: string
          status?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          client_id: string | null
          contact_name: string | null
          created_at: string | null
          direction: string | null
          id: string
          last_message: string | null
          numero: string | null
          phone: string
          remote_jid: string | null
          stage: string | null
          tag: string | null
          unread_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          client_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          direction?: string | null
          id?: string
          last_message?: string | null
          numero?: string | null
          phone: string
          remote_jid?: string | null
          stage?: string | null\n          tag?: string | null
          unread_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          client_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          direction?: string | null
          id?: string
          last_message?: string | null
          numero?: string | null
          phone?: string
          remote_jid?: string | null
          stage?: string | null
          tag?: string | null
          unread_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      "Dados Mensagem": {
        Row: {
          Cliente: string | null
          created_at: string
          Enviado: boolean | null
          Horario_envio: string | null
          id: number
          Mensagem: string | null
        }
        Insert: {
          Cliente?: string | null
          created_at?: string
          Enviado?: boolean | null
          Horario_envio?: string | null
          id: number
          Mensagem?: string | null
        }
        Update: {
          Cliente?: string | null
          created_at?: string
          Enviado?: boolean | null
          Horario_envio?: string | null
          id?: number
          Mensagem?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          chunk_index: number | null
          content: string | null
          created_at: string
          document_id: string | null
          embedding: string | null
          file_id: string | null
          id: number
          metadata: Json | null
          mime_type: string | null
          namespace: string | null
          row_type: Database["public"]["Enums"]["documents_row_type"]
          sha1_checksum: string | null
          source_url: string | null
          tags: string[] | null
          title: string | null
          updated_at: string
        }
        Insert: {
          chunk_index?: number | null
          content?: string | null
          created_at?: string
          document_id?: string | null
          embedding?: string | null
          file_id?: string | null
          id?: number
          metadata?: Json | null
          mime_type?: string | null
          namespace?: string | null
          row_type?: Database["public"]["Enums"]["documents_row_type"]
          sha1_checksum?: string | null
          source_url?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          chunk_index?: number | null
          content?: string | null
          created_at?: string
          document_id?: string | null
          embedding?: string | null
          file_id?: string | null
          id?: number
          metadata?: Json | null
          mime_type?: string | null
          namespace?: string | null
          row_type?: Database["public"]["Enums"]["documents_row_type"]
          sha1_checksum?: string | null
          source_url?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      finances: {
        Row: {
          amount: number
          category: string
          client_id: string | null
          created_at: string | null
          date: string
          description: string
          id: string
          is_recurring: boolean | null
          recurrence_type: string | null
          status: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          client_id?: string | null
          created_at?: string | null
          date: string
          description: string
          id?: string
          is_recurring?: boolean | null
          recurrence_type?: string | null
          status?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          client_id?: string | null\n          created_at?: string | null
          date?: string
          description?: string
          id?: string
          is_recurring?: boolean | null
          recurrence_type?: string | null
          status?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finances_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_entries: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          due_date: string
          id: string
          name: string
          paid_date: string | null
          reference: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          due_date: string
          id?: string
          name: string
          paid_date?: string | null
          reference: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          due_date?: string
          id?: string
          name?: string
          paid_date?: string | null
          reference?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_master: {
        Row: {
          created_at: string
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          created_at?: string
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      lead_events: {
        Row: {
          event_type: string
          id: number
          lead_id: string
          metadata: Json | null
          occurred_at: string | null
          user_id: string
        }
        Insert: {
          event_type: string
          id?: number
          lead_id: string
          metadata?: Json | null
          occurred_at?: string | null
          user_id: string
        }
        Update: {
          event_type?: string
          id?: number
          lead_id?: string
          metadata?: Json | null
          occurred_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          client_id: string | null
          company: string | null
          created_at: string | null
          email: string | null
          icp_fit: boolean | null
          id: string
          meeting_date: string | null
          name: string
          notes: string | null
          phone: string | null
          remotejid: string | null
          reuniao_realizada: boolean | null
          sdr_followup_count: number | null
          sdr_human_takeover_at: string | null
          sdr_last_contact_at: string | null
          sdr_qualified: boolean | null
          sdr_quality_score: number | null
          sdr_started_at: string | null
          sdr_status: string | null
          stage: string | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
          value: number | null
        }
        Insert: {
          client_id?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          icp_fit?: boolean | null
          id?: string
          meeting_date?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          remotejid?: string | null
          reuniao_realizada?: boolean | null
          sdr_followup_count?: number | null
          sdr_human_takeover_at?: string | null
          sdr_last_contact_at?: string | null
          sdr_qualified?: boolean | null
          sdr_quality_score?: number | null
          sdr_started_at?: string | null
          sdr_status?: string | null
          stage?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
          value?: number | null
        }
        Update: {
          client_id?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          icp_fit?: boolean | null
          id?: string
          meeting_date?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          remotejid?: string | null
          reuniao_realizada?: boolean | null
          sdr_followup_count?: number | null
          sdr_human_takeover_at?: string | null
          sdr_last_contact_at?: string | null
          sdr_qualified?: boolean | null
          sdr_quality_score?: number | null
          sdr_started_at?: string | null
          sdr_status?: string | null
          stage?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          conversa_id: string | null
          conversation_id: string
          created_at: string | null
          data_hora: string | null
          direcao: boolean | null
          id: string
          media_filename: string | null
          media_size: number | null
          media_type: string | null
          media_url: string | null
          mensagem: string | null
          nome_contato: string | null
          numero: string | null
          text: string
          updated_at: string | null
        }
        Insert: {
          conversa_id?: string | null
          conversation_id: string
          created_at?: string | null
          data_hora?: string | null
          direcao?: boolean | null
          id?: string
          media_filename?: string | null
          media_size?: number | null
          media_type?: string | null
          media_url?: string | null
          mensagem?: string | null
          nome_contato?: string | null
          numero?: string | null
          text: string
          updated_at?: string | null
        }
        Update: {
          conversa_id?: string | null
          conversation_id?: string
          created_at?: string | null
          data_hora?: string | null
          direcao?: boolean | null
          id?: string
          media_filename?: string | null
          media_size?: number | null
          media_type?: string | null
          media_url?: string | null
          mensagem?: string | null
          nome_contato?: string | null
          numero?: string | null
          text?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations_metrics"
            referencedColumns: ["conversation_id"]
          },
        ]
      }
      plans: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sdr_meetings: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          id: string
          lead_id: string
          rescheduled_count: number | null
          scheduled_at: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          lead_id: string
          rescheduled_count?: number | null
          scheduled_at: string
          status: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string
          rescheduled_count?: number | null
          scheduled_at?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sdr_meetings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      sdr_messages: {
        Row: {
          actor: string | null
          content: string | null
          created_at: string | null
          direction: string
          id: string
          lead_id: string | null
          type: string | null
        }
        Insert: {
          actor?: string | null
          content?: string | null\n          created_at?: string | null
          direction: string
          id?: string
          lead_id?: string | null
          type?: string | null
        }
        Update: {
          actor?: string | null
          content?: string | null
          created_at?: string | null
          direction?: string
          id?: string
          lead_id?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sdr_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      stages: {
        Row: {
          color: string
          created_at: string
          id: string
          is_default: boolean
          name: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string | null
          id: number
          payload: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          payload?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: number
          payload?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      conversations_metrics: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          messages_count: number | null
          phone: string | null
          remote_jid: string | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      apply_no_show: { Args: { p_user_id: string }; Returns: undefined }
      create_default_plans_for_user: {
        Args: { user_uuid: string }
        Returns: undefined
      }
      create_default_stages_for_user: {
        Args: { user_uuid: string }
        Returns: undefined
      }
      insert_message: {
        Args: {
          p_contact_name?: string
          p_date_time: string
          p_direction: boolean
          p_message: string
          p_message_id: string
          p_phone: string
          p_remote_jid: string
          p_user_id: string
        }
        Returns: string
      }
      match_documents: {
        Args: { filter?: Json; match_count?: number; query_embedding: string }
        Returns: {
          content: string
          id: number
          metadata: Json
          similarity: number
        }[]
      }
      process_webhook_message: {
        Args: {
          p_data_hora: string
          p_direcao: boolean
          p_media_filename: string
          p_media_key: string
          p_media_size: number
          p_media_type: string
          p_media_url: string
          p_mensagem: string
          p_nome_contato: string
          p_numero: string
          p_user_id: string
        }
        Returns: string
      }
      sdr_metrics: {
        Args: {
          p_end?: string
          p_period?: string
          p_start?: string
          p_user_id: string
        }
        Returns: Json
      }
      unaccent: { Args: { "": string }; Returns: string }
      update_client_tags_from_contracts: { Args: never; Returns: undefined }
      upsert_conversation: {
        Args: {
          p_contact_name?: string
          p_last_message?: string
          p_phone: string
          p_remote_jid: string
          p_user_id: string
        }
        Returns: string
      }
      webhook_insert_message: { Args: { webhook_data: Json }; Returns: string }
    }
    Enums: {
      documents_row_type: "doc" | "chunk"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R\n    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      documents_row_type: ["doc", "chunk"],
    },
  },
} as const

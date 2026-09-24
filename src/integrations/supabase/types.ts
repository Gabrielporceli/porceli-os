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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      automations: {
        Row: {
          category: string | null
          config: Json | null
          created_at: string | null
          description: string | null
          display_name: string
          enabled: boolean | null
          function_name: string
          icon: string | null
          id: string
          jobname: string
          last_triggered_at: string | null
          schedule: string
          trigger_type: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          config?: Json | null
          created_at?: string | null
          description?: string | null
          display_name: string
          enabled?: boolean | null
          function_name: string
          icon?: string | null
          id?: string
          jobname: string
          last_triggered_at?: string | null
          schedule: string
          trigger_type?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          config?: Json | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          enabled?: boolean | null
          function_name?: string
          icon?: string | null
          id?: string
          jobname?: string
          last_triggered_at?: string | null
          schedule?: string
          trigger_type?: string | null
          updated_at?: string | null
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
          latitude: number | null
          longitude: number | null
          monthly_value: number | null
          payment_day: number | null
          phone: string
          plan: string | null
          responsible: string
          single_payment: boolean
          start_date: string | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          cnpj?: string
          company: string
          contract_end?: string | null
          created_at?: string | null
          email?: string
          group_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          monthly_value?: number | null
          payment_day?: number | null
          phone?: string
          plan?: string | null
          responsible: string
          single_payment?: boolean
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
          latitude?: number | null
          longitude?: number | null
          monthly_value?: number | null
          payment_day?: number | null
          phone?: string
          plan?: string | null
          responsible?: string
          single_payment?: boolean
          start_date?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          client_id: string
          contract_url: string | null
          created_at: string | null
          end_date: string
          id: string
          monthly_value: number
          single_payment: boolean
          start_date: string
          status: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          client_id: string
          contract_url?: string | null
          created_at?: string | null
          end_date: string
          id?: string
          monthly_value: number
          single_payment?: boolean
          start_date: string
          status?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          client_id?: string
          contract_url?: string | null
          created_at?: string | null
          end_date?: string
          id?: string
          monthly_value?: number
          single_payment?: boolean
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
          category?: string
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
          client_id?: string | null
          created_at?: string | null
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
          asaas_payment_id: string | null
          client_id: string
          created_at: string | null
          due_date: string
          id: string
          name: string
          paid_date: string | null
          reference: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          asaas_payment_id?: string | null
          client_id: string
          created_at?: string | null
          due_date: string
          id?: string
          name: string
          paid_date?: string | null
          reference: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          asaas_payment_id?: string | null
          client_id?: string
          created_at?: string | null
          due_date?: string
          id?: string
          name?: string
          paid_date?: string | null
          reference?: string
          status?: string
          updated_at?: string | null
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
      funnel_maps: {
        Row: {
          created_at: string
          edges: Json
          id: string
          name: string
          nodes: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          edges?: Json
          id?: string
          name?: string
          nodes?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          edges?: Json
          id?: string
          name?: string
          nodes?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_calendar_events: {
        Row: {
          all_day: boolean | null
          color_id: string | null
          description: string | null
          end_time: string | null
          google_event_id: string
          html_link: string | null
          id: string
          location: string | null
          start_time: string | null
          status: string | null
          synced_at: string | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          all_day?: boolean | null
          color_id?: string | null
          description?: string | null
          end_time?: string | null
          google_event_id: string
          html_link?: string | null
          id?: string
          location?: string | null
          start_time?: string | null
          status?: string | null
          synced_at?: string | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          all_day?: boolean | null
          color_id?: string | null
          description?: string | null
          end_time?: string | null
          google_event_id?: string
          html_link?: string | null
          id?: string
          location?: string | null
          start_time?: string | null
          status?: string | null
          synced_at?: string | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      google_calendar_tokens: {
        Row: {
          access_token: string | null
          created_at: string | null
          expiry_date: number | null
          id: string
          refresh_token: string | null
          scope: string | null
          token_type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          access_token?: string | null
          created_at?: string | null
          expiry_date?: number | null
          id?: string
          refresh_token?: string | null
          scope?: string | null
          token_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          access_token?: string | null
          created_at?: string | null
          expiry_date?: number | null
          id?: string
          refresh_token?: string | null
          scope?: string | null
          token_type?: string | null
          updated_at?: string | null
          user_id?: string | null
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
          source: string | null
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
          source?: string | null
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
          source?: string | null
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
          {
            foreignKeyName: "leads_stage_fkey"
            columns: ["stage"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      note_boards: {
        Row: {
          created_at: string
          edges: Json
          folder: string
          id: string
          kind: string
          nodes: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          edges?: Json
          folder?: string
          id?: string
          kind?: string
          nodes?: Json
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          edges?: Json
          folder?: string
          id?: string
          kind?: string
          nodes?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          body: string
          client_id: string | null
          created_at: string
          extra_frontmatter: Json
          folder: string
          git_sha: string | null
          id: string
          lead_id: string | null
          synced_at: string | null
          tags: string[]
          title: string
          updated_at: string
          user_id: string
          vault_path: string | null
        }
        Insert: {
          body?: string
          client_id?: string | null
          created_at?: string
          extra_frontmatter?: Json
          folder?: string
          git_sha?: string | null
          id?: string
          lead_id?: string | null
          synced_at?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          user_id: string
          vault_path?: string | null
        }
        Update: {
          body?: string
          client_id?: string | null
          created_at?: string
          extra_frontmatter?: Json
          folder?: string
          git_sha?: string | null
          id?: string
          lead_id?: string | null
          synced_at?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
          vault_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      notes_sync_config: {
        Row: {
          base_path: string
          branch: string
          created_at: string
          enabled: boolean
          last_error: string | null
          last_sync_at: string | null
          repo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          base_path?: string
          branch?: string
          created_at?: string
          enabled?: boolean
          last_error?: string | null
          last_sync_at?: string | null
          repo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          base_path?: string
          branch?: string
          created_at?: string
          enabled?: boolean
          last_error?: string | null
          last_sync_at?: string | null
          repo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          asaas_customer_id: string | null
          asaas_payment_id: string | null
          channel: string
          client_name: string | null
          days_overdue: number | null
          error_message: string | null
          id: string
          metadata: Json | null
          sent_at: string | null
          status: string | null
          type: string
        }
        Insert: {
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          channel: string
          client_name?: string | null
          days_overdue?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          sent_at?: string | null
          status?: string | null
          type: string
        }
        Update: {
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          channel?: string
          client_name?: string | null
          days_overdue?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          sent_at?: string | null
          status?: string | null
          type?: string
        }
        Relationships: []
      }
      notion_config: {
        Row: {
          created_at: string | null
          database_id: string | null
          database_name: string | null
          id: string
          last_synced_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          database_id?: string | null
          database_name?: string | null
          id?: string
          last_synced_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          database_id?: string | null
          database_name?: string | null
          id?: string
          last_synced_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notion_tasks: {
        Row: {
          due_date: string | null
          id: string
          notion_page_id: string
          priority: string | null
          properties: Json | null
          status: string | null
          synced_at: string | null
          title: string | null
          url: string | null
        }
        Insert: {
          due_date?: string | null
          id?: string
          notion_page_id: string
          priority?: string | null
          properties?: Json | null
          status?: string | null
          synced_at?: string | null
          title?: string | null
          url?: string | null
        }
        Update: {
          due_date?: string | null
          id?: string
          notion_page_id?: string
          priority?: string | null
          properties?: Json | null
          status?: string | null
          synced_at?: string | null
          title?: string | null
          url?: string | null
        }
        Relationships: []
      }
      notion_tokens: {
        Row: {
          access_token: string
          bot_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
          workspace_id: string | null
          workspace_name: string | null
        }
        Insert: {
          access_token: string
          bot_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
          workspace_name?: string | null
        }
        Update: {
          access_token?: string
          bot_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
          workspace_name?: string | null
        }
        Relationships: []
      }
      plans: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      scheduled_messages: {
        Row: {
          client_id: string | null
          client_name: string | null
          created_at: string | null
          error_message: string | null
          id: string
          message: string
          phone: string
          recipient_type: string
          scheduled_at: string
          sent_at: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          client_id?: string | null
          client_name?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          message: string
          phone: string
          recipient_type: string
          scheduled_at: string
          sent_at?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          client_id?: string | null
          client_name?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          message?: string
          phone?: string
          recipient_type?: string
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      stages: {
        Row: {
          color: string
          created_at: string | null
          id: string
          is_default: boolean
          name: string
          position: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          is_default?: boolean
          name: string
          position?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          is_default?: boolean
          name?: string
          position?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
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
      manage_automation_cron: {
        Args: {
          p_action: string
          p_command?: string
          p_jobname: string
          p_schedule?: string
        }
        Returns: undefined
      }
      process_webhook_message: {
        Args: {
          p_contact_photo?: string
          p_data_hora?: string
          p_direcao?: boolean
          p_is_group?: boolean
          p_media_filename?: string
          p_media_key?: string
          p_media_size?: number
          p_media_type?: string
          p_media_url?: string
          p_mensagem?: string
          p_nome_contato?: string
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
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

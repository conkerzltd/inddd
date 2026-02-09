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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["app_role"] | null
          clinic_id: string
          created_at: string
          details: Json | null
          id: string
          new_status: Database["public"]["Enums"]["ticket_status"] | null
          previous_status: Database["public"]["Enums"]["ticket_status"] | null
          ticket_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          clinic_id: string
          created_at?: string
          details?: Json | null
          id?: string
          new_status?: Database["public"]["Enums"]["ticket_status"] | null
          previous_status?: Database["public"]["Enums"]["ticket_status"] | null
          ticket_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          clinic_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          new_status?: Database["public"]["Enums"]["ticket_status"] | null
          previous_status?: Database["public"]["Enums"]["ticket_status"] | null
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          avg_service_minutes: number
          close_time: string
          created_at: string
          grace_minutes: number
          id: string
          intake_open: boolean
          late_threshold_minutes: number
          name: string
          open_time: string
          phone: string | null
          session_paused: boolean
          timezone: string
          wa_message_template: string
        }
        Insert: {
          avg_service_minutes?: number
          close_time?: string
          created_at?: string
          grace_minutes?: number
          id?: string
          intake_open?: boolean
          late_threshold_minutes?: number
          name: string
          open_time?: string
          phone?: string | null
          session_paused?: boolean
          timezone?: string
          wa_message_template?: string
        }
        Update: {
          avg_service_minutes?: number
          close_time?: string
          created_at?: string
          grace_minutes?: number
          id?: string
          intake_open?: boolean
          late_threshold_minutes?: number
          name?: string
          open_time?: string
          phone?: string | null
          session_paused?: boolean
          timezone?: string
          wa_message_template?: string
        }
        Relationships: []
      }
      patient_links: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          last_opened_at: string | null
          revoked_at: string | null
          ticket_id: string
          token: string
          valid_until: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          last_opened_at?: string | null
          revoked_at?: string | null
          ticket_id: string
          token?: string
          valid_until: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          last_opened_at?: string | null
          revoked_at?: string | null
          ticket_id?: string
          token?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_links_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_links_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          appointment_time: string | null
          arrival_confirmed_at: string | null
          called_at: string | null
          clinic_id: string
          completed_at: string | null
          created_at: string
          id: string
          manual_insert_n: number | null
          manual_insert_position:
            | Database["public"]["Enums"]["insert_position"]
            | null
          miss_count: number
          patient_name: string | null
          patient_phone: string
          rank_key: number | null
          reinsert_note: string | null
          service_started_at: string | null
          source: Database["public"]["Enums"]["ticket_source"]
          status: Database["public"]["Enums"]["ticket_status"]
          type: Database["public"]["Enums"]["ticket_type"]
          visit_date: string
          visit_type: Database["public"]["Enums"]["visit_type"]
        }
        Insert: {
          appointment_time?: string | null
          arrival_confirmed_at?: string | null
          called_at?: string | null
          clinic_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          manual_insert_n?: number | null
          manual_insert_position?:
            | Database["public"]["Enums"]["insert_position"]
            | null
          miss_count?: number
          patient_name?: string | null
          patient_phone: string
          rank_key?: number | null
          reinsert_note?: string | null
          service_started_at?: string | null
          source: Database["public"]["Enums"]["ticket_source"]
          status?: Database["public"]["Enums"]["ticket_status"]
          type: Database["public"]["Enums"]["ticket_type"]
          visit_date?: string
          visit_type?: Database["public"]["Enums"]["visit_type"]
        }
        Update: {
          appointment_time?: string | null
          arrival_confirmed_at?: string | null
          called_at?: string | null
          clinic_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          manual_insert_n?: number | null
          manual_insert_position?:
            | Database["public"]["Enums"]["insert_position"]
            | null
          miss_count?: number
          patient_name?: string | null
          patient_phone?: string
          rank_key?: number | null
          reinsert_note?: string | null
          service_started_at?: string | null
          source?: Database["public"]["Enums"]["ticket_source"]
          status?: Database["public"]["Enums"]["ticket_status"]
          type?: Database["public"]["Enums"]["ticket_type"]
          visit_date?: string
          visit_type?: Database["public"]["Enums"]["visit_type"]
        }
        Relationships: [
          {
            foreignKeyName: "tickets_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_patient_queue_view: {
        Args: { p_token: string }
        Returns: Database["public"]["CompositeTypes"]["patient_queue_view"]
        SetofOptions: {
          from: "*"
          to: "patient_queue_view"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_user_clinic_ids: { Args: { _user_id: string }; Returns: string[] }
      has_role: {
        Args: {
          _clinic_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_clinic_member: {
        Args: { _clinic_id: string; _user_id: string }
        Returns: boolean
      }
      is_clinic_owner_or_admin: {
        Args: { _clinic_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "secretary" | "doctor"
      audit_action:
        | "TICKET_CREATED"
        | "LINK_SENT"
        | "ARRIVAL_CONFIRMED"
        | "CALLED"
        | "SERVICE_STARTED"
        | "DONE"
        | "MARKED_MISSED"
        | "MARKED_RETURNED"
        | "REINSERTED"
        | "SET_URGENT"
        | "PAUSED"
        | "RESUMED"
        | "INTAKE_CLOSED"
        | "INTAKE_OPENED"
        | "CANCELLED"
      insert_position: "AFTER_CURRENT" | "AFTER_N" | "END"
      ticket_source: "EXTERNAL" | "PHONE_CALL" | "WALK_IN"
      ticket_status:
        | "REMOTE_BOOKED"
        | "LINK_SENT"
        | "INSIDE_WAITING"
        | "CALLED"
        | "IN_SERVICE"
        | "DONE"
        | "MISSED"
        | "RETURNED"
        | "CANCELLED"
        | "CLOSED_OUT"
      ticket_type: "SCHEDULED" | "NORMAL" | "URGENT"
      visit_type: "NEW" | "CONSULTATION"
    }
    CompositeTypes: {
      patient_queue_view: {
        status_badge: string | null
        appointment_time: string | null
        eligible_position: number | null
        eta_min_minutes: number | null
        eta_max_minutes: number | null
        session_paused: boolean | null
        intake_open: boolean | null
        message: string | null
        expected_window_start: string | null
        expected_window_end: string | null
      }
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
      app_role: ["owner", "admin", "secretary", "doctor"],
      audit_action: [
        "TICKET_CREATED",
        "LINK_SENT",
        "ARRIVAL_CONFIRMED",
        "CALLED",
        "SERVICE_STARTED",
        "DONE",
        "MARKED_MISSED",
        "MARKED_RETURNED",
        "REINSERTED",
        "SET_URGENT",
        "PAUSED",
        "RESUMED",
        "INTAKE_CLOSED",
        "INTAKE_OPENED",
        "CANCELLED",
      ],
      insert_position: ["AFTER_CURRENT", "AFTER_N", "END"],
      ticket_source: ["EXTERNAL", "PHONE_CALL", "WALK_IN"],
      ticket_status: [
        "REMOTE_BOOKED",
        "LINK_SENT",
        "INSIDE_WAITING",
        "CALLED",
        "IN_SERVICE",
        "DONE",
        "MISSED",
        "RETURNED",
        "CANCELLED",
        "CLOSED_OUT",
      ],
      ticket_type: ["SCHEDULED", "NORMAL", "URGENT"],
      visit_type: ["NEW", "CONSULTATION"],
    },
  },
} as const

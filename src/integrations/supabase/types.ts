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
      clinic_payments: {
        Row: {
          amount: number
          clinic_id: string
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          paid_at: string
          period_end: string
          period_start: string
        }
        Insert: {
          amount: number
          clinic_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          paid_at?: string
          period_end: string
          period_start: string
        }
        Update: {
          amount?: number
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          paid_at?: string
          period_end?: string
          period_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_payments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          address_text: string | null
          allow_pause_intake: boolean | null
          allow_urgent_insert: boolean | null
          approved_at: string | null
          avg_service_minutes: number
          avg_service_time_seed_minutes: number | null
          clinic_whatsapp_phone: string | null
          close_time: string
          created_at: string
          financial_status: Database["public"]["Enums"]["financial_status"]
          governorate_ar: string | null
          grace_minutes: number
          id: string
          intake_open: boolean
          lat: number | null
          late_threshold_minutes: number
          lng: number | null
          locality_level2_ar: string | null
          locality_level2_type: string | null
          locality_level3_ar: string | null
          maps_url: string | null
          marketer_id: string | null
          name: string
          name_ar: string | null
          next_billing_date: string | null
          open_time: string
          phone: string | null
          primary_specialty_id: string | null
          profile_complete: boolean
          remote_showup_last_calculated_at: string | null
          remote_showup_rate: number
          serial_id: string | null
          session_paused: boolean
          status: Database["public"]["Enums"]["entity_status"]
          subscription_fee: number
          suspended_at: string | null
          timezone: string
          trial_ends_at: string | null
          wa_message_template: string
          whatsapp_e164_1: string | null
          whatsapp_e164_2: string | null
          whatsapp_local_1: string | null
          whatsapp_local_2: string | null
          working_hours_json: Json | null
        }
        Insert: {
          address_text?: string | null
          allow_pause_intake?: boolean | null
          allow_urgent_insert?: boolean | null
          approved_at?: string | null
          avg_service_minutes?: number
          avg_service_time_seed_minutes?: number | null
          clinic_whatsapp_phone?: string | null
          close_time?: string
          created_at?: string
          financial_status?: Database["public"]["Enums"]["financial_status"]
          governorate_ar?: string | null
          grace_minutes?: number
          id?: string
          intake_open?: boolean
          lat?: number | null
          late_threshold_minutes?: number
          lng?: number | null
          locality_level2_ar?: string | null
          locality_level2_type?: string | null
          locality_level3_ar?: string | null
          maps_url?: string | null
          marketer_id?: string | null
          name: string
          name_ar?: string | null
          next_billing_date?: string | null
          open_time?: string
          phone?: string | null
          primary_specialty_id?: string | null
          profile_complete?: boolean
          remote_showup_last_calculated_at?: string | null
          remote_showup_rate?: number
          serial_id?: string | null
          session_paused?: boolean
          status?: Database["public"]["Enums"]["entity_status"]
          subscription_fee?: number
          suspended_at?: string | null
          timezone?: string
          trial_ends_at?: string | null
          wa_message_template?: string
          whatsapp_e164_1?: string | null
          whatsapp_e164_2?: string | null
          whatsapp_local_1?: string | null
          whatsapp_local_2?: string | null
          working_hours_json?: Json | null
        }
        Update: {
          address_text?: string | null
          allow_pause_intake?: boolean | null
          allow_urgent_insert?: boolean | null
          approved_at?: string | null
          avg_service_minutes?: number
          avg_service_time_seed_minutes?: number | null
          clinic_whatsapp_phone?: string | null
          close_time?: string
          created_at?: string
          financial_status?: Database["public"]["Enums"]["financial_status"]
          governorate_ar?: string | null
          grace_minutes?: number
          id?: string
          intake_open?: boolean
          lat?: number | null
          late_threshold_minutes?: number
          lng?: number | null
          locality_level2_ar?: string | null
          locality_level2_type?: string | null
          locality_level3_ar?: string | null
          maps_url?: string | null
          marketer_id?: string | null
          name?: string
          name_ar?: string | null
          next_billing_date?: string | null
          open_time?: string
          phone?: string | null
          primary_specialty_id?: string | null
          profile_complete?: boolean
          remote_showup_last_calculated_at?: string | null
          remote_showup_rate?: number
          serial_id?: string | null
          session_paused?: boolean
          status?: Database["public"]["Enums"]["entity_status"]
          subscription_fee?: number
          suspended_at?: string | null
          timezone?: string
          trial_ends_at?: string | null
          wa_message_template?: string
          whatsapp_e164_1?: string | null
          whatsapp_e164_2?: string | null
          whatsapp_local_1?: string | null
          whatsapp_local_2?: string | null
          working_hours_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "clinics_marketer_id_fkey"
            columns: ["marketer_id"]
            isOneToOne: false
            referencedRelation: "marketers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinics_primary_specialty_id_fkey"
            columns: ["primary_specialty_id"]
            isOneToOne: false
            referencedRelation: "specialties"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          amount: number
          clinic_id: string
          created_at: string
          earned_date: string | null
          id: string
          marketer_id: string
          paid_at: string | null
          status: string
        }
        Insert: {
          amount?: number
          clinic_id: string
          created_at?: string
          earned_date?: string | null
          id?: string
          marketer_id: string
          paid_at?: string | null
          status?: string
        }
        Update: {
          amount?: number
          clinic_id?: string
          created_at?: string
          earned_date?: string | null
          id?: string
          marketer_id?: string
          paid_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_marketer_id_fkey"
            columns: ["marketer_id"]
            isOneToOne: false
            referencedRelation: "marketers"
            referencedColumns: ["id"]
          },
        ]
      }
      external_booking_apps: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          label_en: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          label_en: string
          sort_order: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label_en?: string
          sort_order?: number
        }
        Relationships: []
      }
      geo_localities: {
        Row: {
          governorate_ar: string
          id: string
          level2_ar: string
          level2_type: string
          level3_ar: string | null
        }
        Insert: {
          governorate_ar: string
          id?: string
          level2_ar: string
          level2_type: string
          level3_ar?: string | null
        }
        Update: {
          governorate_ar?: string
          id?: string
          level2_ar?: string
          level2_type?: string
          level3_ar?: string | null
        }
        Relationships: []
      }
      gov_codes: {
        Row: {
          code: string
          governorate_ar: string
        }
        Insert: {
          code: string
          governorate_ar: string
        }
        Update: {
          code?: string
          governorate_ar?: string
        }
        Relationships: []
      }
      marketer_attendance: {
        Row: {
          attendance_date: string
          created_at: string
          id: string
          marketer_id: string
          notes: string | null
          recorded_by: string | null
          status: Database["public"]["Enums"]["attendance_status"]
        }
        Insert: {
          attendance_date: string
          created_at?: string
          id?: string
          marketer_id: string
          notes?: string | null
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
        }
        Update: {
          attendance_date?: string
          created_at?: string
          id?: string
          marketer_id?: string
          notes?: string | null
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
        }
        Relationships: [
          {
            foreignKeyName: "marketer_attendance_marketer_id_fkey"
            columns: ["marketer_id"]
            isOneToOne: false
            referencedRelation: "marketers"
            referencedColumns: ["id"]
          },
        ]
      }
      marketer_ledger: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          marketer_id: string
          recorded_by: string | null
          reference_clinic_id: string | null
          tx_date: string
          tx_type: Database["public"]["Enums"]["ledger_tx_type"]
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          marketer_id: string
          recorded_by?: string | null
          reference_clinic_id?: string | null
          tx_date?: string
          tx_type: Database["public"]["Enums"]["ledger_tx_type"]
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          marketer_id?: string
          recorded_by?: string | null
          reference_clinic_id?: string | null
          tx_date?: string
          tx_type?: Database["public"]["Enums"]["ledger_tx_type"]
        }
        Relationships: [
          {
            foreignKeyName: "marketer_ledger_marketer_id_fkey"
            columns: ["marketer_id"]
            isOneToOne: false
            referencedRelation: "marketers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketer_ledger_reference_clinic_id_fkey"
            columns: ["reference_clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      marketer_password_reset_requests: {
        Row: {
          id: string
          marketer_id: string
          requested_at: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          id?: string
          marketer_id: string
          requested_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          id?: string
          marketer_id?: string
          requested_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketer_password_reset_requests_marketer_id_fkey"
            columns: ["marketer_id"]
            isOneToOne: false
            referencedRelation: "marketers"
            referencedColumns: ["id"]
          },
        ]
      }
      marketer_target_areas: {
        Row: {
          created_at: string
          governorate_ar: string
          id: string
          level2_ar: string | null
          level2_type: string | null
          marketer_id: string
        }
        Insert: {
          created_at?: string
          governorate_ar: string
          id?: string
          level2_ar?: string | null
          level2_type?: string | null
          marketer_id: string
        }
        Update: {
          created_at?: string
          governorate_ar?: string
          id?: string
          level2_ar?: string | null
          level2_type?: string | null
          marketer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketer_target_areas_marketer_id_fkey"
            columns: ["marketer_id"]
            isOneToOne: false
            referencedRelation: "marketers"
            referencedColumns: ["id"]
          },
        ]
      }
      marketer_users: {
        Row: {
          created_at: string
          marketer_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          marketer_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          marketer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketer_users_marketer_id_fkey"
            columns: ["marketer_id"]
            isOneToOne: false
            referencedRelation: "marketers"
            referencedColumns: ["id"]
          },
        ]
      }
      marketers: {
        Row: {
          absence_penalty_multiplier: number
          base_salary: number
          city_ar: string | null
          commission_per_clinic: number
          created_at: string
          created_by: string | null
          detailed_address: string | null
          governorate_ar: string | null
          id: string
          monthly_target_clinics: number
          must_set_password: boolean
          name: string
          primary_phone: string
          referral_code: string
          secondary_phone: string | null
          status: Database["public"]["Enums"]["entity_status"]
          target_areas: string[] | null
          updated_at: string
          whatsapp_link: string | null
          working_days_per_month: number
        }
        Insert: {
          absence_penalty_multiplier?: number
          base_salary?: number
          city_ar?: string | null
          commission_per_clinic?: number
          created_at?: string
          created_by?: string | null
          detailed_address?: string | null
          governorate_ar?: string | null
          id?: string
          monthly_target_clinics?: number
          must_set_password?: boolean
          name: string
          primary_phone: string
          referral_code: string
          secondary_phone?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          target_areas?: string[] | null
          updated_at?: string
          whatsapp_link?: string | null
          working_days_per_month?: number
        }
        Update: {
          absence_penalty_multiplier?: number
          base_salary?: number
          city_ar?: string | null
          commission_per_clinic?: number
          created_at?: string
          created_by?: string | null
          detailed_address?: string | null
          governorate_ar?: string | null
          id?: string
          monthly_target_clinics?: number
          must_set_password?: boolean
          name?: string
          primary_phone?: string
          referral_code?: string
          secondary_phone?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          target_areas?: string[] | null
          updated_at?: string
          whatsapp_link?: string | null
          working_days_per_month?: number
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
      specialties: {
        Row: {
          id: string
          sort_order: number
          specialty_ar: string
        }
        Insert: {
          id?: string
          sort_order: number
          specialty_ar: string
        }
        Update: {
          id?: string
          sort_order?: number
          specialty_ar?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          appointment_time: string | null
          arrival_confirmed_at: string | null
          called_at: string | null
          clinic_id: string
          completed_at: string | null
          created_at: string
          external_booking_app_id: string | null
          external_booking_app_other: string | null
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
          external_booking_app_id?: string | null
          external_booking_app_other?: string | null
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
          external_booking_app_id?: string | null
          external_booking_app_other?: string | null
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
          {
            foreignKeyName: "tickets_external_booking_app_id_fkey"
            columns: ["external_booking_app_id"]
            isOneToOne: false
            referencedRelation: "external_booking_apps"
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
      approve_clinic: { Args: { p_clinic_id: string }; Returns: Json }
      bootstrap_demo_clinic: { Args: never; Returns: string }
      call_next: { Args: { p_clinic_id: string }; Returns: Json }
      cancel_ticket: { Args: { p_ticket_id: string }; Returns: Json }
      close_out_day: { Args: { p_clinic_id: string }; Returns: Json }
      complete_ticket: { Args: { p_ticket_id: string }; Returns: Json }
      confirm_arrival: { Args: { p_ticket_id: string }; Returns: Json }
      create_ticket:
        | {
            Args: {
              p_appt_hhmm?: string
              p_clinic_id: string
              p_patient_name?: string
              p_patient_phone: string
              p_source: Database["public"]["Enums"]["ticket_source"]
              p_type: Database["public"]["Enums"]["ticket_type"]
              p_visit_type: Database["public"]["Enums"]["visit_type"]
            }
            Returns: Json
          }
        | {
            Args: {
              p_appt_hhmm?: string
              p_clinic_id: string
              p_external_booking_app_id?: string
              p_external_booking_app_other?: string
              p_patient_name?: string
              p_patient_phone: string
              p_source: Database["public"]["Enums"]["ticket_source"]
              p_type: Database["public"]["Enums"]["ticket_type"]
              p_visit_type: Database["public"]["Enums"]["visit_type"]
            }
            Returns: Json
          }
      delete_clinic: { Args: { p_clinic_id: string }; Returns: Json }
      generate_referral_code: { Args: never; Returns: string }
      get_marketer_login_state: {
        Args: { p_referral_code: string }
        Returns: Json
      }
      get_my_marketer_crm: { Args: never; Returns: Json }
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
      is_superadmin: { Args: { _user_id: string }; Returns: boolean }
      log_clinic_payment: {
        Args: { p_amount?: number; p_clinic_id: string; p_note?: string }
        Returns: Json
      }
      mark_missed: { Args: { p_ticket_id: string }; Returns: Json }
      mark_overdue_clinics: { Args: never; Returns: Json }
      mark_returned: { Args: { p_ticket_id: string }; Returns: Json }
      marketer_clear_must_set_password: { Args: never; Returns: Json }
      onboard_clinic: {
        Args: {
          p_governorate_ar?: string
          p_locality_level2_ar?: string
          p_locality_level2_type?: string
          p_locality_level3_ar?: string
          p_marketer_id?: string
          p_name_ar: string
          p_phone?: string
          p_primary_specialty_id?: string
        }
        Returns: string
      }
      recompute_clinic_showup_rate: {
        Args: { p_clinic_id: string; p_days?: number; p_min_sample?: number }
        Returns: Json
      }
      reinsert_returned: {
        Args: {
          p_insert_n?: number
          p_insert_position: Database["public"]["Enums"]["insert_position"]
          p_note?: string
          p_ticket_id: string
        }
        Returns: Json
      }
      request_marketer_password_reset: {
        Args: { p_referral_code: string }
        Returns: Json
      }
      seed_demo_day: { Args: { p_clinic_id: string }; Returns: number }
      send_patient_link: { Args: { p_ticket_id: string }; Returns: Json }
      set_intake_open: {
        Args: { p_clinic_id: string; p_open: boolean }
        Returns: Json
      }
      set_session_paused: {
        Args: { p_clinic_id: string; p_paused: boolean }
        Returns: Json
      }
      set_urgent_and_insert: {
        Args: {
          p_insert_n?: number
          p_insert_position: Database["public"]["Enums"]["insert_position"]
          p_note?: string
          p_ticket_id: string
        }
        Returns: Json
      }
      start_service: { Args: { p_ticket_id: string }; Returns: Json }
      suspend_clinic: { Args: { p_clinic_id: string }; Returns: Json }
      urlencode: { Args: { "": string }; Returns: string }
      validate_referral_code: { Args: { p_code: string }; Returns: Json }
    }
    Enums: {
      app_role: "owner" | "admin" | "secretary" | "doctor" | "superadmin"
      attendance_status: "present" | "absent" | "sick_leave"
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
        | "CLINIC_APPROVED"
        | "CLINIC_SUSPENDED"
        | "PAYMENT_LOGGED"
        | "COMMISSION_EARNED"
        | "OVERDUE_FLAGGED"
      entity_status: "draft" | "pending" | "active" | "blocked"
      financial_status: "trial" | "paid" | "overdue"
      insert_position: "AFTER_CURRENT" | "AFTER_N" | "END"
      ledger_tx_type:
        | "commission"
        | "bonus"
        | "salary"
        | "deduction"
        | "penalty"
        | "payout"
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
        clinic_name_ar: string | null
        clinic_lat: number | null
        clinic_lng: number | null
        clinic_maps_url: string | null
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
      app_role: ["owner", "admin", "secretary", "doctor", "superadmin"],
      attendance_status: ["present", "absent", "sick_leave"],
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
        "CLINIC_APPROVED",
        "CLINIC_SUSPENDED",
        "PAYMENT_LOGGED",
        "COMMISSION_EARNED",
        "OVERDUE_FLAGGED",
      ],
      entity_status: ["draft", "pending", "active", "blocked"],
      financial_status: ["trial", "paid", "overdue"],
      insert_position: ["AFTER_CURRENT", "AFTER_N", "END"],
      ledger_tx_type: [
        "commission",
        "bonus",
        "salary",
        "deduction",
        "penalty",
        "payout",
      ],
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

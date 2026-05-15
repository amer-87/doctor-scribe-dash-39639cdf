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
  public: {
    Tables: {
      admin_settings: {
        Row: {
          id: number
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          id?: number
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          id?: number
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      doctor_settings: {
        Row: {
          clinic_address: string
          clinic_name: string
          clinic_phone: string
          doctor_id: string
          doctor_name: string
          font_size: number
          footer_note: string
          logo_url: string | null
          print_size: string
          qr_size: number
          rx_prefix: string
          specialty: string
          theme_accent: string
          theme_bg: string
          theme_header: string
          theme_text: string
          updated_at: string
          working_hours: string
        }
        Insert: {
          clinic_address?: string
          clinic_name?: string
          clinic_phone?: string
          doctor_id: string
          doctor_name?: string
          font_size?: number
          footer_note?: string
          logo_url?: string | null
          print_size?: string
          qr_size?: number
          rx_prefix?: string
          specialty?: string
          theme_accent?: string
          theme_bg?: string
          theme_header?: string
          theme_text?: string
          updated_at?: string
          working_hours?: string
        }
        Update: {
          clinic_address?: string
          clinic_name?: string
          clinic_phone?: string
          doctor_id?: string
          doctor_name?: string
          font_size?: number
          footer_note?: string
          logo_url?: string | null
          print_size?: string
          qr_size?: number
          rx_prefix?: string
          specialty?: string
          theme_accent?: string
          theme_bg?: string
          theme_header?: string
          theme_text?: string
          updated_at?: string
          working_hours?: string
        }
        Relationships: []
      }
      login_logs: {
        Row: {
          created_at: string
          device_label: string | null
          email: string | null
          id: string
          ip_hint: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_label?: string | null
          email?: string | null
          id?: string
          ip_hint?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_label?: string | null
          email?: string | null
          id?: string
          ip_hint?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      patients: {
        Row: {
          added_by: string | null
          age: number | null
          chronic_diseases: string | null
          created_at: string
          doctor_id: string
          full_name: string
          gender: string | null
          id: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          added_by?: string | null
          age?: number | null
          chronic_diseases?: string | null
          created_at?: string
          doctor_id: string
          full_name: string
          gender?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          added_by?: string | null
          age?: number | null
          chronic_diseases?: string | null
          created_at?: string
          doctor_id?: string
          full_name?: string
          gender?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      prescriptions: {
        Row: {
          content: string
          created_at: string
          doctor_id: string
          id: string
          patient_id: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          doctor_id: string
          id?: string
          patient_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          doctor_id?: string
          id?: string
          patient_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          clinic_name: string | null
          created_at: string
          deactivation_reason: string | null
          doctor_id: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          rejection_reason: string | null
          specialty: string | null
          status: Database["public"]["Enums"]["account_status"]
          subscription_end: string | null
          subscription_start: string | null
          updated_at: string
        }
        Insert: {
          clinic_name?: string | null
          created_at?: string
          deactivation_reason?: string | null
          doctor_id?: string | null
          email: string
          full_name: string
          id: string
          is_active?: boolean
          phone?: string | null
          rejection_reason?: string | null
          specialty?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          subscription_end?: string | null
          subscription_start?: string | null
          updated_at?: string
        }
        Update: {
          clinic_name?: string | null
          created_at?: string
          deactivation_reason?: string | null
          doctor_id?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          rejection_reason?: string | null
          specialty?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          subscription_end?: string | null
          subscription_start?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_write: { Args: { _user_id: string }; Returns: boolean }
      get_effective_doctor_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved: { Args: { _user_id: string }; Returns: boolean }
      is_subscription_valid: { Args: { _user_id: string }; Returns: boolean }
      verify_prescription: {
        Args: { _id: string }
        Returns: {
          clinic_name: string
          created_at: string
          doctor_name: string
          id: string
          is_valid: boolean
          patient_name: string
          specialty: string
        }[]
      }
    }
    Enums: {
      account_status: "pending" | "approved" | "rejected"
      app_role: "admin" | "doctor" | "secretary"
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
      account_status: ["pending", "approved", "rejected"],
      app_role: ["admin", "doctor", "secretary"],
    },
  },
} as const

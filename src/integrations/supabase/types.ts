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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          is_active?: boolean
          name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tokens: {
        Row: {
          created_at: string
          id: string
          token: string
          updated_at: string
          used: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          token: string
          updated_at?: string
          used?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          token?: string
          updated_at?: string
          used?: boolean
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          contact_phone: string
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          sender_type: string
          sender_user_id: string | null
          session_id: string
        }
        Insert: {
          contact_phone: string
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          sender_type: string
          sender_user_id?: string | null
          session_id: string
        }
        Update: {
          contact_phone?: string
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          sender_type?: string
          sender_user_id?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      whatsapp_session_events: {
        Row: {
          attendant_id: string | null
          attendant_name: string
          created_at: string
          event_type: string
          id: string
          session_id: string
        }
        Insert: {
          attendant_id?: string | null
          attendant_name: string
          created_at?: string
          event_type: string
          id?: string
          session_id: string
        }
        Update: {
          attendant_id?: string | null
          attendant_name?: string
          created_at?: string
          event_type?: string
          id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_session_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      whatsapp_sessions: {
        Row: {
          assigned_to: string | null
          closed_at: string | null
          contact_name: string | null
          contact_phone: string
          created_at: string | null
          id: string
          paused_reason: string | null
          session_id: string
          status: string
          unread_count: number
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          closed_at?: string | null
          contact_name?: string | null
          contact_phone: string
          created_at?: string | null
          id?: string
          paused_reason?: string | null
          session_id: string
          status?: string
          unread_count?: number
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          closed_at?: string | null
          contact_name?: string | null
          contact_phone?: string
          created_at?: string | null
          id?: string
          paused_reason?: string | null
          session_id?: string
          status?: string
          unread_count?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_sessions_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "attendant" | "admin" | "super-admin"
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
  public: {
    Enums: {
      app_role: ["attendant", "admin", "super-admin"],
    },
  },
} as const

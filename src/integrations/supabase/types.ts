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
      alerts: {
        Row: {
          block_id: string
          created_at: string
          id: string
          is_recurring: boolean
          last_triggered_at: string | null
          rule_hours: number
          status: Database["public"]["Enums"]["alert_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          block_id: string
          created_at?: string
          id?: string
          is_recurring?: boolean
          last_triggered_at?: string | null
          rule_hours?: number
          status?: Database["public"]["Enums"]["alert_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          block_id?: string
          created_at?: string
          id?: string
          is_recurring?: boolean
          last_triggered_at?: string | null
          rule_hours?: number
          status?: Database["public"]["Enums"]["alert_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      block_metrics: {
        Row: {
          block_id: string
          id: string
          last_seen_at: string | null
          last_tractor_id: string | null
          passes_24h: number | null
          passes_7d: number | null
          total_passes: number | null
          updated_at: string
        }
        Insert: {
          block_id: string
          id?: string
          last_seen_at?: string | null
          last_tractor_id?: string | null
          passes_24h?: number | null
          passes_7d?: number | null
          total_passes?: number | null
          updated_at?: string
        }
        Update: {
          block_id?: string
          id?: string
          last_seen_at?: string | null
          last_tractor_id?: string | null
          passes_24h?: number | null
          passes_7d?: number | null
          total_passes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "block_metrics_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: true
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "block_metrics_last_tractor_id_fkey"
            columns: ["last_tractor_id"]
            isOneToOne: false
            referencedRelation: "tractors"
            referencedColumns: ["id"]
          },
        ]
      }
      block_visits: {
        Row: {
          block_id: string
          created_at: string
          ended_at: string | null
          id: string
          ping_count: number | null
          started_at: string
          tenant_id: string
          tractor_id: string
        }
        Insert: {
          block_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          ping_count?: number | null
          started_at: string
          tenant_id: string
          tractor_id: string
        }
        Update: {
          block_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          ping_count?: number | null
          started_at?: string
          tenant_id?: string
          tractor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "block_visits_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "block_visits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "block_visits_tractor_id_fkey"
            columns: ["tractor_id"]
            isOneToOne: false
            referencedRelation: "tractors"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          created_at: string
          crop: string | null
          farm_name: string | null
          geometry_geojson: Json
          id: string
          metadata: Json | null
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          crop?: string | null
          farm_name?: string | null
          geometry_geojson: Json
          id?: string
          metadata?: Json | null
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          crop?: string | null
          farm_name?: string | null
          geometry_geojson?: Json
          id?: string
          metadata?: Json | null
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gps_pings: {
        Row: {
          created_at: string
          id: string
          lat: number
          lon: number
          speed: number | null
          tenant_id: string
          tractor_id: string
          ts: string
        }
        Insert: {
          created_at?: string
          id?: string
          lat: number
          lon: number
          speed?: number | null
          tenant_id: string
          tractor_id: string
          ts: string
        }
        Update: {
          created_at?: string
          id?: string
          lat?: number
          lon?: number
          speed?: number | null
          tenant_id?: string
          tractor_id?: string
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "gps_pings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gps_pings_tractor_id_fkey"
            columns: ["tractor_id"]
            isOneToOne: false
            referencedRelation: "tractors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      tractors: {
        Row: {
          created_at: string
          id: string
          identifier: string
          last_lat: number | null
          last_lon: number | null
          last_seen_at: string | null
          metadata: Json | null
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          identifier: string
          last_lat?: number | null
          last_lon?: number | null
          last_seen_at?: string | null
          metadata?: Json | null
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          identifier?: string
          last_lat?: number | null
          last_lon?: number | null
          last_seen_at?: string | null
          metadata?: Json | null
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tractors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      alert_status: "active" | "triggered" | "resolved"
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
      alert_status: ["active", "triggered", "resolved"],
    },
  },
} as const

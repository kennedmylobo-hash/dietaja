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
      analytics_events: {
        Row: {
          created_at: string
          device_type: string | null
          event_type: string
          id: string
          metadata: Json | null
          page: string | null
          referrer: string | null
          scroll_depth: number | null
          section: string | null
          section_time_spent: number | null
          session_id: string
          time_on_page: number | null
          user_agent: string | null
          utm_campaign: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          page?: string | null
          referrer?: string | null
          scroll_depth?: number | null
          section?: string | null
          section_time_spent?: number | null
          session_id: string
          time_on_page?: number | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string
          device_type?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          page?: string | null
          referrer?: string | null
          scroll_depth?: number | null
          section?: string | null
          section_time_spent?: number | null
          session_id?: string
          time_on_page?: number | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      carts: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          items: Json | null
          last_activity_at: string | null
          name: string | null
          phone: string
          reminder_sent_at: string | null
          status: string | null
          subtotal: number | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          whatsapp_2_sent_at: string | null
          whatsapp_sent_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          items?: Json | null
          last_activity_at?: string | null
          name?: string | null
          phone: string
          reminder_sent_at?: string | null
          status?: string | null
          subtotal?: number | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          whatsapp_2_sent_at?: string | null
          whatsapp_sent_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          items?: Json | null
          last_activity_at?: string | null
          name?: string | null
          phone?: string
          reminder_sent_at?: string | null
          status?: string | null
          subtotal?: number | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          whatsapp_2_sent_at?: string | null
          whatsapp_sent_at?: string | null
        }
        Relationships: []
      }
      coupon_usage: {
        Row: {
          coupon_code: string
          customer_email: string
          id: string
          order_id: string | null
          used_at: string | null
        }
        Insert: {
          coupon_code: string
          customer_email: string
          id?: string
          order_id?: string | null
          used_at?: string | null
        }
        Update: {
          coupon_code?: string
          customer_email?: string
          id?: string
          order_id?: string | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string | null
          current_uses: number | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          max_uses: number | null
          max_uses_per_customer: number | null
          min_order_value: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type?: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          max_uses_per_customer?: number | null
          min_order_value?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          max_uses_per_customer?: number | null
          min_order_value?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      kit_juices: {
        Row: {
          active: boolean
          benefit: string | null
          created_at: string
          emoji: string
          id: string
          ingredients: string | null
          low_stock_threshold: number | null
          name: string
          show_stock: boolean
          sort_order: number
          stock_quantity: number | null
        }
        Insert: {
          active?: boolean
          benefit?: string | null
          created_at?: string
          emoji?: string
          id?: string
          ingredients?: string | null
          low_stock_threshold?: number | null
          name: string
          show_stock?: boolean
          sort_order?: number
          stock_quantity?: number | null
        }
        Update: {
          active?: boolean
          benefit?: string | null
          created_at?: string
          emoji?: string
          id?: string
          ingredients?: string | null
          low_stock_threshold?: number | null
          name?: string
          show_stock?: boolean
          sort_order?: number
          stock_quantity?: number | null
        }
        Relationships: []
      }
      kit_packages: {
        Row: {
          active: boolean
          created_at: string
          days: number
          description: string | null
          features: Json | null
          id: string
          name: string
          popular: boolean
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          days: number
          description?: string | null
          features?: Json | null
          id?: string
          name: string
          popular?: boolean
          price: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          days?: number
          description?: string | null
          features?: Json | null
          id?: string
          name?: string
          popular?: boolean
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      kit_soups: {
        Row: {
          active: boolean
          benefit: string | null
          created_at: string
          emoji: string
          id: string
          ingredients: string | null
          low_stock_threshold: number | null
          name: string
          show_stock: boolean
          sort_order: number
          stock_quantity: number | null
        }
        Insert: {
          active?: boolean
          benefit?: string | null
          created_at?: string
          emoji?: string
          id?: string
          ingredients?: string | null
          low_stock_threshold?: number | null
          name: string
          show_stock?: boolean
          sort_order?: number
          stock_quantity?: number | null
        }
        Update: {
          active?: boolean
          benefit?: string | null
          created_at?: string
          emoji?: string
          id?: string
          ingredients?: string | null
          low_stock_threshold?: number | null
          name?: string
          show_stock?: boolean
          sort_order?: number
          stock_quantity?: number | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          converted: boolean | null
          converted_at: string | null
          created_at: string
          id: string
          location: string | null
          name: string
          objective: string | null
          phone: string
          recommendation_name: string | null
          recommendation_price: number | null
          recommendation_type: string | null
          specification: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          converted?: boolean | null
          converted_at?: string | null
          created_at?: string
          id?: string
          location?: string | null
          name: string
          objective?: string | null
          phone: string
          recommendation_name?: string | null
          recommendation_price?: number | null
          recommendation_type?: string | null
          specification?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          converted?: boolean | null
          converted_at?: string | null
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          objective?: string | null
          phone?: string
          recommendation_name?: string | null
          recommendation_price?: number | null
          recommendation_type?: string | null
          specification?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      marketing_messages: {
        Row: {
          coupon_code: string | null
          created_at: string | null
          delay_days: number | null
          discount_percent: number | null
          email_body_html: string
          email_subject: string
          id: string
          is_active: boolean | null
          message_type: string
          title: string
          trigger_quantity: number | null
          updated_at: string | null
          whatsapp_template: string
        }
        Insert: {
          coupon_code?: string | null
          created_at?: string | null
          delay_days?: number | null
          discount_percent?: number | null
          email_body_html: string
          email_subject: string
          id?: string
          is_active?: boolean | null
          message_type: string
          title: string
          trigger_quantity?: number | null
          updated_at?: string | null
          whatsapp_template: string
        }
        Update: {
          coupon_code?: string | null
          created_at?: string | null
          delay_days?: number | null
          discount_percent?: number | null
          email_body_html?: string
          email_subject?: string
          id?: string
          is_active?: boolean | null
          message_type?: string
          title?: string
          trigger_quantity?: number | null
          updated_at?: string | null
          whatsapp_template?: string
        }
        Relationships: []
      }
      marmita_flavors: {
        Row: {
          active: boolean
          category: string
          created_at: string
          id: string
          low_stock_threshold: number | null
          name: string
          show_stock: boolean
          sort_order: number
          stock_quantity: number | null
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          id?: string
          low_stock_threshold?: number | null
          name: string
          show_stock?: boolean
          sort_order?: number
          stock_quantity?: number | null
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          id?: string
          low_stock_threshold?: number | null
          name?: string
          show_stock?: boolean
          sort_order?: number
          stock_quantity?: number | null
        }
        Relationships: []
      }
      marmita_packages: {
        Row: {
          active: boolean
          created_at: string
          id: string
          image_url: string | null
          name: string
          popular: boolean
          quantity: number
          sort_order: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          popular?: boolean
          quantity: number
          sort_order?: number
          unit_price: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          popular?: boolean
          quantity?: number
          sort_order?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      menu_categories: {
        Row: {
          active: boolean
          created_at: string
          icon: string | null
          id: string
          name: string
          short_name: string
          slug: string
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          short_name: string
          slug: string
          sort_order?: number
          type: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          short_name?: string
          slug?: string
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          changed_by_name: string | null
          created_at: string
          id: string
          new_status: string
          notes: string | null
          order_id: string
          previous_status: string | null
        }
        Insert: {
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          id?: string
          new_status: string
          notes?: string | null
          order_id: string
          previous_status?: string | null
        }
        Update: {
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          id?: string
          new_status?: string
          notes?: string | null
          order_id?: string
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          coupon_code: string | null
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          delivered_at: string | null
          delivery_address: string | null
          delivery_fee: number | null
          delivery_option: string
          discount_amount: number | null
          id: string
          items: Json
          mp_payment_id: string | null
          mp_preference_id: string | null
          order_number: string | null
          paid_at: string | null
          payment_method: string | null
          reminder_sent_at: string | null
          review_requested_at: string | null
          status: string
          stock_decremented: boolean | null
          subtotal: number
          total: number
          utm_data: Json | null
          whatsapp_2_sent_at: string | null
          whatsapp_sent_at: string | null
        }
        Insert: {
          coupon_code?: string | null
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone: string
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_fee?: number | null
          delivery_option: string
          discount_amount?: number | null
          id?: string
          items: Json
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          order_number?: string | null
          paid_at?: string | null
          payment_method?: string | null
          reminder_sent_at?: string | null
          review_requested_at?: string | null
          status?: string
          stock_decremented?: boolean | null
          subtotal: number
          total: number
          utm_data?: Json | null
          whatsapp_2_sent_at?: string | null
          whatsapp_sent_at?: string | null
        }
        Update: {
          coupon_code?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_fee?: number | null
          delivery_option?: string
          discount_amount?: number | null
          id?: string
          items?: Json
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          order_number?: string | null
          paid_at?: string | null
          payment_method?: string | null
          reminder_sent_at?: string | null
          review_requested_at?: string | null
          status?: string
          stock_decremented?: boolean | null
          subtotal?: number
          total?: number
          utm_data?: Json | null
          whatsapp_2_sent_at?: string | null
          whatsapp_sent_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          preferred_address: string | null
          preferred_delivery_option: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          preferred_address?: string | null
          preferred_delivery_option?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          preferred_address?: string | null
          preferred_delivery_option?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recompra_campaigns: {
        Row: {
          coupon_used: boolean | null
          id: string
          message_type: string
          order_id: string | null
          sent_at: string | null
        }
        Insert: {
          coupon_used?: boolean | null
          id?: string
          message_type: string
          order_id?: string | null
          sent_at?: string | null
        }
        Update: {
          coupon_used?: boolean | null
          id?: string
          message_type?: string
          order_id?: string | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recompra_campaigns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_settings: {
        Row: {
          created_at: string | null
          delay_minutes: number
          id: string
          is_active: boolean | null
          reminder_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delay_minutes: number
          id?: string
          is_active?: boolean | null
          reminder_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delay_minutes?: number
          id?: string
          is_active?: boolean | null
          reminder_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          item_id: string
          item_name: string
          item_type: string
          movement_type: string
          notes: string | null
          quantity_after: number | null
          quantity_before: number | null
          quantity_change: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_id: string
          item_name: string
          item_type: string
          movement_type: string
          notes?: string | null
          quantity_after?: number | null
          quantity_before?: number | null
          quantity_change: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string
          item_name?: string
          item_type?: string
          movement_type?: string
          notes?: string | null
          quantity_after?: number | null
          quantity_before?: number | null
          quantity_change?: number
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_coupon_usage: {
        Args: { coupon_code_param: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const

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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          time_on_page?: number | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          whatsapp_2_sent_at?: string | null
          whatsapp_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cashback_balances: {
        Row: {
          created_at: string
          current_balance: number
          current_level_id: string | null
          customer_email: string
          id: string
          tenant_id: string | null
          total_earned: number
          total_expired: number
          total_orders: number
          total_spent: number
          total_used: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_balance?: number
          current_level_id?: string | null
          customer_email: string
          id?: string
          tenant_id?: string | null
          total_earned?: number
          total_expired?: number
          total_orders?: number
          total_spent?: number
          total_used?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_balance?: number
          current_level_id?: string | null
          customer_email?: string
          id?: string
          tenant_id?: string | null
          total_earned?: number
          total_expired?: number
          total_orders?: number
          total_spent?: number
          total_used?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cashback_balances_current_level_id_fkey"
            columns: ["current_level_id"]
            isOneToOne: false
            referencedRelation: "loyalty_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashback_balances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cashback_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          customer_email: string
          expired: boolean
          expires_at: string | null
          id: string
          level_slug: string | null
          notes: string | null
          order_id: string | null
          tenant_id: string | null
          transaction_type: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          customer_email: string
          expired?: boolean
          expires_at?: string | null
          id?: string
          level_slug?: string | null
          notes?: string | null
          order_id?: string | null
          tenant_id?: string | null
          transaction_type: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          customer_email?: string
          expired?: boolean
          expires_at?: string | null
          id?: string
          level_slug?: string | null
          notes?: string | null
          order_id?: string | null
          tenant_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cashback_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashback_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      club_plans: {
        Row: {
          active: boolean
          created_at: string
          description: string
          icon_emoji: string
          id: string
          items_description: string
          kit_type: string
          name: string
          popular: boolean
          price: number
          sort_order: number
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string
          icon_emoji?: string
          id?: string
          items_description?: string
          kit_type: string
          name: string
          popular?: boolean
          price?: number
          sort_order?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          icon_emoji?: string
          id?: string
          items_description?: string
          kit_type?: string
          name?: string
          popular?: boolean
          price?: number
          sort_order?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      club_subscriptions: {
        Row: {
          asaas_customer_id: string | null
          asaas_subscription_id: string | null
          created_at: string
          customer_cpf: string
          customer_email: string
          customer_name: string
          customer_phone: string
          delivery_address: string | null
          delivery_option: string
          id: string
          kit_name: string
          kit_type: string
          next_due_date: string | null
          price: number
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          created_at?: string
          customer_cpf: string
          customer_email: string
          customer_name: string
          customer_phone: string
          delivery_address?: string | null
          delivery_option?: string
          id?: string
          kit_name: string
          kit_type: string
          next_due_date?: string | null
          price: number
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          created_at?: string
          customer_cpf?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          delivery_address?: string | null
          delivery_option?: string
          id?: string
          kit_name?: string
          kit_type?: string
          next_due_date?: string | null
          price?: number
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_usage: {
        Row: {
          coupon_code: string
          customer_email: string
          id: string
          order_id: string | null
          tenant_id: string | null
          used_at: string | null
        }
        Insert: {
          coupon_code: string
          customer_email: string
          id?: string
          order_id?: string | null
          tenant_id?: string | null
          used_at?: string | null
        }
        Update: {
          coupon_code?: string
          customer_email?: string
          id?: string
          order_id?: string | null
          tenant_id?: string | null
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
          {
            foreignKeyName: "coupon_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kit_juices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kit_packages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kit_soups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_levels: {
        Row: {
          active: boolean
          cashback_percent: number
          created_at: string
          emoji: string
          id: string
          min_orders: number
          min_spent: number
          name: string
          slug: string
          sort_order: number
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          cashback_percent?: number
          created_at?: string
          emoji?: string
          id?: string
          min_orders?: number
          min_spent?: number
          name: string
          slug: string
          sort_order?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          cashback_percent?: number
          created_at?: string
          emoji?: string
          id?: string
          min_orders?: number
          min_spent?: number
          name?: string
          slug?: string
          sort_order?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_levels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          title?: string
          trigger_quantity?: number | null
          updated_at?: string | null
          whatsapp_template?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          sides: Json | null
          sort_order: number
          stock_quantity: number | null
          tenant_id: string | null
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          id?: string
          low_stock_threshold?: number | null
          name: string
          show_stock?: boolean
          sides?: Json | null
          sort_order?: number
          stock_quantity?: number | null
          tenant_id?: string | null
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          id?: string
          low_stock_threshold?: number | null
          name?: string
          show_stock?: boolean
          sides?: Json | null
          sort_order?: number
          stock_quantity?: number | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marmita_flavors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      marmita_packages: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          line_type: string | null
          name: string
          popular: boolean
          quantity: number
          sort_order: number
          tenant_id: string | null
          unit_price: number
          updated_at: string
          weight: number | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          line_type?: string | null
          name: string
          popular?: boolean
          quantity: number
          sort_order?: number
          tenant_id?: string | null
          unit_price: number
          updated_at?: string
          weight?: number | null
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          line_type?: string | null
          name?: string
          popular?: boolean
          quantity?: number
          sort_order?: number
          tenant_id?: string | null
          unit_price?: number
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marmita_packages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      marmita_sides: {
        Row: {
          active: boolean | null
          category: string | null
          created_at: string | null
          id: string
          name: string
          sort_order: number | null
          tenant_id: string | null
          weight_grams: number
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          created_at?: string | null
          id?: string
          name: string
          sort_order?: number | null
          tenant_id?: string | null
          weight_grams?: number
        }
        Update: {
          active?: boolean | null
          category?: string | null
          created_at?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          tenant_id?: string | null
          weight_grams?: number
        }
        Relationships: [
          {
            foreignKeyName: "marmita_sides_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_events: {
        Row: {
          channel: string
          created_at: string
          event_type: string
          id: string
          message_id: string | null
          metadata: Json | null
          order_id: string | null
          order_number: string | null
          recipient_email: string | null
          recipient_phone: string | null
          template_name: string | null
          tenant_id: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          event_type: string
          id?: string
          message_id?: string | null
          metadata?: Json | null
          order_id?: string | null
          order_number?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          template_name?: string | null
          tenant_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          event_type?: string
          id?: string
          message_id?: string | null
          metadata?: Json | null
          order_id?: string | null
          order_number?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          template_name?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancellation_type: string | null
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
          pix_expiration: string | null
          pix_qr_code: string | null
          pix_qr_code_base64: string | null
          reminder_sent_at: string | null
          review_requested_at: string | null
          status: string
          stock_decremented: boolean | null
          subtotal: number
          tenant_id: string | null
          total: number
          tracking_link: string | null
          utm_data: Json | null
          whatsapp_2_sent_at: string | null
          whatsapp_sent_at: string | null
        }
        Insert: {
          cancellation_type?: string | null
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
          pix_expiration?: string | null
          pix_qr_code?: string | null
          pix_qr_code_base64?: string | null
          reminder_sent_at?: string | null
          review_requested_at?: string | null
          status?: string
          stock_decremented?: boolean | null
          subtotal: number
          tenant_id?: string | null
          total: number
          tracking_link?: string | null
          utm_data?: Json | null
          whatsapp_2_sent_at?: string | null
          whatsapp_sent_at?: string | null
        }
        Update: {
          cancellation_type?: string | null
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
          pix_expiration?: string | null
          pix_qr_code?: string | null
          pix_qr_code_base64?: string | null
          reminder_sent_at?: string | null
          review_requested_at?: string | null
          status?: string
          stock_decremented?: boolean | null
          subtotal?: number
          tenant_id?: string | null
          total?: number
          tracking_link?: string | null
          utm_data?: Json | null
          whatsapp_2_sent_at?: string | null
          whatsapp_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_error_logs: {
        Row: {
          created_at: string | null
          customer_email: string | null
          customer_phone: string | null
          error_code: string | null
          error_message: string | null
          id: string
          order_id: string | null
          provider: string | null
          request_payload: Json | null
          response_payload: Json | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          order_id?: string | null
          provider?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          order_id?: string | null
          provider?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_error_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_error_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_notifications: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          scheduled_for: string
          status: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          scheduled_for?: string
          status: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          scheduled_for?: string
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_plans: {
        Row: {
          active: boolean
          created_at: string
          features: Json
          id: string
          max_orders_month: number | null
          max_products: number | null
          name: string
          price: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          features?: Json
          id?: string
          max_orders_month?: number | null
          max_products?: number | null
          name: string
          price?: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          features?: Json
          id?: string
          max_orders_month?: number | null
          max_products?: number | null
          name?: string
          price?: number
          slug?: string
          sort_order?: number
          updated_at?: string
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
      recompra_campaigns: {
        Row: {
          coupon_used: boolean | null
          id: string
          message_type: string
          order_id: string | null
          sent_at: string | null
          tenant_id: string | null
        }
        Insert: {
          coupon_used?: boolean | null
          id?: string
          message_type: string
          order_id?: string | null
          sent_at?: string | null
          tenant_id?: string | null
        }
        Update: {
          coupon_used?: boolean | null
          id?: string
          message_type?: string
          order_id?: string | null
          sent_at?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recompra_campaigns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recompra_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_customers: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          default_order: string
          delivery_address: string | null
          delivery_day: string
          delivery_option: string
          id: string
          is_active: boolean
          last_delivered_at: string | null
          notes: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          default_order: string
          delivery_address?: string | null
          delivery_day: string
          delivery_option?: string
          id?: string
          is_active?: boolean
          last_delivered_at?: string | null
          notes?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          default_order?: string
          delivery_address?: string | null
          delivery_day?: string
          delivery_option?: string
          id?: string
          is_active?: boolean
          last_delivered_at?: string | null
          notes?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delay_minutes: number
          id?: string
          is_active?: boolean | null
          reminder_type: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delay_minutes?: number
          id?: string
          is_active?: boolean | null
          reminder_type?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminder_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          customer_email: string
          customer_name: string | null
          id: string
          is_approved: boolean | null
          order_id: string | null
          rating: number
          tenant_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          customer_email: string
          customer_name?: string | null
          id?: string
          is_approved?: boolean | null
          order_id?: string | null
          rating: number
          tenant_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          customer_email?: string
          customer_name?: string | null
          id?: string
          is_approved?: boolean | null
          order_id?: string | null
          rating?: number
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_landing_content: {
        Row: {
          content: Json
          created_at: string
          id: string
          is_visible: boolean
          section_key: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          is_visible?: boolean
          section_key: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          is_visible?: boolean
          section_key?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_landing_content_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          brand_name: string
          brand_slogan: string
          city: string
          created_at: string
          delivery_fee: number
          domain: string | null
          facebook_pixel_id: string | null
          google_analytics_id: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          og_image_url: string | null
          order_prefix: string
          owner_user_id: string | null
          pickup_neighborhood: string
          plan_due_date: string | null
          plan_price: number
          plan_status: string
          plan_type: string
          primary_color: string
          slug: string
          state: string
          updated_at: string
          whatsapp: string
          whatsapp_formatted: string
        }
        Insert: {
          brand_name: string
          brand_slogan?: string
          city?: string
          created_at?: string
          delivery_fee?: number
          domain?: string | null
          facebook_pixel_id?: string | null
          google_analytics_id?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          og_image_url?: string | null
          order_prefix?: string
          owner_user_id?: string | null
          pickup_neighborhood?: string
          plan_due_date?: string | null
          plan_price?: number
          plan_status?: string
          plan_type?: string
          primary_color?: string
          slug: string
          state?: string
          updated_at?: string
          whatsapp?: string
          whatsapp_formatted?: string
        }
        Update: {
          brand_name?: string
          brand_slogan?: string
          city?: string
          created_at?: string
          delivery_fee?: number
          domain?: string | null
          facebook_pixel_id?: string | null
          google_analytics_id?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          og_image_url?: string | null
          order_prefix?: string
          owner_user_id?: string | null
          pickup_neighborhood?: string
          plan_due_date?: string | null
          plan_price?: number
          plan_status?: string
          plan_type?: string
          primary_color?: string
          slug?: string
          state?: string
          updated_at?: string
          whatsapp?: string
          whatsapp_formatted?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
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
      get_admin_tenant_id: { Args: { _user_id: string }; Returns: string }
      get_current_tenant_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_for_tenant: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _tenant_id: string
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
      app_role: "admin" | "user" | "super_admin"
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
      app_role: ["admin", "user", "super_admin"],
    },
  },
} as const

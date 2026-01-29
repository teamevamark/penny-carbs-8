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
      admin_permissions: {
        Row: {
          can_access_reports: boolean
          can_approve_settlements: boolean
          can_assign_orders: boolean
          can_manage_items: boolean
          can_manage_orders: boolean
          can_register_cooks: boolean
          can_register_delivery_staff: boolean
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_access_reports?: boolean
          can_approve_settlements?: boolean
          can_assign_orders?: boolean
          can_manage_items?: boolean
          can_manage_orders?: boolean
          can_register_cooks?: boolean
          can_register_delivery_staff?: boolean
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_access_reports?: boolean
          can_approve_settlements?: boolean
          can_assign_orders?: boolean
          can_manage_items?: boolean
          can_manage_orders?: boolean
          can_register_cooks?: boolean
          can_register_delivery_staff?: boolean
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          display_order: number
          end_date: string | null
          id: string
          image_url: string
          is_active: boolean
          link_url: string | null
          service_type: Database["public"]["Enums"]["service_type"] | null
          start_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          end_date?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          link_url?: string | null
          service_type?: Database["public"]["Enums"]["service_type"] | null
          start_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          end_date?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string | null
          service_type?: Database["public"]["Enums"]["service_type"] | null
          start_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          food_item_id: string
          id: string
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          food_item_id: string
          id?: string
          quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          food_item_id?: string
          id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_food_item_id_fkey"
            columns: ["food_item_id"]
            isOneToOne: false
            referencedRelation: "food_items"
            referencedColumns: ["id"]
          },
        ]
      }
      cloud_kitchen_slots: {
        Row: {
          created_at: string
          cutoff_hours_before: number
          display_order: number
          end_time: string
          id: string
          is_active: boolean
          name: string
          slot_type: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cutoff_hours_before?: number
          display_order?: number
          end_time: string
          id?: string
          is_active?: boolean
          name: string
          slot_type: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cutoff_hours_before?: number
          display_order?: number
          end_time?: string
          id?: string
          is_active?: boolean
          name?: string
          slot_type?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      cooks: {
        Row: {
          allowed_order_types: string[]
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_available: boolean
          kitchen_name: string
          mobile_number: string
          panchayat_id: string | null
          rating: number | null
          total_orders: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          allowed_order_types?: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_available?: boolean
          kitchen_name: string
          mobile_number: string
          panchayat_id?: string | null
          rating?: number | null
          total_orders?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          allowed_order_types?: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_available?: boolean
          kitchen_name?: string
          mobile_number?: string
          panchayat_id?: string | null
          rating?: number | null
          total_orders?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cooks_panchayat_id_fkey"
            columns: ["panchayat_id"]
            isOneToOne: false
            referencedRelation: "panchayats"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_staff: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assigned_wards: number[] | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_approved: boolean
          is_available: boolean
          mobile_number: string
          name: string
          panchayat_id: string | null
          rating: number | null
          staff_type: string
          total_deliveries: number | null
          updated_at: string
          user_id: string | null
          vehicle_number: string | null
          vehicle_type: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_wards?: number[] | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_approved?: boolean
          is_available?: boolean
          mobile_number: string
          name: string
          panchayat_id?: string | null
          rating?: number | null
          staff_type?: string
          total_deliveries?: number | null
          updated_at?: string
          user_id?: string | null
          vehicle_number?: string | null
          vehicle_type: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_wards?: number[] | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_approved?: boolean
          is_available?: boolean
          mobile_number?: string
          name?: string
          panchayat_id?: string | null
          rating?: number | null
          staff_type?: string
          total_deliveries?: number | null
          updated_at?: string
          user_id?: string | null
          vehicle_number?: string | null
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_staff_panchayat_id_fkey"
            columns: ["panchayat_id"]
            isOneToOne: false
            referencedRelation: "panchayats"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_wallets: {
        Row: {
          collected_amount: number
          created_at: string
          delivery_staff_id: string
          id: string
          job_earnings: number
          total_settled: number
          updated_at: string
        }
        Insert: {
          collected_amount?: number
          created_at?: string
          delivery_staff_id: string
          id?: string
          job_earnings?: number
          total_settled?: number
          updated_at?: string
        }
        Update: {
          collected_amount?: number
          created_at?: string
          delivery_staff_id?: string
          id?: string
          job_earnings?: number
          total_settled?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_wallets_delivery_staff_id_fkey"
            columns: ["delivery_staff_id"]
            isOneToOne: true
            referencedRelation: "delivery_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      event_types: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          icon: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      food_categories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          service_type: Database["public"]["Enums"]["service_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          service_type: Database["public"]["Enums"]["service_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          service_type?: Database["public"]["Enums"]["service_type"]
          updated_at?: string
        }
        Relationships: []
      }
      food_item_images: {
        Row: {
          created_at: string
          display_order: number
          food_item_id: string
          id: string
          image_url: string
          is_primary: boolean
        }
        Insert: {
          created_at?: string
          display_order?: number
          food_item_id: string
          id?: string
          image_url: string
          is_primary?: boolean
        }
        Update: {
          created_at?: string
          display_order?: number
          food_item_id?: string
          id?: string
          image_url?: string
          is_primary?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "food_item_images_food_item_id_fkey"
            columns: ["food_item_id"]
            isOneToOne: false
            referencedRelation: "food_items"
            referencedColumns: ["id"]
          },
        ]
      }
      food_items: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_available: boolean
          is_vegetarian: boolean
          max_images: number
          min_images: number
          name: string
          panchayat_id: string | null
          preparation_time_minutes: number | null
          price: number
          service_type: Database["public"]["Enums"]["service_type"]
          updated_at: string
          ward_number: number | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_available?: boolean
          is_vegetarian?: boolean
          max_images?: number
          min_images?: number
          name: string
          panchayat_id?: string | null
          preparation_time_minutes?: number | null
          price: number
          service_type: Database["public"]["Enums"]["service_type"]
          updated_at?: string
          ward_number?: number | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_available?: boolean
          is_vegetarian?: boolean
          max_images?: number
          min_images?: number
          name?: string
          panchayat_id?: string | null
          preparation_time_minutes?: number | null
          price?: number
          service_type?: Database["public"]["Enums"]["service_type"]
          updated_at?: string
          ward_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "food_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "food_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_items_panchayat_id_fkey"
            columns: ["panchayat_id"]
            isOneToOne: false
            referencedRelation: "panchayats"
            referencedColumns: ["id"]
          },
        ]
      }
      indoor_event_vehicles: {
        Row: {
          created_at: string
          driver_mobile: string
          driver_name: string | null
          id: string
          notes: string | null
          order_id: string
          updated_at: string
          vehicle_number: string
        }
        Insert: {
          created_at?: string
          driver_mobile: string
          driver_name?: string | null
          id?: string
          notes?: string | null
          order_id: string
          updated_at?: string
          vehicle_number: string
        }
        Update: {
          created_at?: string
          driver_mobile?: string
          driver_name?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          updated_at?: string
          vehicle_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "indoor_event_vehicles_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          food_item_id: string
          id: string
          order_id: string
          quantity: number
          special_instructions: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          food_item_id: string
          id?: string
          order_id: string
          quantity?: number
          special_instructions?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          food_item_id?: string
          id?: string
          order_id?: string
          quantity?: number
          special_instructions?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_food_item_id_fkey"
            columns: ["food_item_id"]
            isOneToOne: false
            referencedRelation: "food_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          advance_payment_received: boolean | null
          advance_payment_required: number | null
          advance_payment_verified_at: string | null
          advance_payment_verified_by: string | null
          assigned_cook_id: string | null
          assigned_delivery_id: string | null
          cloud_kitchen_slot_id: string | null
          cook_assigned_at: string | null
          cook_assignment_status: string | null
          cook_responded_at: string | null
          cook_response_deadline: string | null
          cook_status: string | null
          created_at: string
          customer_id: string
          delivered_at: string | null
          delivery_address: string | null
          delivery_amount: number | null
          delivery_earnings: number | null
          delivery_eta: string | null
          delivery_instructions: string | null
          delivery_status: string | null
          estimated_delivery_minutes: number | null
          event_date: string | null
          event_details: string | null
          event_type_id: string | null
          guest_count: number | null
          id: string
          order_number: string
          order_type: string | null
          package_id: string | null
          panchayat_id: string
          service_charge_amount: number | null
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at: string
          ward_number: number
        }
        Insert: {
          advance_payment_received?: boolean | null
          advance_payment_required?: number | null
          advance_payment_verified_at?: string | null
          advance_payment_verified_by?: string | null
          assigned_cook_id?: string | null
          assigned_delivery_id?: string | null
          cloud_kitchen_slot_id?: string | null
          cook_assigned_at?: string | null
          cook_assignment_status?: string | null
          cook_responded_at?: string | null
          cook_response_deadline?: string | null
          cook_status?: string | null
          created_at?: string
          customer_id: string
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_amount?: number | null
          delivery_earnings?: number | null
          delivery_eta?: string | null
          delivery_instructions?: string | null
          delivery_status?: string | null
          estimated_delivery_minutes?: number | null
          event_date?: string | null
          event_details?: string | null
          event_type_id?: string | null
          guest_count?: number | null
          id?: string
          order_number: string
          order_type?: string | null
          package_id?: string | null
          panchayat_id: string
          service_charge_amount?: number | null
          service_type: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at?: string
          ward_number: number
        }
        Update: {
          advance_payment_received?: boolean | null
          advance_payment_required?: number | null
          advance_payment_verified_at?: string | null
          advance_payment_verified_by?: string | null
          assigned_cook_id?: string | null
          assigned_delivery_id?: string | null
          cloud_kitchen_slot_id?: string | null
          cook_assigned_at?: string | null
          cook_assignment_status?: string | null
          cook_responded_at?: string | null
          cook_response_deadline?: string | null
          cook_status?: string | null
          created_at?: string
          customer_id?: string
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_amount?: number | null
          delivery_earnings?: number | null
          delivery_eta?: string | null
          delivery_instructions?: string | null
          delivery_status?: string | null
          estimated_delivery_minutes?: number | null
          event_date?: string | null
          event_details?: string | null
          event_type_id?: string | null
          guest_count?: number | null
          id?: string
          order_number?: string
          order_type?: string | null
          package_id?: string | null
          panchayat_id?: string
          service_charge_amount?: number | null
          service_type?: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
          ward_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_cloud_kitchen_slot_id_fkey"
            columns: ["cloud_kitchen_slot_id"]
            isOneToOne: false
            referencedRelation: "cloud_kitchen_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "event_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_panchayat_id_fkey"
            columns: ["panchayat_id"]
            isOneToOne: false
            referencedRelation: "panchayats"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          includes_decoration: boolean
          includes_service_staff: boolean
          includes_venue: boolean
          is_active: boolean
          max_guests: number | null
          min_guests: number | null
          name: string
          service_charge_percent: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          includes_decoration?: boolean
          includes_service_staff?: boolean
          includes_venue?: boolean
          is_active?: boolean
          max_guests?: number | null
          min_guests?: number | null
          name: string
          service_charge_percent?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          includes_decoration?: boolean
          includes_service_staff?: boolean
          includes_venue?: boolean
          is_active?: boolean
          max_guests?: number | null
          min_guests?: number | null
          name?: string
          service_charge_percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      panchayats: {
        Row: {
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
          ward_count: number
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          ward_count?: number
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          ward_count?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          is_active: boolean
          mobile_number: string
          name: string
          panchayat_id: string | null
          updated_at: string
          user_id: string
          ward_number: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          mobile_number: string
          name: string
          panchayat_id?: string | null
          updated_at?: string
          user_id: string
          ward_number?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          mobile_number?: string
          name?: string
          panchayat_id?: string | null
          updated_at?: string
          user_id?: string
          ward_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_panchayat_id_fkey"
            columns: ["panchayat_id"]
            isOneToOne: false
            referencedRelation: "panchayats"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          order_id: string | null
          panchayat_id: string | null
          status: string
          updated_at: string
          user_id: string
          ward_number: number | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          panchayat_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
          ward_number?: number | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          panchayat_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          ward_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "settlements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_panchayat_id_fkey"
            columns: ["panchayat_id"]
            isOneToOne: false
            referencedRelation: "panchayats"
            referencedColumns: ["id"]
          },
        ]
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
      wallet_transactions: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          delivery_staff_id: string
          description: string | null
          id: string
          order_id: string | null
          status: string
          transaction_type: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          delivery_staff_id: string
          description?: string | null
          id?: string
          order_id?: string | null
          status?: string
          transaction_type: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          delivery_staff_id?: string
          description?: string | null
          id?: string
          order_id?: string | null
          status?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_delivery_staff_id_fkey"
            columns: ["delivery_staff_id"]
            isOneToOne: false
            referencedRelation: "delivery_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_cook: { Args: { _user_id: string }; Returns: boolean }
      is_delivery_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "cook" | "delivery_staff" | "customer"
      cook_assignment_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "auto_rejected"
      delivery_staff_type: "fixed_salary" | "registered_partner"
      order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "ready"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
      order_type: "food_only" | "full_event"
      service_type: "indoor_events" | "cloud_kitchen" | "homemade"
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
      app_role: ["super_admin", "admin", "cook", "delivery_staff", "customer"],
      cook_assignment_status: [
        "pending",
        "accepted",
        "rejected",
        "auto_rejected",
      ],
      delivery_staff_type: ["fixed_salary", "registered_partner"],
      order_status: [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      order_type: ["food_only", "full_event"],
      service_type: ["indoor_events", "cloud_kitchen", "homemade"],
    },
  },
} as const

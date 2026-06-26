export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      roles: {
        Row: {
          id: number
          name: 'cashier' | 'owner'
        }
        Insert: {
          id?: number
          name: 'cashier' | 'owner'
        }
        Update: {
          id?: number
          name?: 'cashier' | 'owner'
        }
      }
      user_roles: {
        Row: {
          assigned_at: string
          role_id: number
          user_id: string
        }
        Insert: {
          assigned_at?: string
          role_id: number
          user_id: string
        }
        Update: {
          assigned_at?: string
          role_id?: number
          user_id?: string
        }
      }
      users: {
        Row: {
          id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
      }
      modifier_material_links: {
        Row: {
          id: string
          material_id: string
          modifier_id: string
          quantity_used: number
        }
        Insert: {
          id?: string
          material_id: string
          modifier_id: string
          quantity_used: number
        }
        Update: {
          id?: string
          material_id?: string
          modifier_id?: string
          quantity_used?: number
        }
      }
      order_item_modifiers: {
        Row: {
          created_at: string
          id: string
          modifier_group_snapshot: string
          modifier_id: string | null
          modifier_name_snapshot: string
          order_item_id: string
          price_delta_snapshot: number
        }
        Insert: {
          created_at?: string
          id?: string
          modifier_group_snapshot: string
          modifier_id?: string | null
          modifier_name_snapshot: string
          order_item_id: string
          price_delta_snapshot: number
        }
        Update: {
          created_at?: string
          id?: string
          modifier_group_snapshot?: string
          modifier_id?: string | null
          modifier_name_snapshot?: string
          order_item_id?: string
          price_delta_snapshot?: number
        }
      }
      order_items: {
        Row: {
          base_price_snapshot: number
          created_at: string
          id: string
          line_total: number
          order_id: string
          product_id: string
          product_name_snapshot: string
          quantity: number
        }
        Insert: {
          base_price_snapshot: number
          created_at?: string
          id?: string
          line_total: number
          order_id: string
          product_id: string
          product_name_snapshot: string
          quantity: number
        }
        Update: {
          base_price_snapshot?: number
          created_at?: string
          id?: string
          line_total?: number
          order_id?: string
          product_id?: string
          product_name_snapshot?: string
          quantity?: number
        }
      }
      orders: {
        Row: {
          amount_paid: number | null
          cashier_id: string
          change_amount: number | null
          created_at: string
          id: string
          order_number: string
          paid_at: string | null
          pakasir_trx_id: string | null
          payment_method: 'TUNAI' | 'QRIS' | null
          qris_expires_at: string | null
          shift_id: string
          status: 'PENDING' | 'QRIS_PENDING' | 'PAID' | 'VOIDED' | 'EXPIRED'
          subtotal: number
          total_amount: number
          updated_at: string
          void_reason: string | null
        }
        Insert: {
          amount_paid?: number | null
          cashier_id: string
          change_amount?: number | null
          created_at?: string
          id?: string
          order_number: string
          paid_at?: string | null
          pakasir_trx_id?: string | null
          payment_method?: 'TUNAI' | 'QRIS' | null
          qris_expires_at?: string | null
          shift_id: string
          status?: 'PENDING' | 'QRIS_PENDING' | 'PAID' | 'VOIDED' | 'EXPIRED'
          subtotal: number
          total_amount: number
          updated_at?: string
          void_reason?: string | null
        }
        Update: {
          amount_paid?: number | null
          cashier_id?: string
          change_amount?: number | null
          created_at?: string
          id?: string
          order_number?: string
          paid_at?: string | null
          pakasir_trx_id?: string | null
          payment_method?: 'TUNAI' | 'QRIS' | null
          qris_expires_at?: string | null
          shift_id?: string
          status?: 'PENDING' | 'QRIS_PENDING' | 'PAID' | 'VOIDED' | 'EXPIRED'
          subtotal?: number
          total_amount?: number
          updated_at?: string
          void_reason?: string | null
        }
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: 'TUNAI' | 'QRIS'
          order_id: string
          provider_ref: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method: 'TUNAI' | 'QRIS'
          order_id: string
          provider_ref?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: 'TUNAI' | 'QRIS'
          order_id?: string
          provider_ref?: string | null
          status?: string
        }
      }
      product_modifiers: {
        Row: {
          id: string
          is_active: boolean
          modifier_group: string
          modifier_name: string
          price_delta: number
          product_id: string
          sort_order: number
        }
        Insert: {
          id?: string
          is_active?: boolean
          modifier_group: string
          modifier_name: string
          price_delta?: number
          product_id: string
          sort_order?: number
        }
        Update: {
          id?: string
          is_active?: boolean
          modifier_group?: string
          modifier_name?: string
          price_delta?: number
          product_id?: string
          sort_order?: number
        }
      }
      product_recipes: {
        Row: {
          id: string
          material_id: string
          product_id: string
          quantity_used: number
        }
        Insert: {
          id?: string
          material_id: string
          product_id: string
          quantity_used: number
        }
        Update: {
          id?: string
          material_id?: string
          product_id?: string
          quantity_used?: number
        }
      }
      products: {
        Row: {
          base_price: number
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          base_price: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          base_price?: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
      }
      raw_materials: {
        Row: {
          cost_per_unit: number
          created_at: string
          current_stock: number
          id: string
          is_active: boolean
          min_stock_threshold: number
          name: string
          unit: string
          updated_at: string
        }
        Insert: {
          cost_per_unit?: number
          created_at?: string
          current_stock?: number
          id?: string
          is_active?: boolean
          min_stock_threshold?: number
          name: string
          unit?: string
          updated_at?: string
        }
        Update: {
          cost_per_unit?: number
          created_at?: string
          current_stock?: number
          id?: string
          is_active?: boolean
          min_stock_threshold?: number
          name?: string
          unit?: string
          updated_at?: string
        }
      }
      shifts: {
        Row: {
          cash_counted: number | null
          cash_variance: number | null
          closed_at: string | null
          closed_by: string | null
          created_at: string
          expected_cash: number | null
          id: string
          modal_awal: number
          notes: string | null
          opened_at: string
          opened_by: string
          status: 'OPEN' | 'CLOSED'
          total_cash_sales: number
          total_qris_sales: number
        }
        Insert: {
          cash_counted?: number | null
          cash_variance?: number | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          expected_cash?: number | null
          id?: string
          modal_awal: number
          notes?: string | null
          opened_at?: string
          opened_by: string
          status?: 'OPEN' | 'CLOSED'
          total_cash_sales?: number
          total_qris_sales?: number
        }
        Update: {
          cash_counted?: number | null
          cash_variance?: number | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          expected_cash?: number | null
          id?: string
          modal_awal?: number
          notes?: string | null
          opened_at?: string
          opened_by?: string
          status?: 'OPEN' | 'CLOSED'
          total_cash_sales?: number
          total_qris_sales?: number
        }
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          material_id: string
          movement_type: 'DEDUCTION' | 'RESTOCK' | 'ADJUSTMENT'
          notes: string | null
          order_id: string | null
          quantity_after: number
          quantity_before: number
          quantity_change: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          material_id: string
          movement_type: 'DEDUCTION' | 'RESTOCK' | 'ADJUSTMENT'
          notes?: string | null
          order_id?: string | null
          quantity_after: number
          quantity_before: number
          quantity_change: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          material_id?: string
          movement_type?: 'DEDUCTION' | 'RESTOCK' | 'ADJUSTMENT'
          notes?: string | null
          order_id?: string | null
          quantity_after?: number
          quantity_before?: number
          quantity_change?: number
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role_enum: 'cashier' | 'owner'
      shift_status_enum: 'OPEN' | 'CLOSED'
      order_status_enum: 'PENDING' | 'QRIS_PENDING' | 'PAID' | 'VOIDED' | 'EXPIRED'
      payment_method_enum: 'TUNAI' | 'QRIS'
      stock_movement_type_enum: 'DEDUCTION' | 'RESTOCK' | 'ADJUSTMENT'
    }
  }
}

export type Product = Database["public"]["Tables"]["products"]["Row"];
export type ProductModifier = Database["public"]["Tables"]["product_modifiers"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
export type OrderItemModifier = Database["public"]["Tables"]["order_item_modifiers"]["Row"];

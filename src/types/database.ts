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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role_enum: 'cashier' | 'owner'
    }
  }
}

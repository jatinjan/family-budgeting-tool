// Database types for Supabase
// These match the schema defined in the Engineering Doc

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
      profiles: {
        Row: {
          id: string
          email: string
          family_name: string | null
          is_admin: boolean
          promo_code_used: string | null
          onboarding_status: 'signed_up' | 'profile_complete' | 'budget_started' | 'plan_complete'
          signed_up_at: string
          last_active_at: string
          balance_goal: string | null
          yearly_savings_goal: string | null
          monthly_buffer: string | null
        }
        Insert: {
          id: string
          email: string
          family_name?: string | null
          is_admin?: boolean
          promo_code_used?: string | null
          onboarding_status?: 'signed_up' | 'profile_complete' | 'budget_started' | 'plan_complete'
          signed_up_at?: string
          last_active_at?: string
          balance_goal?: string | null
          yearly_savings_goal?: string | null
          monthly_buffer?: string | null
        }
        Update: {
          id?: string
          email?: string
          family_name?: string | null
          is_admin?: boolean
          promo_code_used?: string | null
          onboarding_status?: 'signed_up' | 'profile_complete' | 'budget_started' | 'plan_complete'
          signed_up_at?: string
          last_active_at?: string
          balance_goal?: string | null
          yearly_savings_goal?: string | null
          monthly_buffer?: string | null
        }
      }
      households: {
        Row: {
          id: string
          user_id: string
          name: string
          housing_type: string | null
          members: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          housing_type?: string | null
          members?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          housing_type?: string | null
          members?: number
          created_at?: string
          updated_at?: string
        }
      }
      adults: {
        Row: {
          id: string
          user_id: string
          name: string
          age: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          age?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          age?: number | null
          created_at?: string
        }
      }
      children: {
        Row: {
          id: string
          user_id: string
          name: string
          age: number | null
          school_level: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          age?: number | null
          school_level?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          age?: number | null
          school_level?: string | null
          created_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          user_id: string
          entity_type: 'child' | 'adult' | 'household'
          entity_id: string
          name: string
          description: string | null
          is_percentage_based: boolean
          percentage_value: number
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          entity_type: 'child' | 'adult' | 'household'
          entity_id: string
          name: string
          description?: string | null
          is_percentage_based?: boolean
          percentage_value?: number
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          entity_type?: 'child' | 'adult' | 'household'
          entity_id?: string
          name?: string
          description?: string | null
          is_percentage_based?: boolean
          percentage_value?: number
          sort_order?: number
          created_at?: string
        }
      }
      expense_items: {
        Row: {
          id: string
          user_id: string
          category_id: string
          name: string
          cost: number
          frequency: 'weekly' | 'monthly' | 'quarterly' | 'term' | 'annual' | 'bi-monthly'
          quantity: number
          total: number
          need_want: 'need' | 'want' | null
          adjusted_total: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id: string
          name: string
          cost?: number
          frequency?: 'weekly' | 'monthly' | 'quarterly' | 'term' | 'annual' | 'bi-monthly'
          quantity?: number
          total?: number
          need_want?: 'need' | 'want' | null
          adjusted_total?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string
          name?: string
          cost?: number
          frequency?: 'weekly' | 'monthly' | 'quarterly' | 'term' | 'annual' | 'bi-monthly'
          quantity?: number
          total?: number
          need_want?: 'need' | 'want' | null
          adjusted_total?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      promo_codes: {
        Row: {
          id: string
          code: string
          description: string | null
          redemptions: number
          max_redemptions: number | null
          status: 'active' | 'expired'
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          description?: string | null
          redemptions?: number
          max_redemptions?: number | null
          status?: 'active' | 'expired'
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          description?: string | null
          redemptions?: number
          max_redemptions?: number | null
          status?: 'active' | 'expired'
          expires_at?: string | null
          created_at?: string
        }
      }
      activity_log: {
        Row: {
          id: string
          user_id: string | null
          family_name: string | null
          event_type: string
          message: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          family_name?: string | null
          event_type: string
          message: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          family_name?: string | null
          event_type?: string
          message?: string
          metadata?: Json | null
          created_at?: string
        }
      }
    }
  }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Household = Database['public']['Tables']['households']['Row']
export type Adult = Database['public']['Tables']['adults']['Row']
export type Child = Database['public']['Tables']['children']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type ExpenseItem = Database['public']['Tables']['expense_items']['Row']
export type PromoCode = Database['public']['Tables']['promo_codes']['Row']
export type ActivityLog = Database['public']['Tables']['activity_log']['Row']

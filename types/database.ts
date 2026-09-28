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
          created_by_coach_id: string | null
          claimed_at: string | null
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
          created_by_coach_id?: string | null
          claimed_at?: string | null
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
          created_by_coach_id?: string | null
          claimed_at?: string | null
        }
        Relationships: []
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
        Relationships: []
      }
      adults: {
        Row: {
          id: string
          user_id: string
          name: string
          age: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          age?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          age?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      children: {
        Row: {
          id: string
          user_id: string
          name: string
          age: number | null
          school_level: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          age?: number | null
          school_level?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          age?: number | null
          school_level?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
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
          updated_at: string
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
          updated_at?: string
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
          updated_at?: string
        }
        Relationships: []
      }
      expense_items: {
        Row: {
          id: string
          user_id: string
          category_id: string
          name: string
          cost: number
          frequency: 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'term' | 'annual' | 'bi-monthly'
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
          frequency?: 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'term' | 'annual' | 'bi-monthly'
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
          frequency?: 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'term' | 'annual' | 'bi-monthly'
          quantity?: number
          total?: number
          need_want?: 'need' | 'want' | null
          adjusted_total?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
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
        Relationships: []
      }
      budget_edit_leases: {
        Row: BudgetEditLeaseRow
        Insert: Record<string, never>
        Update: Record<string, never>
        Relationships: []
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
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      redeem_promo_code: {
        Args: { code_input: string }
        Returns: boolean
      }
      coach_start_setup: {
        Args: { p_family: string }
        Returns: BudgetEditLeaseRow
      }
      coach_request_assist: {
        Args: { p_family: string }
        Returns: BudgetEditLeaseRow
      }
      family_respond_assist: {
        Args: { p_lease: string; p_accept: boolean }
        Returns: BudgetEditLeaseRow
      }
      end_edit_lease: {
        Args: { p_lease: string }
        Returns: BudgetEditLeaseRow
      }
      claim_family_budget: {
        Args: Record<string, never>
        Returns: boolean
      }
      get_my_edit_state: {
        Args: Record<string, never>
        Returns: Json
      }
      coach_create_entity: {
        Args: {
          p_family: string
          p_entity_type: 'child' | 'adult' | 'household'
          p_fields: Json
          p_categories: Json
        }
        Returns: string
      }
      coach_delete_entity: {
        Args: {
          p_family: string
          p_entity_type: 'child' | 'adult' | 'household'
          p_entity: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type BudgetEditLeaseMode = 'setup' | 'assist'
export type BudgetEditLeaseStatus = 'requested' | 'active' | 'ended' | 'declined'

// Type alias, not interface: supabase-js table rows must be assignable to Record<string, unknown>.
export type BudgetEditLeaseRow = {
  id: string
  user_id: string
  coach_id: string
  mode: BudgetEditLeaseMode
  status: BudgetEditLeaseStatus
  requested_at: string
  request_expires_at: string | null
  granted_at: string | null
  expires_at: string | null
  ended_at: string | null
  ended_by: string | null
  end_reason:
    | 'coach_done'
    | 'family_took_back'
    | 'claimed'
    | 'declined'
    | 'cancelled'
    | 'expired'
    | null
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
export type BudgetEditLease = BudgetEditLeaseRow

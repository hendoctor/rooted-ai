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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          activity_description: string | null
          activity_type: string
          company_id: string | null
          company_name: string | null
          created_at: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          user_agent: string | null
          user_email: string
          user_id: string | null
        }
        Insert: {
          activity_description?: string | null
          activity_type: string
          company_id?: string | null
          company_name?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          user_agent?: string | null
          user_email: string
          user_id?: string | null
        }
        Update: {
          activity_description?: string | null
          activity_type?: string
          company_id?: string | null
          company_name?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          user_agent?: string | null
          user_email?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      adoption_coaching: {
        Row: {
          contact: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          media: string | null
          meeting_link: string | null
          session_date: string | null
          session_duration: number | null
          session_leader_id: string | null
          session_notes: string | null
          session_status: string | null
          steps: string | null
          topic: string
          updated_at: string
        }
        Insert: {
          contact?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          media?: string | null
          meeting_link?: string | null
          session_date?: string | null
          session_duration?: number | null
          session_leader_id?: string | null
          session_notes?: string | null
          session_status?: string | null
          steps?: string | null
          topic: string
          updated_at?: string
        }
        Update: {
          contact?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          media?: string | null
          meeting_link?: string | null
          session_date?: string | null
          session_duration?: number | null
          session_leader_id?: string | null
          session_notes?: string | null
          session_status?: string | null
          steps?: string | null
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      adoption_coaching_companies: {
        Row: {
          coaching_id: string
          company_id: string
          created_at: string
        }
        Insert: {
          coaching_id: string
          company_id: string
          created_at?: string
        }
        Update: {
          coaching_id?: string
          company_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "adoption_coaching_companies_coaching_id_fkey"
            columns: ["coaching_id"]
            isOneToOne: false
            referencedRelation: "adoption_coaching"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adoption_coaching_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_tool_companies: {
        Row: {
          ai_tool_id: string
          company_id: string
          created_at: string
        }
        Insert: {
          ai_tool_id: string
          company_id: string
          created_at?: string
        }
        Update: {
          ai_tool_id?: string
          company_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_tool_companies_ai_tool_id_fkey"
            columns: ["ai_tool_id"]
            isOneToOne: false
            referencedRelation: "ai_tools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tool_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_tools: {
        Row: {
          ai_tool: string
          comments: string | null
          created_at: string
          created_by: string | null
          id: string
          updated_at: string
          url: string | null
        }
        Insert: {
          ai_tool: string
          comments?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          ai_tool?: string
          comments?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      announcement_companies: {
        Row: {
          announcement_id: string
          company_id: string
          created_at: string
        }
        Insert: {
          announcement_id: string
          company_id: string
          created_at?: string
        }
        Update: {
          announcement_id?: string
          company_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_companies_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          author: string | null
          content: string | null
          created_at: string
          created_by: string | null
          id: string
          summary: string | null
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          author?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          summary?: string | null
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          author?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          summary?: string | null
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string
          id: string
          logo_filename: string | null
          logo_url: string | null
          name: string
          settings: Json | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_filename?: string | null
          logo_url?: string | null
          name: string
          settings?: Json | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_filename?: string | null
          logo_url?: string | null
          name?: string
          settings?: Json | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_memberships: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_form_fingerprints: {
        Row: {
          fingerprint_hash: string
          first_seen: string
          id: string
          ip_address: unknown
          is_suspicious: boolean
          language: string | null
          last_seen: string
          screen_resolution: string | null
          submission_count: number
          timezone_offset: number | null
          user_agent_hash: string | null
        }
        Insert: {
          fingerprint_hash: string
          first_seen?: string
          id?: string
          ip_address: unknown
          is_suspicious?: boolean
          language?: string | null
          last_seen?: string
          screen_resolution?: string | null
          submission_count?: number
          timezone_offset?: number | null
          user_agent_hash?: string | null
        }
        Update: {
          fingerprint_hash?: string
          first_seen?: string
          id?: string
          ip_address?: unknown
          is_suspicious?: boolean
          language?: string | null
          last_seen?: string
          screen_resolution?: string | null
          submission_count?: number
          timezone_offset?: number | null
          user_agent_hash?: string | null
        }
        Relationships: []
      }
      contact_form_honeypots: {
        Row: {
          blocked: boolean
          honeypot_field: string | null
          id: string
          ip_address: unknown
          timestamp: string
          user_agent: string | null
        }
        Insert: {
          blocked?: boolean
          honeypot_field?: string | null
          id?: string
          ip_address: unknown
          timestamp?: string
          user_agent?: string | null
        }
        Update: {
          blocked?: boolean
          honeypot_field?: string | null
          id?: string
          ip_address?: unknown
          timestamp?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      contact_form_rate_limits: {
        Row: {
          created_at: string
          id: string
          ip_address: unknown
          submission_count: number
          updated_at: string
          window_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address: unknown
          submission_count?: number
          updated_at?: string
          window_start?: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: unknown
          submission_count?: number
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_address: unknown | null
          message: string
          name: string
          service_type: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_address?: unknown | null
          message: string
          name: string
          service_type?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_address?: unknown | null
          message?: string
          name?: string
          service_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      faq_companies: {
        Row: {
          company_id: string
          created_at: string
          faq_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          faq_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          faq_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "faq_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faq_companies_faq_id_fkey"
            columns: ["faq_id"]
            isOneToOne: false
            referencedRelation: "faqs"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          answer: string
          category: string | null
          created_at: string
          created_by: string | null
          goal: string | null
          id: string
          question: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          goal?: string | null
          id?: string
          question: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          goal?: string | null
          id?: string
          question?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      invitation_token_attempts: {
        Row: {
          attempt_time: string
          id: string
          ip_address: unknown
          success: boolean
          token_prefix: string
        }
        Insert: {
          attempt_time?: string
          id?: string
          ip_address: unknown
          success?: boolean
          token_prefix: string
        }
        Update: {
          attempt_time?: string
          id?: string
          ip_address?: unknown
          success?: boolean
          token_prefix?: string
        }
        Relationships: []
      }
      newsletter_subscriptions: {
        Row: {
          company_id: string | null
          created_at: string
          email: string
          frequency: string | null
          id: string
          source: string | null
          status: string
          unsubscribed_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email: string
          frequency?: string | null
          id?: string
          source?: string | null
          status?: string
          unsubscribed_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string
          frequency?: string | null
          id?: string
          source?: string | null
          status?: string
          unsubscribed_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_subscriptions_email_fkey"
            columns: ["email"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["email"]
          },
        ]
      }
      notifications: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          notification_type: string
          priority: string
          read_at: string | null
          reference_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          notification_type: string
          priority?: string
          read_at?: string | null
          reference_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          notification_type?: string
          priority?: string
          read_at?: string | null
          reference_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_resource_companies: {
        Row: {
          company_id: string
          created_at: string
          resource_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          resource_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          resource_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_resource_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_resource_companies_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "portal_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_resources: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          link: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          link?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          link?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      report_companies: {
        Row: {
          company_id: string
          created_at: string
          report_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          report_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_companies_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          kpis: Json
          link: string | null
          name: string
          notes: string | null
          period: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          kpis?: Json
          link?: string | null
          name: string
          notes?: string | null
          period?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          kpis?: Json
          link?: string | null
          name?: string
          notes?: string | null
          period?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          created_at: string
          event_details: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_details?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_details?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      useful_link_companies: {
        Row: {
          company_id: string
          created_at: string
          link_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          link_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          link_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "useful_link_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "useful_link_companies_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "useful_links"
            referencedColumns: ["id"]
          },
        ]
      }
      useful_links: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          client_name: string | null
          company_id: string | null
          company_role: string
          created_at: string
          email: string
          expires_at: string
          full_name: string
          id: string
          invitation_token: string
          invited_by: string
          role: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          client_name?: string | null
          company_id?: string | null
          company_role?: string
          created_at?: string
          email: string
          expires_at?: string
          full_name: string
          id?: string
          invitation_token?: string
          invited_by: string
          role?: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          client_name?: string | null
          company_id?: string | null
          company_role?: string
          created_at?: string
          email?: string
          expires_at?: string
          full_name?: string
          id?: string
          invitation_token?: string
          invited_by?: string
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string
          avatar_filename: string | null
          avatar_url: string | null
          client_name: string | null
          created_at: string | null
          display_name: string | null
          email: string
          id: string
          role: string
          updated_at: string | null
        }
        Insert: {
          auth_user_id: string
          avatar_filename?: string | null
          avatar_url?: string | null
          client_name?: string | null
          created_at?: string | null
          display_name?: string | null
          email: string
          id?: string
          role?: string
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string
          avatar_filename?: string | null
          avatar_url?: string | null
          client_name?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string
          id?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation_finalize: {
        Args: { token_input: string }
        Returns: Json
      }
      backfill_missing_notifications: {
        Args: { p_company_id?: string; p_hours_back?: number }
        Returns: {
          content_assignments: number
          content_type: string
          notifications_created: number
        }[]
      }
      can_access_full_user_profile: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      check_contact_form_rate_limit: {
        Args: { client_ip: unknown }
        Returns: boolean
      }
      check_invitation_attempt_rate_limit: {
        Args: {
          client_ip: unknown
          max_attempts?: number
          window_minutes?: number
        }
        Returns: boolean
      }
      check_invitation_rate_limit: {
        Args: {
          admin_id: string
          max_per_15_minutes?: number
          max_per_day?: number
        }
        Returns: boolean
      }
      cleanup_expired_invitations: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_content_notification: {
        Args: {
          p_company_ids: string[]
          p_content_id: string
          p_content_type: string
          p_message?: string
          p_priority?: string
          p_title: string
        }
        Returns: undefined
      }
      delete_user_completely: {
        Args: { user_email: string }
        Returns: undefined
      }
      delete_user_completely_enhanced: {
        Args: { user_email: string }
        Returns: Json
      }
      ensure_membership_for_current_user: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_admin_portal_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          ai_tool_count: number
          announcement_count: number
          coaching_count: number
          company_id: string
          company_name: string
          company_slug: string
          faq_count: number
          kpi_count: number
          last_updated: string
          resource_count: number
          useful_link_count: number
          user_count: number
        }[]
      }
      get_company_member_profiles: {
        Args: { company_id_param: string }
        Returns: {
          avatar_url: string
          client_name: string
          created_at: string
          display_name: string
          role: string
          user_id: string
        }[]
      }
      get_company_members_detailed: {
        Args: { company_id_param: string }
        Returns: {
          display_name: string
          email: string
          joined_at: string
          newsletter_frequency: string
          newsletter_status: string
          role: string
          user_id: string
        }[]
      }
      get_company_members_minimal: {
        Args: { p_company_id: string }
        Returns: {
          display_name: string
          email: string
          joined_date: string
          member_role: string
          newsletter_frequency: string
          newsletter_status: string
          user_id: string
        }[]
      }
      get_company_newsletter_details: {
        Args: { p_company_id: string }
        Returns: {
          display_name: string
          email: string
          is_subscribed: boolean
          newsletter_frequency: string
          newsletter_status: string
          user_id: string
        }[]
      }
      get_company_newsletter_stats: {
        Args: { p_company_id: string }
        Returns: {
          daily_subscribers: number
          monthly_subscribers: number
          subscribed_members: number
          total_members: number
          unsubscribed_members: number
          weekly_subscribers: number
        }[]
      }
      get_company_portal_content: {
        Args: { company_id_param: string }
        Returns: {
          ai_tools: Json
          announcements: Json
          coaching: Json
          faqs: Json
          kpis: Json
          resources: Json
          useful_links: Json
        }[]
      }
      get_company_user_activity: {
        Args: { p_company_id: string; p_limit?: number }
        Returns: {
          activity_time: string
          activity_type: string
          description: string
          metadata: Json
          user_email: string
        }[]
      }
      get_company_users_for_admin: {
        Args: { p_company_id: string }
        Returns: {
          companies: Json
          company_role: string
          email: string
          expires_at: string
          invitation_id: string
          invitation_token: string
          last_activity: string
          name: string
          newsletter_frequency: string
          newsletter_id: string
          newsletter_status: string
          registration_date: string
          role: string
          source_table: string
          status: string
          user_id: string
        }[]
      }
      get_current_user_client_name: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_notification_diagnostics: {
        Args: { p_company_id?: string }
        Returns: {
          company_id: string
          company_name: string
          notification_errors: number
          recent_content_assignments: number
          recent_notifications: number
          total_members: number
        }[]
      }
      get_session_with_leader_info: {
        Args: { company_id_param: string }
        Returns: {
          description: string
          id: string
          leader_avatar_url: string
          leader_email: string
          leader_name: string
          meeting_link: string
          session_date: string
          session_duration: number
          session_notes: string
          session_status: string
          topic: string
        }[]
      }
      get_unified_user_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          companies: Json
          email: string
          expires_at: string
          invitation_id: string
          invitation_token: string
          last_activity: string
          name: string
          newsletter_frequency: string
          newsletter_id: string
          newsletter_status: string
          registration_date: string
          role: string
          source_table: string
          status: string
          user_id: string
        }[]
      }
      get_unread_notification_count: {
        Args: { p_user_id?: string }
        Returns: number
      }
      get_user_companies: {
        Args: Record<PropertyKey, never>
        Returns: {
          company_id: string
          company_name: string
          company_slug: string
          is_admin: boolean
          user_role: string
        }[]
      }
      get_user_context_optimized: {
        Args: { p_user_id: string }
        Returns: {
          companies: Json
          permissions: Json
          role: string
        }[]
      }
      get_user_newsletter_preferences: {
        Args: { p_user_id: string }
        Returns: {
          company_id: string
          created_at: string
          email: string
          frequency: string
          id: string
          status: string
          updated_at: string
        }[]
      }
      get_user_notifications: {
        Args: { p_limit?: number; p_user_id?: string }
        Returns: {
          content_title: string
          content_url: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          notification_type: string
          priority: string
          read_at: string
          reference_id: string
          title: string
        }[]
      }
      get_user_profile: {
        Args: { p_user_id: string }
        Returns: {
          companies: Json
          user_client_name: string
          user_display_name: string
          user_email: string
          user_role: string
        }[]
      }
      get_user_role_by_auth_id: {
        Args: { auth_user_id: string }
        Returns: Json
      }
      get_user_role_secure: {
        Args: { user_email: string }
        Returns: Json
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_company_admin: {
        Args: { company_id_param: string }
        Returns: boolean
      }
      is_company_member: {
        Args: { company_id_param: string }
        Returns: boolean
      }
      log_invitation_access: {
        Args: { access_result: string; token_used: string; user_ip?: unknown }
        Returns: undefined
      }
      log_security_event: {
        Args: { event_details?: Json; event_type: string; user_id?: string }
        Returns: undefined
      }
      log_security_event_enhanced: {
        Args: {
          event_details?: Json
          event_type: string
          risk_level?: string
          user_id?: string
        }
        Returns: undefined
      }
      log_user_activity: {
        Args: {
          p_activity_description?: string
          p_activity_type?: string
          p_company_id?: string
          p_company_name?: string
          p_ip_address?: unknown
          p_metadata?: Json
          p_user_agent?: string
          p_user_email: string
          p_user_id: string
        }
        Returns: undefined
      }
      mark_notifications_as_read: {
        Args: { p_notification_ids?: string[]; p_user_id?: string }
        Returns: undefined
      }
      remove_user_from_company: {
        Args:
          | {
              p_admin_user_id?: string
              p_company_id: string
              p_user_email: string
            }
          | { p_company_id: string; p_user_email: string }
        Returns: Json
      }
      require_role: {
        Args: { company_id_param?: string; required_roles: string[] }
        Returns: boolean
      }
      resend_company_invitation: {
        Args: { p_company_id: string; p_invitation_id: string }
        Returns: Json
      }
      resync_user_roles: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      shares_company_with_user: {
        Args: { target_auth_id: string }
        Returns: boolean
      }
      test_notification_creation: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_company_user_role: {
        Args: { p_company_id: string; p_new_role: string; p_user_id: string }
        Returns: Json
      }
      update_newsletter_preferences: {
        Args: {
          p_company_id?: string
          p_email: string
          p_frequency?: string
          p_status?: string
          p_user_id: string
        }
        Returns: Json
      }
      user_is_company_member: {
        Args: { company_id_param: string }
        Returns: boolean
      }
      validate_admin_reset_request: {
        Args: {
          admin_user_id: string
          client_ip?: unknown
          reset_token: string
        }
        Returns: Json
      }
      validate_contact_submission: {
        Args: {
          p_fingerprint_data?: Json
          p_honeypot_field?: string
          p_ip_address: unknown
          p_user_agent: string
        }
        Returns: Json
      }
      validate_contact_submission_enhanced: {
        Args: {
          p_fingerprint_data?: Json
          p_honeypot_field?: string
          p_ip_address: unknown
          p_origin?: string
          p_user_agent: string
        }
        Returns: Json
      }
      validate_invitation_secure: {
        Args: { token_input: string }
        Returns: Json
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
    Enums: {},
  },
} as const

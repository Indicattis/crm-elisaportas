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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      acquisition_channels: {
        Row: {
          created_at: string
          icon: string
          id: string
          name: string
          position: number
          user_id: string
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          name: string
          position?: number
          user_id: string
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          name?: string
          position?: number
          user_id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      column_blocked_fields: {
        Row: {
          column_id: string
          created_at: string
          field_name: string
          id: string
          user_id: string
        }
        Insert: {
          column_id: string
          created_at?: string
          field_name: string
          id?: string
          user_id: string
        }
        Update: {
          column_id?: string
          created_at?: string
          field_name?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "column_blocked_fields_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "funnel_columns"
            referencedColumns: ["id"]
          },
        ]
      }
      column_daily_snapshots: {
        Row: {
          column_name: string
          count: number
          created_at: string
          date: string
          funnel_id: string
          id: string
          seller_id: string | null
        }
        Insert: {
          column_name: string
          count?: number
          created_at?: string
          date?: string
          funnel_id: string
          id?: string
          seller_id?: string | null
        }
        Update: {
          column_name?: string
          count?: number
          created_at?: string
          date?: string
          funnel_id?: string
          id?: string
          seller_id?: string | null
        }
        Relationships: []
      }
      column_entry_requirements: {
        Row: {
          column_id: string
          created_at: string
          field_name: string
          id: string
          user_id: string
        }
        Insert: {
          column_id: string
          created_at?: string
          field_name: string
          id?: string
          user_id: string
        }
        Update: {
          column_id?: string
          created_at?: string
          field_name?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "column_entry_requirements_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "funnel_columns"
            referencedColumns: ["id"]
          },
        ]
      }
      company_revenue: {
        Row: {
          created_at: string
          id: string
          singleton: boolean
          updated_at: string
          updated_by: string | null
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          singleton?: boolean
          updated_at?: string
          updated_by?: string | null
          value?: number
        }
        Update: {
          created_at?: string
          id?: string
          singleton?: boolean
          updated_at?: string
          updated_by?: string | null
          value?: number
        }
        Relationships: []
      }
      contact_colors: {
        Row: {
          color: string
          contact_id: string
          created_at: string
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          color?: string
          contact_id: string
          created_at?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          color?: string
          contact_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_colors_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          city: string | null
          column_id: string
          created_at: string
          funnel_id: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          position: number
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          column_id: string
          created_at?: string
          funnel_id: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          position?: number
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          column_id?: string
          created_at?: string
          funnel_id?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          position?: number
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "funnel_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_attachments: {
        Row: {
          created_at: string
          deal_id: string
          file_name: string
          file_path: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          file_name: string
          file_path: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          file_name?: string
          file_path?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_attachments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_comments: {
        Row: {
          content: string
          created_at: string
          deal_id: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          deal_id: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deal_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_comments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_daily_color: {
        Row: {
          color: string
          date: string
          deal_id: string
          id: string
          updated_by: string
        }
        Insert: {
          color?: string
          date?: string
          deal_id: string
          id?: string
          updated_by: string
        }
        Update: {
          color?: string
          date?: string
          deal_id?: string
          id?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_daily_color_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_history: {
        Row: {
          created_at: string
          deal_id: string
          description: string
          event_type: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          description: string
          event_type: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          description?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      deal_tags: {
        Row: {
          created_at: string
          deal_id: string
          id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          id?: string
          tag_id: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_tags_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_tasks: {
        Row: {
          completed: boolean
          completed_at: string | null
          completed_by: string | null
          created_at: string
          cycle: number
          deadline_at: string
          deal_id: string
          description: string | null
          id: string
          next_recurrence_at: string | null
          stage_id: string | null
          template_id: string | null
          type: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          cycle?: number
          deadline_at: string
          deal_id: string
          description?: string | null
          id?: string
          next_recurrence_at?: string | null
          stage_id?: string | null
          template_id?: string | null
          type?: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          cycle?: number
          deadline_at?: string
          deal_id?: string
          description?: string | null
          id?: string
          next_recurrence_at?: string | null
          stage_id?: string | null
          template_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_tasks_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "task_group_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          acquisition_channel: string | null
          archive_reason: string | null
          archived: boolean
          assigned_to: string | null
          city: string | null
          client_id: string | null
          contact_id: string | null
          created_at: string
          deal_number: number | null
          email: string | null
          funnel_id: string | null
          heat: number
          id: string
          loss_reason: string | null
          notes: string | null
          phone: string | null
          return_date: string | null
          sold_at: string | null
          state: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
          value: number | null
        }
        Insert: {
          acquisition_channel?: string | null
          archive_reason?: string | null
          archived?: boolean
          assigned_to?: string | null
          city?: string | null
          client_id?: string | null
          contact_id?: string | null
          created_at?: string
          deal_number?: number | null
          email?: string | null
          funnel_id?: string | null
          heat?: number
          id?: string
          loss_reason?: string | null
          notes?: string | null
          phone?: string | null
          return_date?: string | null
          sold_at?: string | null
          state?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
          value?: number | null
        }
        Update: {
          acquisition_channel?: string | null
          archive_reason?: string | null
          archived?: boolean
          assigned_to?: string | null
          city?: string | null
          client_id?: string | null
          contact_id?: string | null
          created_at?: string
          deal_number?: number | null
          email?: string | null
          funnel_id?: string | null
          heat?: number
          id?: string
          loss_reason?: string | null
          notes?: string | null
          phone?: string | null
          return_date?: string | null
          sold_at?: string | null
          state?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      external_integration_logs: {
        Row: {
          assigned_to: string | null
          created_at: string
          deal_id: string | null
          error_message: string | null
          http_status: number
          id: string
          ip: string | null
          phone: string | null
          raw_body: Json | null
          source: string
          status: string
          title: string | null
          user_agent: string | null
          warning: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          deal_id?: string | null
          error_message?: string | null
          http_status: number
          id?: string
          ip?: string | null
          phone?: string | null
          raw_body?: Json | null
          source?: string
          status: string
          title?: string | null
          user_agent?: string | null
          warning?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          deal_id?: string | null
          error_message?: string | null
          http_status?: number
          id?: string
          ip?: string | null
          phone?: string | null
          raw_body?: Json | null
          source?: string
          status?: string
          title?: string | null
          user_agent?: string | null
          warning?: string | null
        }
        Relationships: []
      }
      funnel_columns: {
        Row: {
          allowed_actions: string[]
          color: string
          column_type: Database["public"]["Enums"]["column_type"]
          created_at: string
          daily_colors: string[]
          funnel_id: string
          has_daily_color: boolean
          id: string
          is_notice: boolean
          name: string
          notice_text: string | null
          position: number
          show_sell_button: boolean
          sort_order: string
          task_group_id: string | null
          user_id: string
        }
        Insert: {
          allowed_actions?: string[]
          color?: string
          column_type?: Database["public"]["Enums"]["column_type"]
          created_at?: string
          daily_colors?: string[]
          funnel_id: string
          has_daily_color?: boolean
          id?: string
          is_notice?: boolean
          name: string
          notice_text?: string | null
          position?: number
          show_sell_button?: boolean
          sort_order?: string
          task_group_id?: string | null
          user_id: string
        }
        Update: {
          allowed_actions?: string[]
          color?: string
          column_type?: Database["public"]["Enums"]["column_type"]
          created_at?: string
          daily_colors?: string[]
          funnel_id?: string
          has_daily_color?: boolean
          id?: string
          is_notice?: boolean
          name?: string
          notice_text?: string | null
          position?: number
          show_sell_button?: boolean
          sort_order?: string
          task_group_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_columns_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_columns_task_group_id_fkey"
            columns: ["task_group_id"]
            isOneToOne: false
            referencedRelation: "task_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_members: {
        Row: {
          created_at: string
          funnel_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          funnel_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          funnel_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_members_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_tracks: {
        Row: {
          color: string
          created_at: string
          end_column_id: string
          funnel_id: string
          id: string
          label: string
          row_index: number
          start_column_id: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          end_column_id: string
          funnel_id: string
          id?: string
          label?: string
          row_index?: number
          start_column_id: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          end_column_id?: string
          funnel_id?: string
          id?: string
          label?: string
          row_index?: number
          start_column_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_tracks_end_column_id_fkey"
            columns: ["end_column_id"]
            isOneToOne: false
            referencedRelation: "funnel_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_tracks_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_tracks_start_column_id_fkey"
            columns: ["start_column_id"]
            isOneToOne: false
            referencedRelation: "funnel_columns"
            referencedColumns: ["id"]
          },
        ]
      }
      funnels: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number
          user_id?: string
        }
        Relationships: []
      }
      lead_flows: {
        Row: {
          acquisition_channel: string | null
          active: boolean
          assignment_mode: string
          created_at: string
          funnel_id: string
          id: string
          name: string
          status: string
          user_id: string
        }
        Insert: {
          acquisition_channel?: string | null
          active?: boolean
          assignment_mode?: string
          created_at?: string
          funnel_id: string
          id?: string
          name: string
          status?: string
          user_id: string
        }
        Update: {
          acquisition_channel?: string | null
          active?: boolean
          assignment_mode?: string
          created_at?: string
          funnel_id?: string
          id?: string
          name?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          deal_id: string | null
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deal_id?: string | null
          id?: string
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          deal_id?: string | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          must_change_password: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          must_change_password?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          must_change_password?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      recurring_task_completions: {
        Row: {
          completed_at: string
          id: string
          period_start: string
          task_key: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          period_start: string
          task_key: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          period_start?: string
          task_key?: string
          user_id?: string
        }
        Relationships: []
      }
      sales_planning_clients: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          seller_id: string
          temperature: Database["public"]["Enums"]["sales_temperature"]
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          seller_id: string
          temperature?: Database["public"]["Enums"]["sales_temperature"]
          updated_at?: string
          value?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          seller_id?: string
          temperature?: Database["public"]["Enums"]["sales_temperature"]
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      shared_notes: {
        Row: {
          content: string
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      task_group_schedules: {
        Row: {
          created_at: string
          days: number[]
          group_id: string
          id: string
          position: number
          task_description: string | null
          task_type: string
          time: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days?: number[]
          group_id: string
          id?: string
          position?: number
          task_description?: string | null
          task_type?: string
          time?: string
          user_id: string
        }
        Update: {
          created_at?: string
          days?: number[]
          group_id?: string
          id?: string
          position?: number
          task_description?: string | null
          task_type?: string
          time?: string
          user_id?: string
        }
        Relationships: []
      }
      task_group_stages: {
        Row: {
          color: string
          created_at: string
          group_id: string
          id: string
          name: string
          position: number
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          group_id: string
          id?: string
          name: string
          position?: number
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          group_id?: string
          id?: string
          name?: string
          position?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_group_stages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "task_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      task_groups: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number
          schedule_days: number[]
          schedule_mode: string
          schedule_task_description: string | null
          schedule_task_type: string
          schedule_time: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position?: number
          schedule_days?: number[]
          schedule_mode?: string
          schedule_task_description?: string | null
          schedule_task_type?: string
          schedule_time?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number
          schedule_days?: number[]
          schedule_mode?: string
          schedule_task_description?: string | null
          schedule_task_type?: string
          schedule_time?: string
          user_id?: string
        }
        Relationships: []
      }
      task_templates: {
        Row: {
          created_at: string
          deadline_hours: number
          description: string | null
          group_id: string
          id: string
          position: number
          recurrence_type: string | null
          recurrence_value: number | null
          stage_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deadline_hours?: number
          description?: string | null
          group_id: string
          id?: string
          position?: number
          recurrence_type?: string | null
          recurrence_value?: number | null
          stage_id?: string | null
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deadline_hours?: number
          description?: string | null
          group_id?: string
          id?: string
          position?: number
          recurrence_type?: string | null
          recurrence_value?: number | null
          stage_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "task_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "task_group_stages"
            referencedColumns: ["id"]
          },
        ]
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
      can_access_deal: {
        Args: { _deal_id: string; _user_id: string }
        Returns: boolean
      }
      get_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      recreate_deal_tasks: { Args: { _deal_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "vendedor"
      column_type: "deals" | "notice" | "contacts"
      sales_temperature: "hot" | "warm"
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
      app_role: ["admin", "vendedor"],
      column_type: ["deals", "notice", "contacts"],
      sales_temperature: ["hot", "warm"],
    },
  },
} as const

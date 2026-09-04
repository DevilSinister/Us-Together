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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bucket_item_subtasks: {
        Row: {
          created_at: string
          id: string
          is_completed: boolean
          item_id: string
          label: string
          position: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_completed?: boolean
          item_id: string
          label: string
          position: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_completed?: boolean
          item_id?: string
          label?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bucket_item_subtasks_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "bucket_list_items"
            referencedColumns: ["id"]
          },
        ]
      }
      bucket_list_items: {
        Row: {
          category: string | null
          completed_at: string | null
          completed_by: string | null
          couple_id: string
          created_at: string
          created_by: string
          currency: string | null
          description: string | null
          estimated_cost_minor: number | null
          id: string
          list_id: string
          location: string | null
          priority: string
          status: string
          target_date: string | null
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          category?: string | null
          completed_at?: string | null
          completed_by?: string | null
          couple_id: string
          created_at?: string
          created_by?: string
          currency?: string | null
          description?: string | null
          estimated_cost_minor?: number | null
          id?: string
          list_id: string
          location?: string | null
          priority?: string
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          category?: string | null
          completed_at?: string | null
          completed_by?: string | null
          couple_id?: string
          created_at?: string
          created_by?: string
          currency?: string | null
          description?: string | null
          estimated_cost_minor?: number | null
          id?: string
          list_id?: string
          location?: string | null
          priority?: string
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "bucket_list_items_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bucket_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "bucket_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      bucket_lists: {
        Row: {
          couple_id: string
          created_at: string
          created_by: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          created_by?: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          created_by?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bucket_lists_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      couple_invitations: {
        Row: {
          attempt_count: number
          code_hash: string
          couple_id: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          last_attempt_at: string | null
          max_attempts: number
          revoked_at: string | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          attempt_count?: number
          code_hash: string
          couple_id: string
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          last_attempt_at?: string | null
          max_attempts?: number
          revoked_at?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          attempt_count?: number
          code_hash?: string
          couple_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          last_attempt_at?: string | null
          max_attempts?: number
          revoked_at?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "couple_invitations_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      couple_memberships: {
        Row: {
          couple_id: string
          id: string
          joined_at: string
          left_at: string | null
          user_id: string
        }
        Insert: {
          couple_id: string
          id?: string
          joined_at?: string
          left_at?: string | null
          user_id: string
        }
        Update: {
          couple_id?: string
          id?: string
          joined_at?: string
          left_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "couple_memberships_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      couples: {
        Row: {
          created_at: string
          created_by: string
          id: string
          relationship_started_on: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          relationship_started_on?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          relationship_started_on?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      entry_comments: {
        Row: {
          body: string
          created_at: string
          created_by: string
          id: string
          memory_id: string | null
          milestone_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string
          id?: string
          memory_id?: string | null
          milestone_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          id?: string
          memory_id?: string | null
          milestone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entry_comments_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "memories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_comments_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      entry_reminders: {
        Row: {
          attempts: number
          due_at: string
          id: string
          memory_id: string | null
          milestone_id: string | null
          next_attempt_at: string
          state: string
          user_id: string
        }
        Insert: {
          attempts?: number
          due_at: string
          id?: string
          memory_id?: string | null
          milestone_id?: string | null
          next_attempt_at?: string
          state?: string
          user_id?: string
        }
        Update: {
          attempts?: number
          due_at?: string
          id?: string
          memory_id?: string | null
          milestone_id?: string | null
          next_attempt_at?: string
          state?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entry_reminders_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "memories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_reminders_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      media_comments: {
        Row: {
          body: string
          created_at: string
          created_by: string
          id: string
          memory_media_id: string | null
          milestone_media_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string
          id?: string
          memory_media_id?: string | null
          milestone_media_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          id?: string
          memory_media_id?: string | null
          milestone_media_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_comments_memory_media_id_fkey"
            columns: ["memory_media_id"]
            isOneToOne: false
            referencedRelation: "memory_media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_comments_milestone_media_id_fkey"
            columns: ["milestone_media_id"]
            isOneToOne: false
            referencedRelation: "milestone_media"
            referencedColumns: ["id"]
          },
        ]
      }
      memories: {
        Row: {
          couple_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_favorite: boolean
          latitude: number | null
          location: string | null
          longitude: number | null
          memory_date: string
          rating: number | null
          source_bucket_item_id: string | null
          source_plan_id: string | null
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          couple_id: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_favorite?: boolean
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          memory_date: string
          rating?: number | null
          source_bucket_item_id?: string | null
          source_plan_id?: string | null
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          couple_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_favorite?: boolean
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          memory_date?: string
          rating?: number | null
          source_bucket_item_id?: string | null
          source_plan_id?: string | null
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "memories_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memories_source_bucket_item_id_fkey"
            columns: ["source_bucket_item_id"]
            isOneToOne: false
            referencedRelation: "bucket_list_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memories_source_plan_id_fkey"
            columns: ["source_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_media: {
        Row: {
          caption: string
          created_at: string
          created_by: string
          derivative_path: string | null
          duration_seconds: number | null
          error_code: string | null
          height: number | null
          id: string
          media_type: string
          memory_id: string
          mime_type: string
          processing_at: string | null
          processing_token: string | null
          size_bytes: number
          state: string
          storage_path: string
          upload_expires_at: string
          width: number | null
        }
        Insert: {
          caption?: string
          created_at?: string
          created_by?: string
          derivative_path?: string | null
          duration_seconds?: number | null
          error_code?: string | null
          height?: number | null
          id?: string
          media_type: string
          memory_id: string
          mime_type: string
          processing_at?: string | null
          processing_token?: string | null
          size_bytes: number
          state?: string
          storage_path: string
          upload_expires_at?: string
          width?: number | null
        }
        Update: {
          caption?: string
          created_at?: string
          created_by?: string
          derivative_path?: string | null
          duration_seconds?: number | null
          error_code?: string | null
          height?: number | null
          id?: string
          media_type?: string
          memory_id?: string
          mime_type?: string
          processing_at?: string | null
          processing_token?: string | null
          size_bytes?: number
          state?: string
          storage_path?: string
          upload_expires_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "memory_media_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "memories"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_tag_links: {
        Row: {
          created_at: string
          memory_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          memory_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          memory_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_tag_links_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "memories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_tag_links_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "memory_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_tags: {
        Row: {
          couple_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_tags_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_media: {
        Row: {
          caption: string
          created_at: string
          created_by: string
          derivative_path: string | null
          duration_seconds: number | null
          error_code: string | null
          height: number | null
          id: string
          media_type: string
          milestone_id: string
          mime_type: string
          processing_at: string | null
          processing_token: string | null
          size_bytes: number
          state: string
          storage_path: string
          upload_expires_at: string
          width: number | null
        }
        Insert: {
          caption?: string
          created_at?: string
          created_by?: string
          derivative_path?: string | null
          duration_seconds?: number | null
          error_code?: string | null
          height?: number | null
          id?: string
          media_type: string
          milestone_id: string
          mime_type: string
          processing_at?: string | null
          processing_token?: string | null
          size_bytes: number
          state?: string
          storage_path: string
          upload_expires_at?: string
          width?: number | null
        }
        Update: {
          caption?: string
          created_at?: string
          created_by?: string
          derivative_path?: string | null
          duration_seconds?: number | null
          error_code?: string | null
          height?: number | null
          id?: string
          media_type?: string
          milestone_id?: string
          mime_type?: string
          processing_at?: string | null
          processing_token?: string | null
          size_bytes?: number
          state?: string
          storage_path?: string
          upload_expires_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "milestone_media_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          couple_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_featured: boolean
          location: string | null
          milestone_date: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_featured?: boolean
          location?: string | null
          milestone_date: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_featured?: boolean
          location?: string | null
          milestone_date?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      note_reads: {
        Row: {
          note_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          note_id: string
          read_at?: string
          user_id?: string
        }
        Update: {
          note_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_reads_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          author_id: string
          body: string
          couple_id: string
          created_at: string
          id: string
          recipient_id: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          author_id?: string
          body: string
          couple_id: string
          created_at?: string
          id?: string
          recipient_id?: string | null
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          couple_id?: string
          created_at?: string
          id?: string
          recipient_id?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          in_app_enabled: boolean
          memories_enabled: boolean
          milestones_enabled: boolean
          notes_enabled: boolean
          plans_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          in_app_enabled?: boolean
          memories_enabled?: boolean
          milestones_enabled?: boolean
          notes_enabled?: boolean
          plans_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          in_app_enabled?: boolean
          memories_enabled?: boolean
          milestones_enabled?: boolean
          notes_enabled?: boolean
          plans_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          category: string
          couple_id: string | null
          created_at: string
          id: string
          idempotency_key: string
          read_at: string | null
          recipient_id: string
          target_id: string | null
          target_type: string | null
          title: string
        }
        Insert: {
          category: string
          couple_id?: string | null
          created_at?: string
          id?: string
          idempotency_key: string
          read_at?: string | null
          recipient_id: string
          target_id?: string | null
          target_type?: string | null
          title: string
        }
        Update: {
          category?: string
          couple_id?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string
          read_at?: string | null
          recipient_id?: string
          target_id?: string | null
          target_type?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_attachments: {
        Row: {
          created_at: string
          filename: string
          id: string
          mime_type: string
          object_path: string
          plan_id: string
          ready: boolean
          size_bytes: number
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          filename: string
          id?: string
          mime_type: string
          object_path: string
          plan_id: string
          ready?: boolean
          size_bytes: number
          uploaded_by?: string
        }
        Update: {
          created_at?: string
          filename?: string
          id?: string
          mime_type?: string
          object_path?: string
          plan_id?: string
          ready?: boolean
          size_bytes?: number
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_attachments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_checklist_items: {
        Row: {
          created_at: string
          id: string
          is_completed: boolean
          label: string
          plan_id: string
          position: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_completed?: boolean
          label: string
          plan_id: string
          position: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_completed?: boolean
          label?: string
          plan_id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_checklist_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_reminders: {
        Row: {
          attempts: number
          channel: string
          created_at: string
          created_by: string
          delivered_at: string | null
          delivery_key: string
          due_at: string
          id: string
          last_error_code: string | null
          next_attempt_at: string | null
          offset_minutes: number
          plan_id: string
          state: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          channel?: string
          created_at?: string
          created_by?: string
          delivered_at?: string | null
          delivery_key?: string
          due_at: string
          id?: string
          last_error_code?: string | null
          next_attempt_at?: string | null
          offset_minutes?: number
          plan_id: string
          state?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          channel?: string
          created_at?: string
          created_by?: string
          delivered_at?: string | null
          delivery_key?: string
          due_at?: string
          id?: string
          last_error_code?: string | null
          next_attempt_at?: string | null
          offset_minutes?: number
          plan_id?: string
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_reminders_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          budget_minor: number | null
          completed_at: string | null
          completed_by: string | null
          couple_id: string
          created_at: string
          created_by: string
          currency: string | null
          description: string | null
          ends_at: string | null
          external_map_url: string | null
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          originating_timezone: string
          source_bucket_item_id: string | null
          starts_at: string
          status: string
          title: string
          type: string
          updated_at: string
          version: number
        }
        Insert: {
          budget_minor?: number | null
          completed_at?: string | null
          completed_by?: string | null
          couple_id: string
          created_at?: string
          created_by?: string
          currency?: string | null
          description?: string | null
          ends_at?: string | null
          external_map_url?: string | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          originating_timezone: string
          source_bucket_item_id?: string | null
          starts_at: string
          status?: string
          title: string
          type: string
          updated_at?: string
          version?: number
        }
        Update: {
          budget_minor?: number | null
          completed_at?: string | null
          completed_by?: string | null
          couple_id?: string
          created_at?: string
          created_by?: string
          currency?: string | null
          description?: string | null
          ends_at?: string | null
          external_map_url?: string | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          originating_timezone?: string
          source_bucket_item_id?: string | null
          starts_at?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "plans_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_source_bucket_item_id_fkey"
            columns: ["source_bucket_item_id"]
            isOneToOne: false
            referencedRelation: "bucket_list_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          date_of_birth: string | null
          display_name: string | null
          onboarding_completed: boolean
          relationship_started_on: string | null
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          onboarding_completed?: boolean
          relationship_started_on?: string | null
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          onboarding_completed?: boolean
          relationship_started_on?: string | null
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          category: string | null
          couple_id: string
          created_at: string
          currency: string | null
          description: string | null
          id: string
          notes: string | null
          owner_id: string
          price_minor: number | null
          priority: string
          product_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          couple_id: string
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          owner_id?: string
          price_minor?: number | null
          priority?: string
          product_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          couple_id?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          owner_id?: string
          price_minor?: number | null
          priority?: string
          product_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_purchase_secrets: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          purchased_at: string | null
          purchaser_id: string
          status: string
          updated_at: string
          wishlist_item_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          purchased_at?: string | null
          purchaser_id?: string
          status?: string
          updated_at?: string
          wishlist_item_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          purchased_at?: string | null
          purchaser_id?: string
          status?: string
          updated_at?: string
          wishlist_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_purchase_secrets_wishlist_item_id_fkey"
            columns: ["wishlist_item_id"]
            isOneToOne: false
            referencedRelation: "wishlist_items"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      shared_gallery: {
        Row: {
          caption: string | null
          couple_id: string | null
          duration_seconds: number | null
          entry_date: string | null
          entry_id: string | null
          entry_title: string | null
          id: string | null
          kind: string | null
          media_type: string | null
          mime_type: string | null
          size_bytes: number | null
          sort_key: string | null
          state: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_access_entry: {
        Args: { memory: string; moment: string }
        Returns: boolean
      }
      can_access_media_comment: {
        Args: { memory: string; moment: string }
        Returns: boolean
      }
      consume_memory_media_budget: { Args: { kind: string }; Returns: boolean }
      create_couple_with_invite: {
        Args: { started_on?: string }
        Returns: {
          couple_id: string
          expires_at: string
          invite_code: string
        }[]
      }
      create_memory_from_bucket: {
        Args: {
          favorite: boolean
          feeling: number
          happened_on: string
          memory_location: string
          memory_title: string
          story: string
          target_item: string
        }
        Returns: string
      }
      create_pairing_invite: {
        Args: never
        Returns: {
          expires_at: string
          invite_code: string
        }[]
      }
      create_plan_from_bucket: {
        Args: {
          amount: number
          currency_code: string
          end_time: string
          plan_description: string
          plan_location: string
          plan_title: string
          plan_type: string
          start_time: string
          target_item: string
          timezone_name: string
        }
        Returns: string
      }
      delete_empty_bucket_list: {
        Args: { target_list: string }
        Returns: undefined
      }
      delete_empty_couple: { Args: never; Returns: boolean }
      join_couple_by_code: { Args: { pairing_code: string }; Returns: string }
      leave_current_couple: { Args: never; Returns: boolean }
      list_memories_by_tag: {
        Args: {
          before_date?: string
          before_id?: string
          favorites?: boolean
          tag_name: string
        }
        Returns: {
          id: string
        }[]
      }
      mutate_bucket_subtask: {
        Args: {
          completed?: boolean
          expected_version: number
          operation: string
          ordered_ids?: string[]
          target_item: string
          target_subtask?: string
          task_label?: string
        }
        Returns: undefined
      }
      mutate_plan: { Args: { input: Json }; Returns: Json }
      revoke_pairing_invite: { Args: never; Returns: boolean }
      set_entry_reminder: {
        Args: { due: string; memory: string; moment: string }
        Returns: string
      }
      update_memory_details: { Args: { input: Json }; Returns: Json }
      update_plan_details: { Args: { input: Json }; Returns: Json }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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

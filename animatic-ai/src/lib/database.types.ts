export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          role: "user" | "moderator" | "admin";
          status: "active" | "blocked" | "deleted";
          credits: number;
          credits_reset_date: string;
          models_count: number;
          animations_count: number;
          total_downloads: number;
          total_rating: number;
          followers_count: number;
          notification_settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          role?: "user" | "moderator" | "admin";
          status?: "active" | "blocked" | "deleted";
          credits?: number;
          credits_reset_date?: string;
          models_count?: number;
          animations_count?: number;
          total_downloads?: number;
          total_rating?: number;
          followers_count?: number;
          notification_settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          role?: "user" | "moderator" | "admin";
          status?: "active" | "blocked" | "deleted";
          credits?: number;
          credits_reset_date?: string;
          models_count?: number;
          animations_count?: number;
          total_downloads?: number;
          total_rating?: number;
          followers_count?: number;
          notification_settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      models: {
        Row: {
          id: string;
          author_id: string | null;
          name: string;
          description: string | null;
          category: string | null;
          format: "GLB" | "FBX" | "OBJ" | null;
          file_url: string | null;
          preview_url: string | null;
          license: "view_only" | "free_use";
          source: "ai_generated" | "user_upload";
          status: "draft" | "pending" | "approved" | "rejected";
          rejection_reason: string | null;
          downloads: number;
          likes: number;
          favorites: number;
          rating: number;
          ai_generated: boolean;
          created_at: string;
          published_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          author_id?: string | null;
          name: string;
          description?: string | null;
          category?: string | null;
          format?: "GLB" | "FBX" | "OBJ" | null;
          file_url?: string | null;
          preview_url?: string | null;
          license?: "view_only" | "free_use";
          source?: "ai_generated" | "user_upload";
          status?: "draft" | "pending" | "approved" | "rejected";
          rejection_reason?: string | null;
          downloads?: number;
          likes?: number;
          favorites?: number;
          rating?: number;
          ai_generated?: boolean;
          created_at?: string;
          published_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string | null;
          name?: string;
          description?: string | null;
          category?: string | null;
          format?: "GLB" | "FBX" | "OBJ" | null;
          file_url?: string | null;
          preview_url?: string | null;
          license?: "view_only" | "free_use";
          source?: "ai_generated" | "user_upload";
          status?: "draft" | "pending" | "approved" | "rejected";
          rejection_reason?: string | null;
          downloads?: number;
          likes?: number;
          favorites?: number;
          rating?: number;
          ai_generated?: boolean;
          created_at?: string;
          published_at?: string | null;
          updated_at?: string;
        };
      };
      animations: {
        Row: {
          id: string;
          author_id: string | null;
          model_id: string | null;
          name: string;
          description: string | null;
          file_url: string | null;
          preview_url: string | null;
          source_video_url: string | null;
          license: "view_only" | "free_use";
          source: "ai_generated" | "user_upload" | "system";
          status: "draft" | "pending" | "approved" | "rejected";
          rejection_reason: string | null;
          downloads: number;
          likes: number;
          favorites: number;
          rating: number;
          duration_seconds: number | null;
          created_at: string;
          published_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          author_id?: string | null;
          model_id?: string | null;
          name: string;
          description?: string | null;
          file_url?: string | null;
          preview_url?: string | null;
          source_video_url?: string | null;
          license?: "view_only" | "free_use";
          source?: "ai_generated" | "user_upload" | "system";
          status?: "draft" | "pending" | "approved" | "rejected";
          rejection_reason?: string | null;
          downloads?: number;
          likes?: number;
          favorites?: number;
          rating?: number;
          duration_seconds?: number | null;
          created_at?: string;
          published_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string | null;
          model_id?: string | null;
          name?: string;
          description?: string | null;
          file_url?: string | null;
          preview_url?: string | null;
          source_video_url?: string | null;
          license?: "view_only" | "free_use";
          source?: "ai_generated" | "user_upload" | "system";
          status?: "draft" | "pending" | "approved" | "rejected";
          rejection_reason?: string | null;
          downloads?: number;
          likes?: number;
          favorites?: number;
          rating?: number;
          duration_seconds?: number | null;
          created_at?: string;
          published_at?: string | null;
          updated_at?: string;
        };
      };
      generation_requests: {
        Row: {
          id: string;
          user_id: string;
          type: "model_photo" | "model_text" | "animation_video";
          input_file_url: string | null;
          prompt: string | null;
          style_preset: string | null;
          quality_level: "draft" | "high" | "ultra";
          poly_count: string;
          enable_pbr: boolean;
          enable_rig: boolean;
          auto_publish: boolean;
          status: "queued" | "processing" | "completed" | "failed";
          result_model_id: string | null;
          result_animation_id: string | null;
          error_message: string | null;
          progress: number;
          credits_cost: number;
          created_at: string;
          started_at: string | null;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: "model_photo" | "model_text" | "animation_video";
          input_file_url?: string | null;
          prompt?: string | null;
          style_preset?: string | null;
          quality_level?: "draft" | "high" | "ultra";
          poly_count?: string;
          enable_pbr?: boolean;
          enable_rig?: boolean;
          auto_publish?: boolean;
          status?: "queued" | "processing" | "completed" | "failed";
          result_model_id?: string | null;
          result_animation_id?: string | null;
          error_message?: string | null;
          progress?: number;
          credits_cost?: number;
          created_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: "model_photo" | "model_text" | "animation_video";
          input_file_url?: string | null;
          prompt?: string | null;
          style_preset?: string | null;
          quality_level?: "draft" | "high" | "ultra";
          poly_count?: string;
          enable_pbr?: boolean;
          enable_rig?: boolean;
          auto_publish?: boolean;
          status?: "queued" | "processing" | "completed" | "failed";
          result_model_id?: string | null;
          result_animation_id?: string | null;
          error_message?: string | null;
          progress?: number;
          credits_cost?: number;
          created_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
        };
      };
      interactions: {
        Row: {
          id: string;
          user_id: string;
          entity_type: "model" | "animation";
          entity_id: string;
          interaction_type: "like" | "favorite" | "download" | "report";
          report_reason: string | null;
          report_status: string | null;
          created_at: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          subscriber_id: string;
          author_id: string;
          created_at: string;
        };
      };
      comments: {
        Row: {
          id: string;
          author_id: string | null;
          entity_type: "model" | "animation";
          entity_id: string;
          parent_id: string | null;
          content: string;
          status: "active" | "deleted" | "hidden";
          likes: number;
          created_at: string;
          edited_at: string | null;
        };
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          type: string;
          title: string;
          message: string | null;
          link_url: string | null;
          is_read: boolean;
          created_at: string;
        };
      };
      tags: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
      };
    };
    Views: {};
    Functions: {
      toggle_model_like: {
        Args: { model_uuid: string };
        Returns: boolean;
      };
      record_model_download: {
        Args: { model_uuid: string };
        Returns: void;
      };
    };
  };
}

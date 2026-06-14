export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      api_cache: {
        Row: {
          cache_key: string;
          created_at: string;
          data: Json;
          expires_at: string;
          source: string;
        };
        Insert: {
          cache_key: string;
          created_at?: string;
          data: Json;
          expires_at: string;
          source: string;
        };
        Update: {
          cache_key?: string;
          created_at?: string;
          data?: Json;
          expires_at?: string;
          source?: string;
        };
        Relationships: [];
      };
      activities: {
        Row: {
          description: string | null;
          group_slug: string;
          intensity: Database["public"]["Enums"]["intensity_level"];
          min_recommended_age: number | null;
          name_en: string;
          name_pl: string;
          requires_license: boolean;
          slug: string;
          sort_order: number;
          typical_duration_minutes: number | null;
          weather_dependency: Database["public"]["Enums"]["weather_dependency"];
        };
        Insert: {
          description?: string | null;
          group_slug: string;
          intensity?: Database["public"]["Enums"]["intensity_level"];
          min_recommended_age?: number | null;
          name_en: string;
          name_pl: string;
          requires_license?: boolean;
          slug: string;
          sort_order?: number;
          typical_duration_minutes?: number | null;
          weather_dependency?: Database["public"]["Enums"]["weather_dependency"];
        };
        Update: {
          description?: string | null;
          group_slug?: string;
          intensity?: Database["public"]["Enums"]["intensity_level"];
          min_recommended_age?: number | null;
          name_en?: string;
          name_pl?: string;
          requires_license?: boolean;
          slug?: string;
          sort_order?: number;
          typical_duration_minutes?: number | null;
          weather_dependency?: Database["public"]["Enums"]["weather_dependency"];
        };
        Relationships: [
          {
            foreignKeyName: "activities_group_slug_fkey";
            columns: ["group_slug"];
            isOneToOne: false;
            referencedRelation: "activity_groups";
            referencedColumns: ["slug"];
          },
        ];
      };
      activity_groups: {
        Row: {
          description: string | null;
          icon: string | null;
          name_en: string;
          name_pl: string;
          slug: string;
          sort_order: number;
        };
        Insert: {
          description?: string | null;
          icon?: string | null;
          name_en: string;
          name_pl: string;
          slug: string;
          sort_order?: number;
        };
        Update: {
          description?: string | null;
          icon?: string | null;
          name_en?: string;
          name_pl?: string;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      activity_osm_mappings: {
        Row: {
          activity_slug: string;
          id: string;
          osm_query: string;
          priority: number;
        };
        Insert: {
          activity_slug: string;
          id?: string;
          osm_query: string;
          priority?: number;
        };
        Update: {
          activity_slug?: string;
          id?: string;
          osm_query?: string;
          priority?: number;
        };
        Relationships: [
          {
            foreignKeyName: "activity_osm_mappings_activity_slug_fkey";
            columns: ["activity_slug"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["slug"];
          },
        ];
      };
      attraction_activity_tags: {
        Row: {
          activity_slug: string;
          attraction_id: string;
          confidence: number;
        };
        Insert: {
          activity_slug: string;
          attraction_id: string;
          confidence?: number;
        };
        Update: {
          activity_slug?: string;
          attraction_id?: string;
          confidence?: number;
        };
        Relationships: [
          {
            foreignKeyName: "attraction_activity_tags_activity_slug_fkey";
            columns: ["activity_slug"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["slug"];
          },
          {
            foreignKeyName: "attraction_activity_tags_attraction_id_fkey";
            columns: ["attraction_id"];
            isOneToOne: false;
            referencedRelation: "attractions";
            referencedColumns: ["id"];
          },
        ];
      };
      attractions: {
        Row: {
          address: string | null;
          category: string;
          created_at: string;
          description: string | null;
          destination_id: string | null;
          duration_minutes: number | null;
          external_id: string;
          id: string;
          lat: number;
          lon: number;
          min_age: number | null;
          name: string;
          opening_hours: string | null;
          phone: string | null;
          source: string;
          subcategories: string[];
          tags: Json;
          updated_at: string;
          website: string | null;
        };
        Insert: {
          address?: string | null;
          category: string;
          created_at?: string;
          description?: string | null;
          destination_id?: string | null;
          duration_minutes?: number | null;
          external_id: string;
          id?: string;
          lat: number;
          lon: number;
          min_age?: number | null;
          name: string;
          opening_hours?: string | null;
          phone?: string | null;
          source: string;
          subcategories?: string[];
          tags?: Json;
          updated_at?: string;
          website?: string | null;
        };
        Update: {
          address?: string | null;
          category?: string;
          created_at?: string;
          description?: string | null;
          destination_id?: string | null;
          duration_minutes?: number | null;
          external_id?: string;
          id?: string;
          lat?: number;
          lon?: number;
          min_age?: number | null;
          name?: string;
          opening_hours?: string | null;
          phone?: string | null;
          source?: string;
          subcategories?: string[];
          tags?: Json;
          updated_at?: string;
          website?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "attractions_destination_id_fkey";
            columns: ["destination_id"];
            isOneToOne: false;
            referencedRelation: "destinations";
            referencedColumns: ["id"];
          },
        ];
      };
      destination_builds: {
        Row: {
          build_request_id: string;
          completed_at: string | null;
          destination_id: string;
          errors: Json;
          id: string;
          started_at: string;
          status: Database["public"]["Enums"]["build_status"];
          steps_completed: string[];
          total_duration_ms: number | null;
          triggered_by_user: string | null;
        };
        Insert: {
          build_request_id: string;
          completed_at?: string | null;
          destination_id: string;
          errors?: Json;
          id?: string;
          started_at?: string;
          status?: Database["public"]["Enums"]["build_status"];
          steps_completed?: string[];
          total_duration_ms?: number | null;
          triggered_by_user?: string | null;
        };
        Update: {
          build_request_id?: string;
          completed_at?: string | null;
          destination_id?: string;
          errors?: Json;
          id?: string;
          started_at?: string;
          status?: Database["public"]["Enums"]["build_status"];
          steps_completed?: string[];
          total_duration_ms?: number | null;
          triggered_by_user?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "destination_builds_destination_id_fkey";
            columns: ["destination_id"];
            isOneToOne: false;
            referencedRelation: "destinations";
            referencedColumns: ["id"];
          },
        ];
      };
      destination_summaries: {
        Row: {
          context_hash: string;
          created_at: string;
          destination_id: string;
          expires_at: string;
          family_profile_summary: Json | null;
          id: string;
          model_used: string;
          selected_activities: string[];
          summary: Json;
          tokens_used: Json;
        };
        Insert: {
          context_hash: string;
          created_at?: string;
          destination_id: string;
          expires_at: string;
          family_profile_summary?: Json | null;
          id?: string;
          model_used: string;
          selected_activities?: string[];
          summary: Json;
          tokens_used?: Json;
        };
        Update: {
          context_hash?: string;
          created_at?: string;
          destination_id?: string;
          expires_at?: string;
          family_profile_summary?: Json | null;
          id?: string;
          model_used?: string;
          selected_activities?: string[];
          summary?: Json;
          tokens_used?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "destination_summaries_destination_id_fkey";
            columns: ["destination_id"];
            isOneToOne: false;
            referencedRelation: "destinations";
            referencedColumns: ["id"];
          },
        ];
      };
      destinations: {
        Row: {
          bounding_box: Json;
          center_lat: number;
          center_lon: number;
          country_code: string;
          created_at: string;
          description: string | null;
          destination_type: Database["public"]["Enums"]["destination_type"];
          id: string;
          name: string;
          parent_destination_id: string | null;
          slug: string;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          bounding_box: Json;
          center_lat: number;
          center_lon: number;
          country_code: string;
          created_at?: string;
          description?: string | null;
          destination_type: Database["public"]["Enums"]["destination_type"];
          id?: string;
          name: string;
          parent_destination_id?: string | null;
          slug: string;
          timezone: string;
          updated_at?: string;
        };
        Update: {
          bounding_box?: Json;
          center_lat?: number;
          center_lon?: number;
          country_code?: string;
          created_at?: string;
          description?: string | null;
          destination_type?: Database["public"]["Enums"]["destination_type"];
          id?: string;
          name?: string;
          parent_destination_id?: string | null;
          slug?: string;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "destinations_parent_destination_id_fkey";
            columns: ["parent_destination_id"];
            isOneToOne: false;
            referencedRelation: "destinations";
            referencedColumns: ["id"];
          },
        ];
      };
      group_members: {
        Row: {
          age: number | null;
          created_at: string;
          group_id: string;
          id: string;
          member_type: Database["public"]["Enums"]["member_type"];
          name: string | null;
          notes: string | null;
        };
        Insert: {
          age?: number | null;
          created_at?: string;
          group_id: string;
          id?: string;
          member_type: Database["public"]["Enums"]["member_type"];
          name?: string | null;
          notes?: string | null;
        };
        Update: {
          age?: number | null;
          created_at?: string;
          group_id?: string;
          id?: string;
          member_type?: Database["public"]["Enums"]["member_type"];
          name?: string | null;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "travel_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      group_preferences: {
        Row: {
          accessibility_needs: string | null;
          accommodation_types: string[];
          budget_per_person_pln: number | null;
          budget_total_pln: number | null;
          dietary_restrictions: string[];
          environment_preferences: string[];
          exclusions: string[];
          group_id: string;
          max_flight_duration_hours: number | null;
          max_flight_stops: number;
          meal_plan_preferences: string[];
          notes: string | null;
          polish_speaking_guide_required: boolean;
          travel_style: Database["public"]["Enums"]["travel_style"];
          updated_at: string;
        };
        Insert: {
          accessibility_needs?: string | null;
          accommodation_types?: string[];
          budget_per_person_pln?: number | null;
          budget_total_pln?: number | null;
          dietary_restrictions?: string[];
          environment_preferences?: string[];
          exclusions?: string[];
          group_id: string;
          max_flight_duration_hours?: number | null;
          max_flight_stops?: number;
          meal_plan_preferences?: string[];
          notes?: string | null;
          polish_speaking_guide_required?: boolean;
          travel_style?: Database["public"]["Enums"]["travel_style"];
          updated_at?: string;
        };
        Update: {
          accessibility_needs?: string | null;
          accommodation_types?: string[];
          budget_per_person_pln?: number | null;
          budget_total_pln?: number | null;
          dietary_restrictions?: string[];
          environment_preferences?: string[];
          exclusions?: string[];
          group_id?: string;
          max_flight_duration_hours?: number | null;
          max_flight_stops?: number;
          meal_plan_preferences?: string[];
          notes?: string | null;
          polish_speaking_guide_required?: boolean;
          travel_style?: Database["public"]["Enums"]["travel_style"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_preferences_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: true;
            referencedRelation: "travel_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      scrape_locks: {
        Row: {
          acquired_at: string;
          acquired_by: string;
          expires_at: string;
          lock_key: string;
        };
        Insert: {
          acquired_at?: string;
          acquired_by: string;
          expires_at: string;
          lock_key: string;
        };
        Update: {
          acquired_at?: string;
          acquired_by?: string;
          expires_at?: string;
          lock_key?: string;
        };
        Relationships: [];
      };
      travel_groups: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "travel_groups_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      weather_cache: {
        Row: {
          destination_id: string;
          fetched_at: string;
          forecast_date: string;
          id: string;
          precipitation_mm: number | null;
          precipitation_probability: number | null;
          source: string;
          temp_max: number | null;
          temp_min: number | null;
          uv_index_max: number | null;
          weather_code: number | null;
          wind_speed_kmh: number | null;
        };
        Insert: {
          destination_id: string;
          fetched_at?: string;
          forecast_date: string;
          id?: string;
          precipitation_mm?: number | null;
          precipitation_probability?: number | null;
          source: string;
          temp_max?: number | null;
          temp_min?: number | null;
          uv_index_max?: number | null;
          weather_code?: number | null;
          wind_speed_kmh?: number | null;
        };
        Update: {
          destination_id?: string;
          fetched_at?: string;
          forecast_date?: string;
          id?: string;
          precipitation_mm?: number | null;
          precipitation_probability?: number | null;
          source?: string;
          temp_max?: number | null;
          temp_min?: number | null;
          uv_index_max?: number | null;
          weather_code?: number | null;
          wind_speed_kmh?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "weather_cache_destination_id_fkey";
            columns: ["destination_id"];
            isOneToOne: false;
            referencedRelation: "destinations";
            referencedColumns: ["id"];
          },
        ];
      };
      user_profiles: {
        Row: {
          created_at: string;
          default_group_id: string | null;
          display_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          default_group_id?: string | null;
          display_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          default_group_id?: string | null;
          display_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_default_group";
            columns: ["default_group_id"];
            isOneToOne: false;
            referencedRelation: "travel_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      cleanup_expired_cache: {
        Args: Record<string, never>;
        Returns: {
          api_cache_deleted: number;
          scrape_locks_deleted: number;
        }[];
      };
    };
    Enums: {
      build_status: "in_progress" | "completed" | "failed";
      destination_type: "country" | "region" | "city" | "island" | "area";
      intensity_level: "low" | "medium" | "high";
      member_type: "adult" | "child" | "infant" | "senior";
      travel_style: "active" | "relax" | "mixed";
      weather_dependency: "none" | "low" | "high";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Po zmianie schematu: pnpm db:types (wymaga supabase CLI + project ID)

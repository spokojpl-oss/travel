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
      [_ in never]: never;
    };
    Enums: {
      member_type: "adult" | "child" | "infant" | "senior";
      travel_style: "active" | "relax" | "mixed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Po zmianie schematu: pnpm db:types (wymaga supabase CLI + project ID)

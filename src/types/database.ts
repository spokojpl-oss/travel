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
      airports: {
        Row: {
          airport_type: Database["public"]["Enums"]["airport_size"];
          city: string | null;
          country_code: string;
          iata_code: string;
          icao_code: string | null;
          lat: number;
          lon: number;
          name: string;
          scheduled_service: boolean;
          timezone: string | null;
        };
        Insert: {
          airport_type: Database["public"]["Enums"]["airport_size"];
          city?: string | null;
          country_code: string;
          iata_code: string;
          icao_code?: string | null;
          lat: number;
          lon: number;
          name: string;
          scheduled_service?: boolean;
          timezone?: string | null;
        };
        Update: {
          airport_type?: Database["public"]["Enums"]["airport_size"];
          city?: string | null;
          country_code?: string;
          iata_code?: string;
          icao_code?: string | null;
          lat?: number;
          lon?: number;
          name?: string;
          scheduled_service?: boolean;
          timezone?: string | null;
        };
        Relationships: [];
      };
      destination_airports: {
        Row: {
          airport_iata: string;
          destination_id: string;
          distance_km: number;
          priority: number;
        };
        Insert: {
          airport_iata: string;
          destination_id: string;
          distance_km: number;
          priority?: number;
        };
        Update: {
          airport_iata?: string;
          destination_id?: string;
          distance_km?: number;
          priority?: number;
        };
        Relationships: [
          {
            foreignKeyName: "destination_airports_airport_iata_fkey";
            columns: ["airport_iata"];
            isOneToOne: false;
            referencedRelation: "airports";
            referencedColumns: ["iata_code"];
          },
          {
            foreignKeyName: "destination_airports_destination_id_fkey";
            columns: ["destination_id"];
            isOneToOne: false;
            referencedRelation: "destinations";
            referencedColumns: ["id"];
          },
        ];
      };
      airport_transport_baseline: {
        Row: {
          airport_iata: string;
          destination_area: string;
          distance_km_approx: number | null;
          duration_minutes_approx: number | null;
          id: string;
          notes: string | null;
          price_max_pln: number;
          price_min_pln: number;
          provider_info: string | null;
          source: string | null;
          transport_type: Database["public"]["Enums"]["transport_type"];
          updated_at: string;
        };
        Insert: {
          airport_iata: string;
          destination_area: string;
          distance_km_approx?: number | null;
          duration_minutes_approx?: number | null;
          id?: string;
          notes?: string | null;
          price_max_pln: number;
          price_min_pln: number;
          provider_info?: string | null;
          source?: string | null;
          transport_type: Database["public"]["Enums"]["transport_type"];
          updated_at?: string;
        };
        Update: {
          airport_iata?: string;
          destination_area?: string;
          distance_km_approx?: number | null;
          duration_minutes_approx?: number | null;
          id?: string;
          notes?: string | null;
          price_max_pln?: number;
          price_min_pln?: number;
          provider_info?: string | null;
          source?: string | null;
          transport_type?: Database["public"]["Enums"]["transport_type"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "airport_transport_baseline_airport_iata_fkey";
            columns: ["airport_iata"];
            isOneToOne: false;
            referencedRelation: "airports";
            referencedColumns: ["iata_code"];
          },
        ];
      };
      flight_offers_cache: {
        Row: {
          airline_code: string | null;
          cache_key: string;
          deep_link: string;
          departure_date: string;
          destination_iata: string;
          duration_minutes: number | null;
          expires_at: string;
          fetched_at: string;
          id: string;
          origin_iata: string;
          price_pln: number;
          raw_data: Json;
          return_date: string | null;
          source: string;
          transfers: number;
        };
        Insert: {
          airline_code?: string | null;
          cache_key: string;
          deep_link: string;
          departure_date: string;
          destination_iata: string;
          duration_minutes?: number | null;
          expires_at: string;
          fetched_at?: string;
          id?: string;
          origin_iata: string;
          price_pln: number;
          raw_data?: Json;
          return_date?: string | null;
          source: string;
          transfers?: number;
        };
        Update: {
          airline_code?: string | null;
          cache_key?: string;
          deep_link?: string;
          departure_date?: string;
          destination_iata?: string;
          duration_minutes?: number | null;
          expires_at?: string;
          fetched_at?: string;
          id?: string;
          origin_iata?: string;
          price_pln?: number;
          raw_data?: Json;
          return_date?: string | null;
          source?: string;
          transfers?: number;
        };
        Relationships: [];
      };
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
      activity_routes: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"];
          cached_at: string;
          category: Database["public"]["Enums"]["activity_category"];
          created_at: string;
          description: string | null;
          destination_id: string;
          difficulty: Database["public"]["Enums"]["activity_difficulty"] | null;
          distance_m: number;
          duration_min: number | null;
          elevation_gain_m: number | null;
          elevation_loss_m: number | null;
          elevation_profile: Json | null;
          end_point: Json | null;
          expires_at: string | null;
          external_url: string | null;
          geometry: Json;
          highlights: Json | null;
          id: string;
          is_loop: boolean;
          max_gradient_pct: number | null;
          name: string;
          popularity_score: number | null;
          preview_image_url: string | null;
          source: Database["public"]["Enums"]["activity_route_source"];
          source_external_id: string | null;
          start_point: Json;
          surface_mix: Json | null;
        };
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"];
          cached_at?: string;
          category: Database["public"]["Enums"]["activity_category"];
          created_at?: string;
          description?: string | null;
          destination_id: string;
          difficulty?: Database["public"]["Enums"]["activity_difficulty"] | null;
          distance_m: number;
          duration_min?: number | null;
          elevation_gain_m?: number | null;
          elevation_loss_m?: number | null;
          elevation_profile?: Json | null;
          end_point?: Json | null;
          expires_at?: string | null;
          external_url?: string | null;
          geometry: Json;
          highlights?: Json | null;
          id?: string;
          is_loop?: boolean;
          max_gradient_pct?: number | null;
          name: string;
          popularity_score?: number | null;
          preview_image_url?: string | null;
          source: Database["public"]["Enums"]["activity_route_source"];
          source_external_id?: string | null;
          start_point: Json;
          surface_mix?: Json | null;
        };
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"];
          cached_at?: string;
          category?: Database["public"]["Enums"]["activity_category"];
          created_at?: string;
          description?: string | null;
          destination_id?: string;
          difficulty?: Database["public"]["Enums"]["activity_difficulty"] | null;
          distance_m?: number;
          duration_min?: number | null;
          elevation_gain_m?: number | null;
          elevation_loss_m?: number | null;
          elevation_profile?: Json | null;
          end_point?: Json | null;
          expires_at?: string | null;
          external_url?: string | null;
          geometry?: Json;
          highlights?: Json | null;
          id?: string;
          is_loop?: boolean;
          max_gradient_pct?: number | null;
          name?: string;
          popularity_score?: number | null;
          preview_image_url?: string | null;
          source?: Database["public"]["Enums"]["activity_route_source"];
          source_external_id?: string | null;
          start_point?: Json;
          surface_mix?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "activity_routes_destination_id_fkey";
            columns: ["destination_id"];
            isOneToOne: false;
            referencedRelation: "destinations";
            referencedColumns: ["id"];
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
      destination_budget_profiles: {
        Row: {
          cpi_index: number | null;
          cpi_vs_reference_pct: number | null;
          currency: string;
          daily_budget_high: number | null;
          daily_budget_low: number | null;
          daily_budget_mid: number | null;
          destination_id: string;
          fetched_at: string;
          groceries_index: number | null;
          id: string;
          numbeo_city_id: number | null;
          reference_location: string;
          rent_index: number | null;
          restaurant_index: number | null;
          sample_prices: Json;
          source: string;
        };
        Insert: {
          cpi_index?: number | null;
          cpi_vs_reference_pct?: number | null;
          currency?: string;
          daily_budget_high?: number | null;
          daily_budget_low?: number | null;
          daily_budget_mid?: number | null;
          destination_id: string;
          fetched_at?: string;
          groceries_index?: number | null;
          id?: string;
          numbeo_city_id?: number | null;
          reference_location?: string;
          rent_index?: number | null;
          restaurant_index?: number | null;
          sample_prices?: Json;
          source?: string;
        };
        Update: {
          cpi_index?: number | null;
          cpi_vs_reference_pct?: number | null;
          currency?: string;
          daily_budget_high?: number | null;
          daily_budget_low?: number | null;
          daily_budget_mid?: number | null;
          destination_id?: string;
          fetched_at?: string;
          groceries_index?: number | null;
          id?: string;
          numbeo_city_id?: number | null;
          reference_location?: string;
          rent_index?: number | null;
          restaurant_index?: number | null;
          sample_prices?: Json;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: "destination_budget_profiles_destination_id_fkey";
            columns: ["destination_id"];
            isOneToOne: false;
            referencedRelation: "destinations";
            referencedColumns: ["id"];
          },
        ];
      };
      destination_climate_monthly: {
        Row: {
          climate_rating: Database["public"]["Enums"]["climate_rating"];
          destination_id: string;
          fetched_at: string;
          id: string;
          month: number;
          precip_mm_avg: number;
          rainy_days_avg: number;
          sample_years: number;
          source: string;
          temp_max_avg: number;
          temp_min_avg: number;
        };
        Insert: {
          climate_rating: Database["public"]["Enums"]["climate_rating"];
          destination_id: string;
          fetched_at?: string;
          id?: string;
          month: number;
          precip_mm_avg: number;
          rainy_days_avg: number;
          sample_years?: number;
          source?: string;
          temp_max_avg: number;
          temp_min_avg: number;
        };
        Update: {
          climate_rating?: Database["public"]["Enums"]["climate_rating"];
          destination_id?: string;
          fetched_at?: string;
          id?: string;
          month?: number;
          precip_mm_avg?: number;
          rainy_days_avg?: number;
          sample_years?: number;
          source?: string;
          temp_max_avg?: number;
          temp_min_avg?: number;
        };
        Relationships: [
          {
            foreignKeyName: "destination_climate_monthly_destination_id_fkey";
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
      hotel_offers_cache: {
        Row: {
          adults: number;
          breakfast_included: boolean | null;
          cache_key: string;
          cancellation_policy: string | null;
          check_in: string;
          check_out: string;
          children: number;
          deep_link: string;
          expires_at: string;
          fetched_at: string;
          hotel_id: string;
          id: string;
          nights: number;
          price_per_night_pln: number;
          price_total_pln: number;
          raw_data: Json;
          source: string;
        };
        Insert: {
          adults: number;
          breakfast_included?: boolean | null;
          cache_key: string;
          cancellation_policy?: string | null;
          check_in: string;
          check_out: string;
          children?: number;
          deep_link: string;
          expires_at: string;
          fetched_at?: string;
          hotel_id: string;
          id?: string;
          nights: number;
          price_per_night_pln: number;
          price_total_pln: number;
          raw_data?: Json;
          source: string;
        };
        Update: {
          adults?: number;
          breakfast_included?: boolean | null;
          cache_key?: string;
          cancellation_policy?: string | null;
          check_in?: string;
          check_out?: string;
          children?: number;
          deep_link?: string;
          expires_at?: string;
          fetched_at?: string;
          hotel_id?: string;
          id?: string;
          nights?: number;
          price_per_night_pln?: number;
          price_total_pln?: number;
          raw_data?: Json;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hotel_offers_cache_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotels";
            referencedColumns: ["id"];
          },
        ];
      };
      hotels: {
        Row: {
          address: string | null;
          amenities: Json;
          created_at: string;
          destination_id: string | null;
          external_id: string;
          id: string;
          lat: number;
          lon: number;
          max_guests: number | null;
          name: string;
          property_type: string | null;
          rating: number | null;
          rating_count: number | null;
          raw_data: Json;
          source: string;
          stars: number | null;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          amenities?: Json;
          created_at?: string;
          destination_id?: string | null;
          external_id: string;
          id?: string;
          lat: number;
          lon: number;
          max_guests?: number | null;
          name: string;
          property_type?: string | null;
          rating?: number | null;
          rating_count?: number | null;
          raw_data?: Json;
          source: string;
          stars?: number | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          amenities?: Json;
          created_at?: string;
          destination_id?: string | null;
          external_id?: string;
          id?: string;
          lat?: number;
          lon?: number;
          max_guests?: number | null;
          name?: string;
          property_type?: string | null;
          rating?: number | null;
          rating_count?: number | null;
          raw_data?: Json;
          source?: string;
          stars?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hotels_destination_id_fkey";
            columns: ["destination_id"];
            isOneToOne: false;
            referencedRelation: "destinations";
            referencedColumns: ["id"];
          },
        ];
      };
      transport_offers_cache: {
        Row: {
          cache_key: string;
          deep_link: string;
          expires_at: string;
          fetched_at: string;
          from_airport_iata: string;
          id: string;
          passengers: number;
          pickup_date: string;
          price_pln: number;
          provider: string;
          raw_data: Json;
          to_lat: number | null;
          to_location: string;
          to_lon: number | null;
          vehicle_type: string;
        };
        Insert: {
          cache_key: string;
          deep_link: string;
          expires_at: string;
          fetched_at?: string;
          from_airport_iata: string;
          id?: string;
          passengers: number;
          pickup_date: string;
          price_pln: number;
          provider: string;
          raw_data?: Json;
          to_lat?: number | null;
          to_location: string;
          to_lon?: number | null;
          vehicle_type: string;
        };
        Update: {
          cache_key?: string;
          deep_link?: string;
          expires_at?: string;
          fetched_at?: string;
          from_airport_iata?: string;
          id?: string;
          passengers?: number;
          pickup_date?: string;
          price_pln?: number;
          provider?: string;
          raw_data?: Json;
          to_lat?: number | null;
          to_location?: string;
          to_lon?: number | null;
          vehicle_type?: string;
        };
        Relationships: [];
      };
      trip_documents: {
        Row: {
          content: Json;
          created_at: string;
          document_type: Database["public"]["Enums"]["document_type"];
          id: string;
          model_used: string;
          tokens_used: Json;
          trip_id: string;
          validation_issues: string[];
        };
        Insert: {
          content: Json;
          created_at?: string;
          document_type: Database["public"]["Enums"]["document_type"];
          id?: string;
          model_used: string;
          tokens_used?: Json;
          trip_id: string;
          validation_issues?: string[];
        };
        Update: {
          content?: Json;
          created_at?: string;
          document_type?: Database["public"]["Enums"]["document_type"];
          id?: string;
          model_used?: string;
          tokens_used?: Json;
          trip_id?: string;
          validation_issues?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "trip_documents_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      trip_share_views: {
        Row: {
          id: string;
          referrer: string | null;
          trip_id: string;
          user_agent_hash: string | null;
          viewed_at: string;
        };
        Insert: {
          id?: string;
          referrer?: string | null;
          trip_id: string;
          user_agent_hash?: string | null;
          viewed_at?: string;
        };
        Update: {
          id?: string;
          referrer?: string | null;
          trip_id?: string;
          user_agent_hash?: string | null;
          viewed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trip_share_views_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      trip_advisories: {
        Row: {
          id: string;
          trip_id: string;
          category: Database["public"]["Enums"]["advisory_category"];
          severity: Database["public"]["Enums"]["advisory_severity"];
          title: string;
          reasoning: string;
          suggested_action: string | null;
          source_facts: Json;
          estimated_savings_pln: number | null;
          dismissed_at: string | null;
          dismissed_reason: string | null;
          generated_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          category: Database["public"]["Enums"]["advisory_category"];
          severity: Database["public"]["Enums"]["advisory_severity"];
          title: string;
          reasoning: string;
          suggested_action?: string | null;
          source_facts?: Json;
          estimated_savings_pln?: number | null;
          dismissed_at?: string | null;
          dismissed_reason?: string | null;
          generated_at?: string;
        };
        Update: {
          id?: string;
          trip_id?: string;
          category?: Database["public"]["Enums"]["advisory_category"];
          severity?: Database["public"]["Enums"]["advisory_severity"];
          title?: string;
          reasoning?: string;
          suggested_action?: string | null;
          source_facts?: Json;
          estimated_savings_pln?: number | null;
          dismissed_at?: string | null;
          dismissed_reason?: string | null;
          generated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trip_advisories_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      country_holidays: {
        Row: {
          id: string;
          country_code: string;
          holiday_date: string;
          holiday_name_pl: string;
          is_recurring_yearly: boolean;
          impact: string | null;
          severity: Database["public"]["Enums"]["advisory_severity"];
        };
        Insert: {
          id?: string;
          country_code: string;
          holiday_date: string;
          holiday_name_pl: string;
          is_recurring_yearly?: boolean;
          impact?: string | null;
          severity?: Database["public"]["Enums"]["advisory_severity"];
        };
        Update: {
          id?: string;
          country_code?: string;
          holiday_date?: string;
          holiday_name_pl?: string;
          is_recurring_yearly?: boolean;
          impact?: string | null;
          severity?: Database["public"]["Enums"]["advisory_severity"];
        };
        Relationships: [];
      };
      search_history: {
        Row: {
          id: string;
          user_id: string;
          search_type: Database["public"]["Enums"]["search_type"];
          params: Json;
          result_summary: Json;
          executed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          search_type: Database["public"]["Enums"]["search_type"];
          params: Json;
          result_summary?: Json;
          executed_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          search_type?: Database["public"]["Enums"]["search_type"];
          params?: Json;
          result_summary?: Json;
          executed_at?: string;
        };
        Relationships: [];
      };
      trip_comparisons: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          trip_ids: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          trip_ids: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          trip_ids?: string[];
          created_at?: string;
        };
        Relationships: [];
      };
      trips: {
        Row: {
          created_at: string;
          date_from: string;
          date_to: string;
          destination_id: string;
          id: string;
          is_share_enabled: boolean;
          name: string;
          selected_attraction_ids: string[];
          selected_flight_offer_id: string | null;
          selected_hotel_offer_id: string | null;
          selected_transport_option: Json | null;
          selected_vehicle_config: Json | null;
          share_token: string;
          status: Database["public"]["Enums"]["trip_status"] | null;
          travel_group_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          date_from: string;
          date_to: string;
          destination_id: string;
          id?: string;
          is_share_enabled?: boolean;
          name: string;
          selected_attraction_ids?: string[];
          selected_flight_offer_id?: string | null;
          selected_hotel_offer_id?: string | null;
          selected_transport_option?: Json | null;
          selected_vehicle_config?: Json | null;
          share_token?: string;
          status?: Database["public"]["Enums"]["trip_status"] | null;
          travel_group_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          date_from?: string;
          date_to?: string;
          destination_id?: string;
          id?: string;
          is_share_enabled?: boolean;
          name?: string;
          selected_attraction_ids?: string[];
          selected_flight_offer_id?: string | null;
          selected_hotel_offer_id?: string | null;
          selected_transport_option?: Json | null;
          selected_vehicle_config?: Json | null;
          share_token?: string;
          status?: Database["public"]["Enums"]["trip_status"] | null;
          travel_group_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trips_destination_id_fkey";
            columns: ["destination_id"];
            isOneToOne: false;
            referencedRelation: "destinations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trips_selected_hotel_offer_id_fkey";
            columns: ["selected_hotel_offer_id"];
            isOneToOne: false;
            referencedRelation: "hotels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trips_travel_group_id_fkey";
            columns: ["travel_group_id"];
            isOneToOne: false;
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
      region_picks: {
        Row: {
          id: string;
          region_id: string;
          day_theme: string;
          name_pl: string;
          name_en: string;
          why_pl: string;
          why_en: string;
          activity_slugs: string[];
          rank: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          region_id: string;
          day_theme: string;
          name_pl: string;
          name_en: string;
          why_pl: string;
          why_en: string;
          activity_slugs?: string[];
          rank?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          region_id?: string;
          day_theme?: string;
          name_pl?: string;
          name_en?: string;
          why_pl?: string;
          why_en?: string;
          activity_slugs?: string[];
          rank?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "region_picks_region_id_fkey";
            columns: ["region_id"];
            isOneToOne: false;
            referencedRelation: "tourist_regions";
            referencedColumns: ["id"];
          },
        ];
      };
      tourist_regions: {
        Row: {
          id: string;
          slug: string;
          destination_keys: string[];
          name_pl: string;
          name_en: string;
          character: Database["public"]["Enums"]["region_character"];
          vibe: Database["public"]["Enums"]["region_vibe"];
          overview_pl: string;
          overview_en: string;
          stay_hint_pl: string;
          stay_hint_en: string;
          center_lat: number;
          center_lon: number;
          active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          slug: string;
          destination_keys?: string[];
          name_pl: string;
          name_en: string;
          character?: Database["public"]["Enums"]["region_character"];
          vibe?: Database["public"]["Enums"]["region_vibe"];
          overview_pl: string;
          overview_en: string;
          stay_hint_pl: string;
          stay_hint_en: string;
          center_lat: number;
          center_lon: number;
          active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          destination_keys?: string[];
          name_pl?: string;
          name_en?: string;
          character?: Database["public"]["Enums"]["region_character"];
          vibe?: Database["public"]["Enums"]["region_vibe"];
          overview_pl?: string;
          overview_en?: string;
          stay_hint_pl?: string;
          stay_hint_en?: string;
          center_lat?: number;
          center_lon?: number;
          active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
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
      activity_category: "cycling" | "hiking" | "running" | "water_sports";
      activity_difficulty: "easy" | "moderate" | "hard" | "expert";
      activity_route_source: "osm" | "ors_generated" | "komoot" | "user_curated";
      activity_type:
        | "cycling_road"
        | "cycling_gravel"
        | "cycling_mtb"
        | "cycling_ebike"
        | "cycling_touring";
      advisory_category:
        | "flights_dates"
        | "airport_choice"
        | "open_jaw"
        | "accommodation_location"
        | "seasonal_event"
        | "weather_plan_b"
        | "review_red_flag"
        | "timing_concern";
      advisory_severity: "info" | "suggestion" | "warning" | "critical";
      search_type:
        | "activities"
        | "destination_build"
        | "flights"
        | "hotels"
        | "transport";
      airport_size: "large" | "medium" | "small";
      build_status: "in_progress" | "completed" | "failed";
      climate_rating: "ideal" | "good" | "fair" | "poor" | "very_poor";
      document_type: "itinerary" | "packing_list" | "pre_trip_todo";
      destination_type: "country" | "region" | "city" | "island" | "area";
      intensity_level: "low" | "medium" | "high";
      member_type: "adult" | "child" | "infant" | "senior";
      region_character: "resort" | "historic" | "wild" | "mixed";
      region_vibe: "popular" | "balanced" | "offbeat";
      travel_style: "active" | "relax" | "mixed";
      trip_status: "draft" | "active" | "completed";
      transport_type:
        | "taxi"
        | "bus"
        | "train"
        | "shuttle"
        | "metro"
        | "transfer"
        | "walk";
      weather_dependency: "none" | "low" | "high";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Po zmianie schematu: pnpm db:types (wymaga supabase CLI + project ID)

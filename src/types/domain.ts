import type { Database } from "./database";

export type UserProfile = Database["public"]["Tables"]["user_profiles"]["Row"];
export type TravelGroup = Database["public"]["Tables"]["travel_groups"]["Row"];
export type GroupMember = Database["public"]["Tables"]["group_members"]["Row"];
export type GroupPreferences =
  Database["public"]["Tables"]["group_preferences"]["Row"];

export type MemberType = Database["public"]["Enums"]["member_type"];
export type TravelStyle = Database["public"]["Enums"]["travel_style"];

export type FullTravelGroup = TravelGroup & {
  members: GroupMember[];
  preferences: GroupPreferences | null;
};

export type NewTravelGroup =
  Database["public"]["Tables"]["travel_groups"]["Insert"];
export type NewGroupMember =
  Database["public"]["Tables"]["group_members"]["Insert"];
export type NewGroupPreferences =
  Database["public"]["Tables"]["group_preferences"]["Insert"];

export const MEMBER_TYPE_LABELS: Record<MemberType, string> = {
  adult: "Dorosły",
  child: "Dziecko",
  infant: "Niemowlę",
  senior: "Senior",
};

export const TRAVEL_STYLE_LABELS: Record<TravelStyle, string> = {
  active: "Aktywny",
  relax: "Relaks",
  mixed: "Mieszany",
};

export type Destination = Database["public"]["Tables"]["destinations"]["Row"];
export type Attraction = Database["public"]["Tables"]["attractions"]["Row"];
export type ApiCacheEntry = Database["public"]["Tables"]["api_cache"]["Row"];
export type WeatherCacheEntry =
  Database["public"]["Tables"]["weather_cache"]["Row"];

export type DestinationType = Database["public"]["Enums"]["destination_type"];

export type BoundingBox = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type GeoPoint = {
  lat: number;
  lon: number;
};

export type WeatherSummary = {
  destination_id: string;
  date_from: string;
  date_to: string;
  avg_temp_max: number;
  avg_temp_min: number;
  total_precipitation_mm: number;
  rainy_days: number;
  avg_uv_index: number;
  fetched_at: string;
};

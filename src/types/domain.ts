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

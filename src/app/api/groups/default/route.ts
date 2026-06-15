import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  formatPassengerBreakdown,
  passengersFromGroupMembers,
} from "@/lib/groups/passengers-from-group";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("default_group_id")
    .eq("id", user.id)
    .single();

  if (!profile?.default_group_id) {
    return NextResponse.json({ group: null, passengers: null });
  }

  const { data: group } = await supabase
    .from("travel_groups")
    .select("id, name")
    .eq("id", profile.default_group_id)
    .single();

  if (!group) {
    return NextResponse.json({ group: null, passengers: null });
  }

  const { data: members } = await supabase
    .from("group_members")
    .select("member_type, age")
    .eq("group_id", group.id);

  if (!members?.length) {
    return NextResponse.json({ group, passengers: null });
  }

  const breakdown = passengersFromGroupMembers(members);

  return NextResponse.json({
    group,
    passengers: formatPassengerBreakdown(breakdown),
    breakdown,
  });
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  fullGroupCreateSchema,
  profileUpdateSchema,
  type FullGroupCreate,
  type ProfileUpdate,
} from "@/lib/schemas/group";

export async function createGroup(input: FullGroupCreate) {
  const parsed = fullGroupCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Validation failed", issues: parsed.error.issues };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: group, error: groupError } = await supabase
    .from("travel_groups")
    .insert({
      user_id: user.id,
      name: parsed.data.group.name,
      description: parsed.data.group.description ?? null,
    })
    .select()
    .single();

  if (groupError || !group) {
    return { error: groupError?.message ?? "Failed to create group" };
  }

  const membersToInsert = parsed.data.members.map((m) => ({
    group_id: group.id,
    name: m.name ?? null,
    member_type: m.member_type,
    age: m.age ?? null,
    notes: m.notes ?? null,
  }));

  const { error: membersError } = await supabase
    .from("group_members")
    .insert(membersToInsert);

  if (membersError) {
    await supabase.from("travel_groups").delete().eq("id", group.id);
    return { error: membersError.message };
  }

  const { error: prefsError } = await supabase.from("group_preferences").insert({
    group_id: group.id,
    ...parsed.data.preferences,
  });

  if (prefsError) {
    await supabase.from("travel_groups").delete().eq("id", group.id);
    return { error: prefsError.message };
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("default_group_id")
    .eq("id", user.id)
    .single();

  if (!profile?.default_group_id) {
    await supabase
      .from("user_profiles")
      .update({ default_group_id: group.id })
      .eq("id", user.id);
  }

  revalidatePath("/app/groups");
  redirect(`/app/groups/${group.id}`);
}

export async function updateGroup(groupId: string, input: FullGroupCreate) {
  const parsed = fullGroupCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Validation failed", issues: parsed.error.issues };
  }

  const supabase = await createClient();

  const { error: groupError } = await supabase
    .from("travel_groups")
    .update({
      name: parsed.data.group.name,
      description: parsed.data.group.description ?? null,
    })
    .eq("id", groupId);

  if (groupError) return { error: groupError.message };

  await supabase.from("group_members").delete().eq("group_id", groupId);

  const { error: membersError } = await supabase.from("group_members").insert(
    parsed.data.members.map((m) => ({
      group_id: groupId,
      name: m.name ?? null,
      member_type: m.member_type,
      age: m.age ?? null,
      notes: m.notes ?? null,
    })),
  );

  if (membersError) return { error: membersError.message };

  const { error: prefsError } = await supabase.from("group_preferences").upsert({
    group_id: groupId,
    ...parsed.data.preferences,
  });

  if (prefsError) return { error: prefsError.message };

  revalidatePath(`/app/groups/${groupId}`);
  revalidatePath("/app/groups");
  return { success: true };
}

export async function deleteGroup(groupId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("travel_groups")
    .delete()
    .eq("id", groupId);

  if (error) return { error: error.message };

  revalidatePath("/app/groups");
  redirect("/app/groups");
}

export async function setDefaultGroup(groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("user_profiles")
    .update({ default_group_id: groupId })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/app");
  revalidatePath("/app/profile");
  revalidatePath(`/app/groups/${groupId}`);
  return { success: true };
}

export async function updateProfile(input: ProfileUpdate) {
  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Validation failed", issues: parsed.error.issues };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("user_profiles")
    .update({
      display_name: parsed.data.display_name,
      default_group_id: parsed.data.default_group_id ?? null,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/app");
  revalidatePath("/app/profile");
  return { success: true };
}

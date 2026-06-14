"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

const createTripSchema = z.object({
  name: z.string().min(1).max(100),
  destination_id: z.string().uuid(),
  travel_group_id: z.string().uuid().nullable().optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  selected_attraction_ids: z.array(z.string().uuid()),
  selected_hotel_offer_id: z.string().uuid().nullable().optional(),
  selected_vehicle_config: z.unknown().optional(),
  selected_transport_option: z.unknown().optional(),
});

export async function createTrip(input: z.infer<typeof createTripSchema>) {
  const parsed = createTripSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Validation", issues: parsed.error.issues };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("trips")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      destination_id: parsed.data.destination_id,
      travel_group_id: parsed.data.travel_group_id ?? null,
      date_from: parsed.data.date_from,
      date_to: parsed.data.date_to,
      selected_attraction_ids: parsed.data.selected_attraction_ids,
      selected_hotel_offer_id: parsed.data.selected_hotel_offer_id ?? null,
      selected_vehicle_config: (parsed.data.selected_vehicle_config ?? null) as Json,
      selected_transport_option: (parsed.data.selected_transport_option ?? null) as Json,
    })
    .select()
    .single();

  if (error || !data) return { error: error?.message ?? "Failed" };

  revalidatePath("/app/trips");
  return { success: true, trip_id: data.id };
}

export async function deleteTrip(tripId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("trips").delete().eq("id", tripId);
  if (error) return { error: error.message };
  revalidatePath("/app/trips");
  redirect("/app/trips");
}

export async function toggleTripShare(tripId: string, enabled: boolean) {
  const supabase = await createClient();
  const updates: { is_share_enabled: boolean; share_token?: string } = {
    is_share_enabled: enabled,
  };

  if (enabled) {
    updates.share_token = crypto.randomUUID();
  }

  const { data, error } = await supabase
    .from("trips")
    .update(updates)
    .eq("id", tripId)
    .select("share_token")
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/app/trips/${tripId}`);
  return { success: true, share_token: data?.share_token };
}

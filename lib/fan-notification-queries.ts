import { FAN_NOTIFICATION_SELECT, type FanNotification } from "./fan-notifications";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getLatestFanNotifications(supabase: SupabaseClient, userId: string) {
  const response = await supabase.from("fan_notifications").select(FAN_NOTIFICATION_SELECT)
    .eq("user_id", userId).order("created_at", { ascending: false }).limit(3);
  return { rows: (response.data || []) as unknown as FanNotification[], failed: Boolean(response.error) };
}

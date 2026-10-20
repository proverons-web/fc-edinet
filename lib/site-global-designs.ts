import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

type GlobalDesignKey = "header" | "footer" | "design_system";
type GlobalDesignConfigs = Partial<Record<GlobalDesignKey, unknown>>;

/**
 * Loads the public global design configs in one database round-trip.
 * React cache() deduplicates calls made by RootLayout, SiteHeader and
 * SiteFooter during the same server render.
 */
export const getGlobalDesignConfigs = cache(async (): Promise<GlobalDesignConfigs> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_global_designs")
    .select("component_key,config")
    .in("component_key", ["header", "footer", "design_system"]);

  const configs: GlobalDesignConfigs = {};
  for (const row of data ?? []) {
    const key = row.component_key as GlobalDesignKey;
    if (key === "header" || key === "footer" || key === "design_system") {
      configs[key] = row.config;
    }
  }
  return configs;
});

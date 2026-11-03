import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";

type GlobalDesignKey = "header" | "footer" | "design_system";
type GlobalDesignConfigs = Partial<Record<GlobalDesignKey, unknown>>;

/**
 * Loads shared public visual configuration in one database round-trip.
 * React cache deduplicates RootLayout/Header/Footer reads within a render;
 * Next's tagged data cache avoids the same fetch across nearby page requests.
 * The publish Server Action immediately invalidates the tag, so the editor
 * sees a newly published design without waiting for the 30-second TTL.
 */
const loadGlobalDesignConfigs = unstable_cache(async (): Promise<GlobalDesignConfigs> => {
  const supabase = createPublicClient();
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
}, ["fce-public-global-designs-v1"], { revalidate: 30, tags: ["fce-public-global-designs"] });

export const getGlobalDesignConfigs = cache(loadGlobalDesignConfigs);

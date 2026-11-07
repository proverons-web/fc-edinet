import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { SiteMenuItem } from "@/lib/site-builder";
import { canonicalPublicMenu, hasCanonicalMenuHierarchy, normalizeCanonicalMenuRoutes } from "@/lib/site-navigation";

/**
 * Public navigation is shared by every route and does not depend on cookies.
 * Keep session/profile reads out of this cache: those remain per-request in SiteHeader.
 * Admin menu mutations call updateTag so editors see changes immediately.
 */
const loadPublicSiteMenu = unstable_cache(async (): Promise<SiteMenuItem[]> => {
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("site_menu_items")
      .select("id,system_key,label_ru,label_ro,href,visible,display_order,parent_id,custom_page_id")
      .eq("visible", true)
      .order("display_order")
      .order("id");

    if (error) return canonicalPublicMenu;
    const menu = normalizeCanonicalMenuRoutes((data ?? []) as SiteMenuItem[]);
    return hasCanonicalMenuHierarchy(menu) ? menu : canonicalPublicMenu;
  } catch {
    // Navigation must survive brief network or database outages.
    return canonicalPublicMenu;
  }
}, ["fce-public-site-menu-v1"], { revalidate: 60, tags: ["fce-public-site-menu"] });

// Avoid duplicate reads if the menu is requested more than once in one render.
export const getPublicSiteMenu = cache(loadPublicSiteMenu);

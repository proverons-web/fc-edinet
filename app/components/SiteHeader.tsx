import Link from "next/link";
import HeaderNavClient from "@/app/components/HeaderNavClient";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { staffRoles } from "@/lib/types";

export default async function SiteHeader() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  let profile: Profile | null = null;

  if (userId) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    profile = data as Profile | null;
  }

  const isAuthenticated = Boolean(userId);
  const isStaff = profile ? staffRoles.includes(profile.role) : false;

  return (
    <>
      <div className="topbar">
        <div className="container topbarInner">
          <span>Официальный сайт FC Edineț</span>
          <div className="topbarLinks">
            <a href="#">RU</a><span>/</span><a href="#">RO</a>
          </div>
        </div>
      </div>

      <header className="header">
        <div className="container nav">
          <Link className="brand" href="/">
            <span className="crest">FCE</span>
            <span className="brandText">
              <strong>FC EDINEȚ</strong>
              <small>MOLDOVA</small>
            </span>
          </Link>

          <HeaderNavClient
            isAuthenticated={isAuthenticated}
            isStaff={isStaff}
          />
        </div>
      </header>
    </>
  );
}

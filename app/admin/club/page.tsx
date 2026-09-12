import Link from "next/link";
import ConfirmSubmitButton from "@/app/components/ConfirmSubmitButton";
import ClubProfileForm from "@/app/components/ClubProfileForm";
import ClubLeadershipAdmin from "@/app/components/ClubLeadershipAdmin";
import ClubAchievementAdmin from "@/app/components/ClubAchievementAdmin";
import {
  deleteAchievement,
  deleteLeader,
  updateAchievement,
  updateLeader,
} from "@/app/admin/club/actions";
import { requireEditor } from "@/lib/editorial";
import type { ClubAchievement, ClubLeader, ClubProfile } from "@/lib/types";

export const metadata = { title: "Клуб — Админ" };
export const dynamic = "force-dynamic";

export default async function AdminClubPage() {
  const { supabase, profile } = await requireEditor();
  const [{ data: profileData }, { data: leadershipData }, { data: achievementsData }] = await Promise.all([
    supabase.from("club_profile").select("*").eq("id", 1).maybeSingle(),
    supabase.from("club_leadership").select("*").order("display_order").order("name"),
    supabase.from("club_achievements").select("*").order("display_order").order("year", { ascending: false }),
  ]);
  const clubProfile = profileData as ClubProfile | null;
  const leaders = (leadershipData ?? []) as ClubLeader[];
  const achievements = (achievementsData ?? []) as ClubAchievement[];

  return (
    <main className="adminPage">
      <section className="adminHero compactAdminHero">
        <div className="container adminHeroInner">
          <div><p className="eyebrow">FC EDINEȚ • КЛУБ</p><h1>Раздел клуба</h1><p>История, стадион, контакты, руководство, достижения и переводы RU/RO.</p></div>
          <div className="adminHeroActions"><Link href="/admin" className="adminBack">← Админка</Link><Link href="/club" className="rowAction muted">Открыть на сайте ↗</Link></div>
        </div>
      </section>

      <section className="section adminSurface"><div className="container">
        <ClubProfileForm profile={clubProfile} />
        <div className="clubAdminTwoColumns"><ClubLeadershipAdmin /><ClubAchievementAdmin /></div>

        <section className="clubAdminListSection">
          <div className="sectionHeading"><div><p className="eyebrow blue">РУКОВОДСТВО</p><h2>Текущий список</h2></div></div>
          {leaders.length > 0 ? <div className="clubAdminItems">
            {leaders.map((leader) => (
              <article className="clubAdminItem" key={leader.id}>
                <div className="clubAdminItemImage">{leader.photo_url ? <img src={leader.photo_url} alt="" /> : <span>FCE</span>}</div>
                <div className="clubAdminItemMain"><strong>{leader.name}</strong><span>{leader.role}</span>{leader.bio && <p>{leader.bio}</p>}{(leader.role_ro || leader.bio_ro) && <small>RO: {leader.role_ro || "—"}{leader.bio_ro ? ` · ${leader.bio_ro}` : ""}</small>}</div>
                <form action={updateLeader} className="clubInlineControls">
                  <input type="hidden" name="leader_id" value={String(leader.id)} />
                  <input name="role" defaultValue={leader.role} placeholder="Должность" required />
                  <input name="role_ro" defaultValue={leader.role_ro ?? ""} placeholder="Funcție RO" />
                  <textarea name="bio" rows={2} defaultValue={leader.bio ?? ""} placeholder="Краткая информация" />
                  <textarea name="bio_ro" rows={2} defaultValue={leader.bio_ro ?? ""} placeholder="Informație RO" />
                  <input name="display_order" type="number" min={0} defaultValue={leader.display_order} />
                  <label><input type="checkbox" name="is_active" defaultChecked={leader.is_active} />На сайте</label>
                  <button type="submit">Сохранить</button>
                </form>
                {profile.role === "admin" && <form action={deleteLeader}><input type="hidden" name="leader_id" value={String(leader.id)} /><ConfirmSubmitButton className="clubDeleteButton" confirmMessage="Удалить эту запись?">Удалить</ConfirmSubmitButton></form>}
              </article>
            ))}
          </div> : <div className="adminEmpty">Руководство пока не добавлено.</div>}
        </section>

        <section className="clubAdminListSection">
          <div className="sectionHeading"><div><p className="eyebrow blue">ДОСТИЖЕНИЯ</p><h2>История результатов</h2></div></div>
          {achievements.length > 0 ? <div className="clubAdminItems">
            {achievements.map((item) => (
              <article className="clubAdminItem achievement" key={item.id}>
                <div className="clubAchievementYear">{item.year || "—"}</div>
                <div className="clubAdminItemMain"><strong>{item.title}</strong>{item.description && <p>{item.description}</p>}{(item.title_ro || item.description_ro) && <small>RO: {item.title_ro || "—"}{item.description_ro ? ` · ${item.description_ro}` : ""}</small>}</div>
                <form action={updateAchievement} className="clubInlineControls">
                  <input type="hidden" name="achievement_id" value={String(item.id)} />
                  <input name="title" defaultValue={item.title} placeholder="Название" required />
                  <input name="title_ro" defaultValue={item.title_ro ?? ""} placeholder="Titlu RO" />
                  <textarea name="description" rows={2} defaultValue={item.description ?? ""} placeholder="Описание" />
                  <textarea name="description_ro" rows={2} defaultValue={item.description_ro ?? ""} placeholder="Descriere RO" />
                  <input name="display_order" type="number" min={0} defaultValue={item.display_order} />
                  <label><input type="checkbox" name="is_active" defaultChecked={item.is_active} />На сайте</label>
                  <button type="submit">Сохранить</button>
                </form>
                {profile.role === "admin" && <form action={deleteAchievement}><input type="hidden" name="achievement_id" value={String(item.id)} /><ConfirmSubmitButton className="clubDeleteButton" confirmMessage="Удалить эту запись?">Удалить</ConfirmSubmitButton></form>}
              </article>
            ))}
          </div> : <div className="adminEmpty">Достижения пока не добавлены.</div>}
        </section>
      </div></section>
    </main>
  );
}

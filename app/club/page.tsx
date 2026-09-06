import { createClient } from "@/lib/supabase/server";
import type {
  ClubAchievement,
  ClubLeader,
  ClubProfile,
} from "@/lib/types";

export const metadata = { title: "Клуб" };
export const dynamic = "force-dynamic";

export default async function ClubPage() {
  const supabase = await createClient();

  const [
    { data: profileData },
    { data: leadershipData },
    { data: achievementsData },
  ] = await Promise.all([
    supabase
      .from("club_profile")
      .select("*")
      .eq("id", 1)
      .maybeSingle(),
    supabase
      .from("club_leadership")
      .select("*")
      .eq("is_active", true)
      .order("display_order")
      .order("name"),
    supabase
      .from("club_achievements")
      .select("*")
      .eq("is_active", true)
      .order("display_order")
      .order("year", { ascending: false }),
  ]);

  const profile = profileData as ClubProfile | null;
  const leaders = (leadershipData ?? []) as ClubLeader[];
  const achievements =
    (achievementsData ?? []) as ClubAchievement[];

  const clubName = profile?.club_name || "FC Edineț";

  return (
    <main>
      <section
        className={`clubHero ${profile?.hero_image_url ? "withImage" : ""}`}
        style={
          profile?.hero_image_url
            ? {
                backgroundImage: `linear-gradient(90deg,rgba(2,13,31,.94),rgba(2,13,31,.56)),url("${profile.hero_image_url}")`,
              }
            : undefined
        }
      >
        <div className="container clubHeroInner">
          <p className="eyebrow">{profile?.city || "EDINEȚ"} • MOLDOVA</p>
          <h1>{clubName}</h1>
          <p className="clubHeroMotto">
            {profile?.motto || "Вместе за Единец"}
          </p>

          <div className="clubHeroFacts">
            <Fact
              label="Основан"
              value={
                profile?.founded_year
                  ? String(profile.founded_year)
                  : "—"
              }
            />
            <Fact
              label="Город"
              value={profile?.city || "Edineț"}
            />
            <Fact
              label="Цвета"
              value={profile?.club_colors || "Синий / белый"}
            />
          </div>
        </div>
      </section>

      <section className="section clubAboutSection">
        <div className="container clubStoryGrid">
          <div>
            <p className="eyebrow blue">О КЛУБЕ</p>
            <h2>{clubName}</h2>
            <RichText
              value={
                profile?.about_text ||
                "Информация о клубе будет добавлена администрацией."
              }
            />
          </div>

          <aside className="clubContactCard">
            <p className="eyebrow blue">КОНТАКТЫ</p>
            <h3>Связаться с клубом</h3>

            <Contact label="Email" value={profile?.email} />
            <Contact label="Телефон" value={profile?.phone} />
            <Contact label="Адрес" value={profile?.address} />
          </aside>
        </div>
      </section>

      <section className="section clubHistorySection">
        <div className="container">
          <div className="clubNarrowText">
            <p className="eyebrow blue">ИСТОРИЯ</p>
            <h2>История клуба</h2>
            <RichText
              value={
                profile?.history_text ||
                "История клуба пока не заполнена."
              }
            />
          </div>
        </div>
      </section>

      <section className="section clubStadiumSection">
        <div className="container">
          <div className="sectionHeading">
            <div>
              <p className="eyebrow">ДОМАШНЯЯ АРЕНА</p>
              <h2>{profile?.stadium_name || "Stadionul Edineț"}</h2>
            </div>
          </div>

          <div className="clubStadiumGrid">
            <div className="clubStadiumImage">
              {profile?.stadium_image_url ? (
                <img
                  src={profile.stadium_image_url}
                  alt={profile?.stadium_name || "Стадион"}
                />
              ) : (
                <span>ФОТО СТАДИОНА</span>
              )}
            </div>

            <div className="clubStadiumInfo">
              <div className="clubStadiumFacts">
                <Fact
                  label="Вместимость"
                  value={
                    profile?.stadium_capacity
                      ? profile.stadium_capacity.toLocaleString("ru-RU")
                      : "—"
                  }
                />
                <Fact
                  label="Адрес"
                  value={profile?.stadium_address || "—"}
                />
              </div>

              <RichText
                value={
                  profile?.stadium_description ||
                  "Описание стадиона пока не добавлено."
                }
              />
            </div>
          </div>
        </div>
      </section>

      <section className="section clubLeadershipSection">
        <div className="container">
          <div className="sectionHeading">
            <div>
              <p className="eyebrow blue">ЛЮДИ КЛУБА</p>
              <h2>Руководство</h2>
            </div>
          </div>

          {leaders.length > 0 ? (
            <div className="clubLeadershipGrid">
              {leaders.map((leader) => (
                <article className="clubLeaderCard" key={leader.id}>
                  <div className="clubLeaderPhoto">
                    {leader.photo_url ? (
                      <img src={leader.photo_url} alt={leader.name} />
                    ) : (
                      <span>FCE</span>
                    )}
                  </div>
                  <div>
                    <span>{leader.role}</span>
                    <h3>{leader.name}</h3>
                    {leader.bio && <p>{leader.bio}</p>}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="adminEmpty">
              Информация о руководстве пока не добавлена.
            </div>
          )}
        </div>
      </section>

      <section className="section clubAchievementsSection">
        <div className="container">
          <div className="sectionHeading">
            <div>
              <p className="eyebrow">ИСТОРИЯ РЕЗУЛЬТАТОВ</p>
              <h2>Достижения</h2>
            </div>
          </div>

          {achievements.length > 0 ? (
            <div className="clubTimeline">
              {achievements.map((item) => (
                <article key={item.id}>
                  <div className="clubTimelineYear">
                    {item.year || "—"}
                  </div>
                  <div>
                    <h3>{item.title}</h3>
                    {item.description && <p>{item.description}</p>}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="clubDarkEmpty">
              Достижения будут добавлены администрацией клуба.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function Fact({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="clubFact">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Contact({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="clubContactRow">
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

function RichText({ value }: { value: string }) {
  const paragraphs = value
    .split(/\n\s*\n/g)
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    <div className="clubRichText">
      {paragraphs.map((paragraph, index) => (
        <p key={`${index}-${paragraph.slice(0, 20)}`}>
          {paragraph}
        </p>
      ))}
    </div>
  );
}

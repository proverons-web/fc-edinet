import Link from "next/link";
import { redirect } from "next/navigation";
import ProfileForm from "@/app/components/ProfileForm";
import { logout } from "@/app/account/actions";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { roleLabels, staffRoles } from "@/lib/types";

export const metadata = { title: "Личный кабинет" };

export default async function AccountPage() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) {
    throw new Error("Profile not found");
  }

  const profile = data as Profile;
  const isStaff = staffRoles.includes(profile.role);

  return (
    <main className="accountPage">
      <section className="accountHero">
        <div className="container">
          <p className="eyebrow">ЛИЧНЫЙ КАБИНЕТ</p>
          <h1>{profile.full_name || "Пользователь"}</h1>
          <div className="roleBadge">
            {roleLabels[profile.role]}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container accountGrid">
          <article className="accountPanel">
            <p className="eyebrow blue">ПРОФИЛЬ</p>
            <h2>Мои данные</h2>

            <div className="accountDetails">
              <div>
                <span>Email</span>
                <strong>{profile.email || "—"}</strong>
              </div>
              <div>
                <span>Роль</span>
                <strong>{roleLabels[profile.role]}</strong>
              </div>
            </div>

            <ProfileForm fullName={profile.full_name || ""} />
          </article>

          <aside className="accountSide">
            {isStaff ? (
              <div className="staffCallout">
                <p className="eyebrow">СОТРУДНИК КЛУБА</p>
                <h3>Доступ к управлению</h3>
                <p>
                  Твоя роль позволяет открыть служебную панель FC Edineț.
                </p>
                <Link className="primaryButton" href="/admin">
                  Открыть админку
                </Link>
              </div>
            ) : (
              <div className="fanCallout">
                <p className="eyebrow blue">БОЛЕЛЬЩИК</p>
                <h3>Аккаунт активен</h3>
                <p>
                  На следующих этапах здесь появятся комментарии,
                  избранные новости и другие возможности болельщика.
                </p>
              </div>
            )}

            <form action={logout}>
              <button className="logoutButton" type="submit">
                Выйти из аккаунта
              </button>
            </form>
          </aside>
        </div>
      </section>
    </main>
  );
}

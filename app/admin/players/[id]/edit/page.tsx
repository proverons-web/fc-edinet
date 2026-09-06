import Link from "next/link";
import { notFound } from "next/navigation";
import PlayerEditorForm from "@/app/components/PlayerEditorForm";
import { deletePlayer } from "@/app/admin/players/actions";
import { requireEditor } from "@/lib/editorial";
import type { Player } from "@/lib/types";

export const metadata = { title: "Редактирование игрока — Админ" };
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string | string[] }>;
};

export default async function EditPlayerPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const queryParams = await searchParams;
  const playerId = id.trim();

  if (!playerId) notFound();

  const { supabase, profile } = await requireEditor();

  const { data } = await supabase
    .from("players")
    .select("*")
    .eq("id", playerId)
    .maybeSingle();

  if (!data) notFound();

  const player = data as Player;
  const saved = Array.isArray(queryParams.saved)
    ? queryParams.saved[0]
    : queryParams.saved;

  return (
    <main className="adminPage">
      <section className="editorPageHeader">
        <div className="container editorPageHeaderInner">
          <div>
            <Link href="/admin/players" className="adminBack">
              ← Все игроки
            </Link>
            <p className="eyebrow blue">ПРОФИЛЬ ИГРОКА</p>
            <h1>
              {player.first_name} {player.last_name}
            </h1>
          </div>

          {player.is_active && (
            <Link
              href={`/team/${player.slug}`}
              className="adminPreviewLink"
            >
              Открыть на сайте ↗
            </Link>
          )}
        </div>
      </section>

      <section className="editorPageSurface">
        <div className="container">
          {saved === "1" && (
            <div className="saveNotice">Изменения сохранены.</div>
          )}

          <PlayerEditorForm player={player} />

          {profile.role === "admin" && (
            <form action={deletePlayer} className="dangerZone">
              <input
                type="hidden"
                name="player_id"
                value={String(player.id)}
              />

              <div>
                <strong>Окончательное удаление</strong>
                <p>
                  Обычно игрока лучше перевести в архив, сняв галочку
                  «В текущем составе». Удаление необратимо.
                </p>
              </div>

              <button type="submit">
                Удалить игрока
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";
import { requireEditor } from "@/lib/editorial";
import {
  blockCommentUser,
  moderateComment,
  reviewCommentReport,
  unblockCommentUser,
} from "./actions";

export const metadata = { title: "Комментарии и модерация — Админ" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type CommentRow = {
  id: number;
  news_id: number;
  user_id: string;
  body: string;
  status: "visible" | "hidden";
  author_display_name: string;
  author_avatar_url: string | null;
  created_at: string;
  news?: { id: number; title: string; slug: string } | null;
};

type ReportRow = {
  id: number;
  comment_id: number;
  reporter_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  comment?: CommentRow | null;
};

export default async function AdminCommentsPage({ searchParams }: { searchParams: SearchParams }) {
  const { supabase } = await requireEditor();
  const params = await searchParams;
  const notice = firstParam(params.notice);

  const [commentsResult, reportsResult, blocksResult] = await Promise.all([
    supabase.from("comments").select(`
      id,news_id,user_id,body,status,author_display_name,author_avatar_url,created_at,
      news:news!comments_news_id_fkey(id,title,slug)
    `).order("created_at", { ascending: false }).limit(80),
    supabase.from("comment_reports").select(`
      id,comment_id,reporter_id,reason,details,status,created_at,
      comment:comments!comment_reports_comment_id_fkey(
        id,news_id,user_id,body,status,author_display_name,author_avatar_url,created_at,
        news:news!comments_news_id_fkey(id,title,slug)
      )
    `).eq("status", "pending").order("created_at", { ascending: false }).limit(50),
    supabase.from("comment_blocks").select("user_id,reason,blocked_until,blocked_by,created_at,updated_at").order("updated_at", { ascending: false }).limit(100),
  ]);

  const comments = (commentsResult.data ?? []) as unknown as CommentRow[];
  const reports = (reportsResult.data ?? []) as unknown as ReportRow[];
  const allBlocks = blocksResult.data ?? [];
  const now = Date.now();
  const activeBlocks = allBlocks.filter((block: any) => !block.blocked_until || new Date(block.blocked_until).getTime() > now);
  const authorNameById = new Map<string, string>();
  comments.forEach((comment) => authorNameById.set(comment.user_id, comment.author_display_name));
  reports.forEach((report) => {
    if (report.comment) authorNameById.set(report.comment.user_id, report.comment.author_display_name);
  });

  const visibleCount = comments.filter((item) => item.status === "visible").length;
  const hiddenCount = comments.filter((item) => item.status === "hidden").length;

  return (
    <main className="adminPage">
      <section className="adminHero compactAdminHero">
        <div className="container adminHeroInner">
          <div>
            <p className="eyebrow">FC EDINEȚ • COMMUNITY</p>
            <h1>Комментарии и модерация</h1>
            <p>Жалобы, скрытие комментариев и ограничение доступа к обсуждениям.</p>
          </div>
          <Link href="/admin" className="adminBack">← Админка</Link>
        </div>
      </section>

      <section className="section adminSurface">
        <div className="container moderationStack">
          <div className="adminStats moderationStats">
            <Stat label="Видимые (последние 80)" value={visibleCount} />
            <Stat label="Скрытые (последние 80)" value={hiddenCount} />
            <Stat label="Новые жалобы" value={reports.length} />
            <Stat label="Активные блокировки" value={activeBlocks.length} />
          </div>

          {notice && <ModerationNotice notice={notice} />}

          <section className="moderationPanel">
            <div className="sectionHeading compactSectionHeading">
              <div><p className="eyebrow blue">ТРЕБУЕТ РЕШЕНИЯ</p><h2>Новые жалобы</h2></div>
              <span className="moderationCount">{reports.length}</span>
            </div>
            {reports.length === 0 ? <div className="moderationEmpty">Новых жалоб нет.</div> : (
              <div className="moderationReportList">
                {reports.map((report) => {
                  const comment = report.comment;
                  return <article className="moderationReportCard" key={report.id}>
                    <div className="moderationReportTop">
                      <span className="reportReason">{reportReasonLabel(report.reason)}</span>
                      <time>{formatDate(report.created_at)}</time>
                    </div>
                    {comment ? <>
                      <strong>{comment.author_display_name}</strong>
                      <p className="moderationCommentText">{comment.body}</p>
                      {comment.news && <Link href={`/news/${comment.news.slug}#comments`} target="_blank">{comment.news.title} ↗</Link>}
                    </> : <p>Комментарий уже удалён.</p>}
                    {report.details && <div className="reportDetails"><b>Пояснение:</b> {report.details}</div>}
                    <div className="moderationActions">
                      <form action={reviewCommentReport}>
                        <input type="hidden" name="report_id" value={report.id} />
                        <input type="hidden" name="report_action" value="dismiss" />
                        <button className="secondaryButton" type="submit">Отклонить жалобу</button>
                      </form>
                      {comment && <form action={reviewCommentReport}>
                        <input type="hidden" name="report_id" value={report.id} />
                        <input type="hidden" name="report_action" value="hide" />
                        <button className="dangerOutlineButton" type="submit">Скрыть комментарий</button>
                      </form>}
                    </div>
                  </article>;
                })}
              </div>
            )}
          </section>

          <section className="moderationPanel">
            <div className="sectionHeading compactSectionHeading">
              <div><p className="eyebrow blue">ЛЕНТА</p><h2>Последние комментарии</h2></div>
              <span className="moderationCount">{comments.length}</span>
            </div>
            {comments.length === 0 ? <div className="moderationEmpty">Комментариев пока нет.</div> : (
              <div className="moderationCommentList">
                {comments.map((comment) => <article className={`moderationCommentCard ${comment.status === "hidden" ? "isHidden" : ""}`} key={comment.id}>
                  <div className="moderationCommentMain">
                    <div className="moderationCommentMeta">
                      <strong>{comment.author_display_name}</strong>
                      <span>{comment.status === "visible" ? "Виден" : "Скрыт"}</span>
                      <time>{formatDate(comment.created_at)}</time>
                    </div>
                    <p>{comment.body}</p>
                    {comment.news && <Link href={`/news/${comment.news.slug}#comments`} target="_blank">{comment.news.title} ↗</Link>}
                  </div>
                  <div className="moderationCommentControls">
                    <form action={moderateComment}>
                      <input type="hidden" name="comment_id" value={comment.id} />
                      <input type="hidden" name="moderation_action" value={comment.status === "visible" ? "hide" : "restore"} />
                      <button className={comment.status === "visible" ? "dangerOutlineButton" : "secondaryButton"} type="submit">
                        {comment.status === "visible" ? "Скрыть" : "Восстановить"}
                      </button>
                    </form>
                    <details className="moderationBlockDetails">
                      <summary>Ограничить автора</summary>
                      <form action={blockCommentUser} className="moderationBlockForm">
                        <input type="hidden" name="user_id" value={comment.user_id} />
                        <label><span>Срок</span><select name="duration" defaultValue="7d"><option value="1d">1 день</option><option value="7d">7 дней</option><option value="30d">30 дней</option><option value="forever">Без срока</option></select></label>
                        <label><span>Причина</span><textarea name="reason" maxLength={500} rows={2} placeholder="Например: повторный спам" /></label>
                        <button className="secondaryButton" type="submit">Заблокировать комментарии</button>
                      </form>
                    </details>
                  </div>
                </article>)}
              </div>
            )}
          </section>

          <section className="moderationPanel">
            <div className="sectionHeading compactSectionHeading">
              <div><p className="eyebrow blue">ОГРАНИЧЕНИЯ</p><h2>Активные блокировки</h2></div>
              <span className="moderationCount">{activeBlocks.length}</span>
            </div>
            {activeBlocks.length === 0 ? <div className="moderationEmpty">Активных блокировок нет.</div> : (
              <div className="moderationBlockList">
                {activeBlocks.map((block: any) => <article className="moderationBlockCard" key={block.user_id}>
                  <div>
                    <strong>{authorNameById.get(block.user_id) || "Пользователь"}</strong>
                    <small>{block.user_id}</small>
                    <p>{block.reason || "Причина не указана"}</p>
                    <span>{block.blocked_until ? `До ${formatDate(block.blocked_until)}` : "Без срока"}</span>
                  </div>
                  <form action={unblockCommentUser}>
                    <input type="hidden" name="user_id" value={block.user_id} />
                    <button className="secondaryButton" type="submit">Снять блокировку</button>
                  </form>
                </article>)}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <article className="adminStat"><strong>{value}</strong><span>{label}</span></article>;
}

function ModerationNotice({ notice }: { notice: string }) {
  const messages: Record<string, string> = {
    hidden: "Комментарий скрыт.",
    restored: "Комментарий снова виден.",
    report_hidden: "Комментарий скрыт, связанные новые жалобы отмечены как решённые.",
    report_dismissed: "Жалоба отклонена.",
    blocked: "Пользователю ограничена возможность комментировать.",
    unblocked: "Блокировка снята.",
    invalid: "Некорректные данные действия.",
    not_found: "Запись не найдена.",
    error: "Не удалось выполнить действие. Проверь права и повтори.",
  };
  const message = messages[notice];
  if (!message) return null;
  const error = ["invalid", "not_found", "error"].includes(notice);
  return <div className={error ? "formError" : "formSuccess"}>{message}</div>;
}

function reportReasonLabel(reason: string) {
  return ({ spam: "Спам", offensive: "Оскорбительный контент", harassment: "Травля / преследование", other: "Другое" } as Record<string, string>)[reason] || reason;
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  } catch { return value; }
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

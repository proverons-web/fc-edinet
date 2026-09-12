import Link from "next/link";
import { commentsText } from "@/lib/comments-i18n";
import { dateLocale, type Locale } from "@/lib/i18n";
import type { CommentBlock, NewsComment } from "@/lib/types";
import {
  createComment,
  deleteOwnComment,
  reportComment,
} from "@/app/news/[slug]/comment-actions";

export default function NewsComments({
  articleId,
  slug,
  locale,
  comments,
  totalCount,
  currentUserId,
  activeBlock,
  notice,
}: {
  articleId: string | number;
  slug: string;
  locale: Locale;
  comments: NewsComment[];
  totalCount?: number;
  currentUserId: string | null;
  activeBlock: CommentBlock | null;
  notice?: string | null;
}) {
  const text = commentsText[locale];
  const blockIsActive = Boolean(
    activeBlock &&
      (!activeBlock.blocked_until || new Date(activeBlock.blocked_until).getTime() > Date.now())
  );

  return (
    <section className="section newsCommentsSection" id="comments">
      <div className="container commentsContainer">
        <div className="sectionHeading commentsHeading">
          <div>
            <p className="eyebrow blue">{text.eyebrow}</p>
            <h2>{text.title}</h2>
          </div>
          <span className="commentsCount">{text.count(totalCount ?? comments.length)}</span>
        </div>

        {notice && <CommentNotice locale={locale} notice={notice} />}

        {currentUserId ? (
          blockIsActive ? (
            <div className="commentBlockedNotice">
              <strong>{text.blocked}</strong>
              <span>
                {activeBlock?.blocked_until
                  ? text.blockedUntil(formatDateTime(activeBlock.blocked_until, locale))
                  : text.blockedForever}
              </span>
              {activeBlock?.reason && (
                <small>{text.blockedReason}: {activeBlock.reason}</small>
              )}
            </div>
          ) : (
            <form action={createComment} className="commentComposer">
              <input type="hidden" name="news_id" value={String(articleId)} />
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="locale" value={locale} />
              <textarea
                name="body"
                minLength={1}
                maxLength={2000}
                rows={4}
                required
                placeholder={text.placeholder}
              />
              <div className="commentComposerFooter">
                <small>1–2000</small>
                <button className="primaryButton" type="submit">{text.publish}</button>
              </div>
            </form>
          )
        ) : (
          <div className="commentsLoginPrompt">
            <p>{text.loginPrompt}</p>
            <Link className="primaryButton" href="/login">{text.login}</Link>
          </div>
        )}

        <div className="commentList">
          {comments.length === 0 ? (
            <div className="commentsEmpty">{text.empty}</div>
          ) : comments.map((comment) => {
            const own = Boolean(currentUserId && comment.user_id === currentUserId);
            return (
              <article className="commentCard" key={String(comment.id)}>
                <div className="commentAvatar">
                  {comment.author_avatar_url ? (
                    <img src={comment.author_avatar_url} alt="" />
                  ) : (
                    <span>{comment.author_display_name.slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
                <div className="commentBody">
                  <div className="commentMeta">
                    <strong>{comment.author_display_name}{own ? ` · ${text.own}` : ""}</strong>
                    <time>{formatDateTime(comment.created_at, locale)}</time>
                  </div>
                  <p>{comment.body}</p>
                  {currentUserId && (
                    <div className="commentActions">
                      {own ? (
                        <form action={deleteOwnComment}>
                          <input type="hidden" name="comment_id" value={String(comment.id)} />
                          <input type="hidden" name="slug" value={slug} />
                          <input type="hidden" name="locale" value={locale} />
                          <button type="submit" className="commentTextButton danger">{text.delete}</button>
                        </form>
                      ) : (
                        <details className="commentReportDetails">
                          <summary>{text.report}</summary>
                          <form action={reportComment} className="commentReportForm">
                            <input type="hidden" name="comment_id" value={String(comment.id)} />
                            <input type="hidden" name="slug" value={slug} />
                            <input type="hidden" name="locale" value={locale} />
                            <strong>{text.reportTitle}</strong>
                            <label>
                              <span>{text.reason}</span>
                              <select name="reason" defaultValue="spam">
                                <option value="spam">{text.reasons.spam}</option>
                                <option value="offensive">{text.reasons.offensive}</option>
                                <option value="harassment">{text.reasons.harassment}</option>
                                <option value="other">{text.reasons.other}</option>
                              </select>
                            </label>
                            <label>
                              <span>{text.details}</span>
                              <textarea name="details" maxLength={500} rows={3} placeholder={text.detailsPlaceholder} />
                            </label>
                            <small>{text.cancelHint}</small>
                            <button className="secondaryButton" type="submit">{text.sendReport}</button>
                          </form>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CommentNotice({ locale, notice }: { locale: Locale; notice: string }) {
  const text = commentsText[locale];
  const messages: Record<string, { text: string; error?: boolean }> = {
    added: { text: text.added },
    deleted: { text: text.deleted },
    reported: { text: text.reported },
    report_duplicate: { text: text.reportDuplicate, error: true },
    rate_limit: { text: text.rateLimit, error: true },
    invalid: { text: text.invalid, error: true },
    blocked: { text: text.blocked, error: true },
    error: { text: text.error, error: true },
  };
  const message = messages[notice];
  if (!message) return null;
  return <div className={message.error ? "formError commentsNotice" : "formSuccess commentsNotice"}>{message.text}</div>;
}

function formatDateTime(value: string, locale: Locale) {
  try {
    return new Intl.DateTimeFormat(dateLocale(locale), {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

import type { CSSProperties } from "react";
import { normalizeClubRichContent, plainTextToClubRichContent, sanitizeInlineHtml } from "@/lib/club-rich-content";

function Inline({ html, text }: { html?: string; text?: string }) {
  const safe = sanitizeInlineHtml(html || "");
  return safe ? <span dangerouslySetInnerHTML={{ __html: safe }} /> : <>{text}</>;
}

export default function ClubRichContent({ content, fallbackText, className = "" }: { content: unknown; fallbackText?: string | null; className?: string }) {
  const normalized = normalizeClubRichContent(content) ?? plainTextToClubRichContent(fallbackText);
  if (!normalized.blocks.length) return null;
  return <div className={`clubRichComposer ${className}`.trim()}>
    {normalized.blocks.map((block) => {
      if (block.type === "divider") return <hr key={block.id} className="clubRichDivider"/>;
      if (block.type === "image") {
        const style = { "--rich-image-width": `${block.width ?? 100}%`, "--rich-image-radius": `${block.radius ?? 18}px` } as CSSProperties;
        return <figure key={block.id} className={`clubRichImage clubRichImage-${block.wrap ?? "none"} align-${block.align ?? "left"}`} style={style}><img src={block.image_url} alt={block.alt || block.caption || ""}/>{block.caption && <figcaption>{block.caption}</figcaption>}</figure>;
      }
      const align = block.align ?? "left";
      if (block.type === "bulleted_list" || block.type === "numbered_list") {
        const List = block.type === "numbered_list" ? "ol" : "ul";
        return <List key={block.id} className={`clubRichList align-${align}`}>{(block.items ?? []).map((item, i) => <li key={`${block.id}-${i}`}><Inline html={block.html_items?.[i]} text={item}/></li>)}</List>;
      }
      if (block.type === "heading") return <h3 key={block.id} className={`clubRichHeading align-${align}`}><Inline html={block.html} text={block.text}/></h3>;
      if (block.type === "subheading") return <h4 key={block.id} className={`clubRichSubheading align-${align}`}><Inline html={block.html} text={block.text}/></h4>;
      if (block.type === "quote") return <blockquote key={block.id} className={`clubRichQuote align-${align}`}><Inline html={block.html} text={block.text}/></blockquote>;
      return <p key={block.id} className={`clubRichParagraph align-${align}`}><Inline html={block.html} text={block.text}/></p>;
    })}
    <div className="clubRichClear" aria-hidden="true"/>
  </div>;
}

import type { CSSProperties } from "react";
import type { NewsArticle } from "@/lib/types";

export function newsCoverStyle(article: Pick<NewsArticle, "cover_position_x" | "cover_position_y" | "cover_zoom">): CSSProperties {
  const x = clamp(article.cover_position_x ?? 50, 0, 100);
  const y = clamp(article.cover_position_y ?? 50, 0, 100);
  const zoom = clamp(article.cover_zoom ?? 100, 100, 200) / 100;
  return { objectPosition: `${x}% ${y}%`, transform: `scale(${zoom})`, transformOrigin: `${x}% ${y}%` };
}
function clamp(value:number,min:number,max:number){ return Math.max(min,Math.min(max,Number(value)||min)); }

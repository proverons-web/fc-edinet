import Link from "next/link";
import { getLocale } from "@/lib/locale";
import { publicText } from "@/lib/i18n";

export default async function SiteFooter() {
  const locale = await getLocale();
  const text = publicText[locale].footer;

  return (
    <footer className="footer">
      <div className="container footerGrid">
        <div>
          <Link className="brand" href="/">
            <span className="crest">FCE</span>
            <span className="brandText"><strong>FC EDINEȚ</strong><small>MOLDOVA</small></span>
          </Link>
          <p>{text.about}</p>
        </div>
        <div>
          <strong>{text.club}</strong>
          <Link href="/club">{text.history}</Link>
          <Link href="/club">{text.stadium}</Link>
          <Link href="/partners">{text.partners}</Link>
        </div>
        <div>
          <strong>{text.team}</strong>
          <Link href="/team">{text.players}</Link>
          <Link href="/matches">{text.matches}</Link>
        </div>
        <div>
          <strong>{text.media}</strong>
          <Link href="/news">{text.news}</Link>
          <Link href="/media">{text.photos}</Link>
          <Link href="/media">{text.videos}</Link>
        </div>
      </div>
      <div className="container footerBottom">
        <span>© 2026 FC Edineț</span>
        <span>{text.version}</span>
      </div>
    </footer>
  );
}

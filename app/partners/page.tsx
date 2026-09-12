import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Partner, PartnerLevel } from "@/lib/types";
import { partnerLevelLabels } from "@/lib/types";

export const metadata = {
  title: "Партнёры",
  description: "Партнёры и спонсоры футбольного клуба FC Edineț.",
};

export const dynamic = "force-dynamic";

const levelOrder: PartnerLevel[] = [
  "main",
  "official",
  "technical",
  "supporter",
];

export default async function PartnersPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("partners")
    .select("*")
    .eq("is_active", true)
    .order("display_order")
    .order("name");

  const partners = (data ?? []) as Partner[];

  return (
    <main className="partnersPage">
      <section className="pageHero partnersHero">
        <div className="container">
          <p className="eyebrow">FC EDINEȚ • ВМЕСТЕ СИЛЬНЕЕ</p>
          <h1>Партнёры клуба</h1>
          <p>
            Организации и компании, которые поддерживают FC Edineț и помогают
            клубу развиваться.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {partners.length === 0 ? (
            <div className="adminEmpty">
              Информация о партнёрах скоро появится.
            </div>
          ) : (
            <div className="partnersPublicGroups">
              {levelOrder.map((level) => {
                const items = partners.filter(
                  (partner) => partner.partner_level === level
                );

                if (items.length === 0) return null;

                return (
                  <section className="partnerPublicGroup" key={level}>
                    <div className="sectionHeading">
                      <div>
                        <p className="eyebrow blue">СОТРУДНИЧЕСТВО</p>
                        <h2>{partnerLevelLabels[level]}</h2>
                      </div>
                    </div>

                    <div className="partnerPublicGrid">
                      {items.map((partner) => (
                        <PartnerCard partner={partner} key={partner.id} />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          <div className="partnersContactBox">
            <div>
              <p className="eyebrow blue">СОТРУДНИЧЕСТВО</p>
              <h2>Стать партнёром FC Edineț</h2>
              <p>
                По вопросам сотрудничества используй официальные контакты клуба.
              </p>
            </div>
            <Link href="/club" className="primaryButton">
              Контакты клуба
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function PartnerCard({ partner }: { partner: Partner }) {
  const content = (
    <>
      <div className="partnerPublicLogo">
        <img src={partner.logo_url} alt={partner.name} />
      </div>
      <div className="partnerPublicText">
        <strong>{partner.name}</strong>
        {partner.description && <p>{partner.description}</p>}
        {partner.website_url && <span>Открыть сайт ↗</span>}
      </div>
    </>
  );

  if (partner.website_url) {
    return (
      <a
        className="partnerPublicCard"
        href={partner.website_url}
        target="_blank"
        rel="noopener noreferrer"
      >
        {content}
      </a>
    );
  }

  return <article className="partnerPublicCard">{content}</article>;
}

import type { TeamStaffMember } from "@/lib/types";

export default function TeamStaffPublic({ staff, locale }: { staff: TeamStaffMember[]; locale: "ru" | "ro" }) {
  return <section className="teamStaffSection teamStaffSectionStandalone">
    {(["coaching", "medical", "operations"] as const).map((category) => {
      const rows = staff.filter((member) => member.category === category);
      if (!rows.length) return null;
      const groupTitle = locale === "ro"
        ? (category === "coaching" ? "Staff tehnic" : category === "medical" ? "Staff medical" : "Organizare")
        : (category === "coaching" ? "Тренерский штаб" : category === "medical" ? "Медицинский штаб" : "Организация");
      return <div className="teamStaffGroup" key={category}>
        <div className="teamStaffGroupTitle"><span>{groupTitle}</span><b>{String(rows.length).padStart(2, "0")}</b></div>
        <div className="teamStaffGrid">{rows.map((member) => <article className={`teamStaffCard${member.is_placeholder ? " isPlaceholder" : ""}`} key={member.id}>
          <div className="teamStaffPortrait">
            {member.photo_url
              ? <img src={member.photo_url} alt={`${member.first_name} ${member.last_name}`} loading="lazy" decoding="async" />
              : <img src="/brand/fc-edinet-crest.png" alt="FC Edineț" className="isCrest" />}
            {member.is_placeholder && <span>{locale === "ro" ? "MODEL" : "ЗАГЛУШКА"}</span>}
          </div>
          <div className="teamStaffCopy">
            <small>{locale === "ro" ? (member.role_title_ro || member.role_title) : member.role_title}</small>
            <h3>{member.first_name} {member.last_name}</h3>
            {(member.joined_year || member.left_year) && <b>{member.joined_year || "—"}{member.left_year ? ` — ${member.left_year}` : (locale === "ro" ? " — prezent" : " — н.в.")}</b>}
            {(locale === "ro" ? member.bio_ro : member.bio) && <p>{locale === "ro" ? (member.bio_ro || member.bio) : member.bio}</p>}
          </div>
        </article>)}</div>
      </div>;
    })}
  </section>;
}

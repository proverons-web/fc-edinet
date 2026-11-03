import Link from "next/link";
import { adminListHref, parseAdminQuery } from "@/lib/admin-list-search";

/** GET form: searches remain linkable, browser-back friendly and work without client JS. */
export default function AdminListSearch({
  path, query, status, sort, focus, label, placeholder, count,
}: {
  path: string;
  query: string;
  status?: string;
  sort?: string;
  focus?: string;
  label: string;
  placeholder: string;
  count: number;
}) {
  const normalized = parseAdminQuery(query);
  return (
    <form className="adminListSearch" method="get" action={path} role="search" aria-label={label}>
      {status && status !== "all" && <input type="hidden" name="status" value={status} />}
      {sort && sort !== "number" && <input type="hidden" name="sort" value={sort} />}
      {focus && focus !== "all" && <input type="hidden" name="focus" value={focus} />}
      <label className="adminListSearchLabel" htmlFor={`admin-search-${path.split("/").pop()}`}>{label}</label>
      <div className="adminListSearchControls">
        <input
          id={`admin-search-${path.split("/").pop()}`}
          type="search" name="q" maxLength={80}
          defaultValue={normalized} placeholder={placeholder} autoComplete="off"
        />
        <button type="submit">Найти</button>
        {normalized && <Link href={adminListHref(path, { status, sort, focus })} className="adminListSearchReset">Сбросить</Link>}
      </div>
      <output aria-live="polite">{normalized ? `Найдено: ${count}` : `Записей: ${count}`}</output>
    </form>
  );
}

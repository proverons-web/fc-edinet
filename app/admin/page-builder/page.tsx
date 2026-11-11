import { redirect } from "next/navigation";
import { requireEditor } from "@/lib/editorial";

export const metadata = { title: "Редактор сайта — FC Edineț" };

// One entry point for pages. Existing nested page-builder editors remain
// available for embedded editing and are not removed.
export default async function PageBuilderIndex() {
  await requireEditor();
  redirect("/admin/site-builder");
}

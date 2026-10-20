import { redirect } from "next/navigation";

export const metadata = { title: "Статистика матча — FC Edineț Admin" };
export const dynamic = "force-dynamic";

export default async function LegacyMatchStatisticsPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  redirect(`/admin/match-center/${encodeURIComponent(matchId)}#squad-stats`);
}

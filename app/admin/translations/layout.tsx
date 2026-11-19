import { requireAdmin } from "@/lib/editorial";

export default async function AdminOnlyLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <>{children}</>;
}

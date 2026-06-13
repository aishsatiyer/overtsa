import { ProspectDetailShell } from "../../components/linkedin-crm/prospects-crm-shell";

export default async function ProspectDetailPage({
  params
}: {
  params: Promise<{ prospectId: string }>;
}) {
  const { prospectId } = await params;

  return (
    <main className="space-y-6">
      <ProspectDetailShell prospectId={prospectId} />
    </main>
  );
}

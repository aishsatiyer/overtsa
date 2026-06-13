import { OrgCrmShell } from "../components/org-crm/org-crm-shell";

export default function OrgCrmPage() {
  return (
    <main className="space-y-6">
      <section className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
            Org CRM
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Organizations</h2>
        </div>
      </section>

      <OrgCrmShell />
    </main>
  );
}
